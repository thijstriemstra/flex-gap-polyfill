import postcss from "postcss";
var valueParser = require('postcss-value-parser');

const pf = "--FI_";
const CS = " > *";
const SS = " > ::slotted(*)";

function hasFlex(decl) {
	const container = decl.parent;

	const item = postcss.rule({selector: container.selector + CS});
	// const roots = postcss.rule({selector: ":root"});
	if (decl.value === "flex" || decl.value === "inline-flex") {
		container.append(
			`${pf}has-polyfil_gap-container: initial;`
		);
		item.append(
			`${pf}has-polyfil_gap-item: initial;`
		);
	}
	item.walk(i => { i.raws.before = "\n\t" });
}


function addGap(decl, opts) {

	const container = decl.parent;

	const item = postcss.rule({selector: container.selector + CS});
	const reset = postcss.rule({selector: container.selector + CS + CS});
	const slotted = postcss.rule({selector: container.selector + SS});
	container.before(item);
	item.before(reset);


	var values = postcss.list.space(decl.value);

	const properties = ["_row", "_column"];

	if (values.length === 1) {
		values.push(values[0]);
	}

	properties.forEach((axis, index) => {
		var value = values[index];

		if (value === "0") {
			value = "0px";
		}
		var number = valueParser.unit(value).number;
		var unit = valueParser.unit(value).unit;

		// Percentages
		if (unit === "%") {
			// formula: (parent - self) / (100 - self) * 100
			container.append(
				`${pf}gap_percentage-decimal${axis}: ${number / 100};
				${pf}gap_container${axis}: var(${pf}has-polyfil_gap-container, var(${pf}gap_percentage-to-pixels${axis}, calc( ((var(${pf}gap_parent${axis}, 0%) - ${value}) * var(${pf}width_percentages-decimal, 1)) / (100 - ${number}) * 100))) !important;`
			);

		}

		// Pixels, Ems
		else {
			// formula: (parent - self)
			container.append(
				`${pf}gap_container${axis}: var(${pf}has-polyfil_gap-container, calc(var(${pf}gap_parent${axis}, 0px) - ${value})) !important;`
			);

		}

		reset.append(
			`${pf}gap_item${axis}: initial;`
		);

		item.append(
			`${pf}gap_container${axis}: initial;
			${pf}gap_parent${axis}: var(${pf}has-polyfil_gap-item, ${value}) !important;
			${pf}gap_item${axis}: var(${pf}has-polyfil_gap-item, ${value}) !important;
			${pf}gap${axis}: var(${pf}gap_item${axis});`
		);

		if (axis === "_row") {
			item.append(
				`margin-top: var(${pf}gap${axis});`
			);
		}
		if (axis === "_column") {
			item.append(
				`margin-left: var(${pf}gap${axis});`
			);
		}

		container.append(
			`${pf}gap_parent${axis}: initial;
			${pf}gap_item${axis}: initial;
			${pf}gap${axis}: var(${pf}gap_container${axis}) !important;
			padding-top: 0.02px;`
		);

		if (axis === "_row") {
			container.append(
				`margin-top: var(${pf}gap${axis});`
			);
		}
		if (axis === "_column") {
			container.append(
				`margin-left: var(${pf}gap${axis});`
			);
		}

		// If web components
		if (opts === true) {
			container.before(slotted);

			slotted.append(
				`${pf}gap_parent${axis}: ${value};
				${pf}gap_item${axis}: ${value};
				${pf}gap${axis}: var(${pf}gap_item${axis});`
			);

			if (axis === "_row") {
				slotted.append(
					`margin-top: var(${pf}gap${axis}) !important;`
				);
			}
			if (axis === "_column") {
				slotted.append(
					`margin-left: var(${pf}gap${axis}) !important;`
				);
			}
		}
	});



	container.walk(i => { i.raws.before = "\n\t" });
	item.walk(i => { i.raws.before = "\n\t" });
	reset.walk(i => { i.raws.before = "\n\t" });
	slotted.walk(i => { i.raws.before = "\n\t" });

	decl.remove();
}

function addWidth(decl) {

	var value = valueParser.unit(decl.value);
	let prop = decl.prop;

	if (decl.value === 0) {
		decl.value = "0px";
	}

	const container = decl.parent;
	const reset = postcss.rule({selector: container.selector + CS});

	container.before(reset);

	let axis = "";

	if (prop === "width") {
		axis = "_column";
	}
	else {
		axis = "_row"
	}

	// Percentages
	if (value.unit === "%") {
		container.append(
			`${pf}${prop}_percentages: ${decl.value} !important;
			${pf}${prop}_percentages-decimal: ${value.number / 100} !important;
			${pf}${prop}: calc(${decl.value} - var(${pf}gap_item${axis}, var(${pf}gap_container${axis}, 0%))) !important;`
		);

		reset.append(
			`${pf}${prop}_percentages: initial;
			${pf}${prop}_percentages-decimal: initial;`
		);
	}

	// Pixels, Ems
	else {
		container.append(
			`${pf}gap_percentage-to-pixels_column: calc(${"-" + decl.value} * var(${pf}gap_percentage-decimal${axis})) !important;
			${pf}gap_percentage-to-pixels_row: calc(${"-" + decl.value} * var(${pf}gap_percentage-decimal${axis})) !important;
			${pf}${prop}_pixels: ${decl.value} !important;
			${pf}${prop}: calc(${decl.value} - var(${pf}gap_item${axis}, var(${pf}gap_container${axis}, 0px))) !important;`
		);

		reset.append(
			`${pf}gap_percentage-to-pixels_column: initial;
			${pf}gap_percentage-to-pixels_row: initial;
			${pf}${prop}_pixels: initial;`
		);
	}

	decl.before(
		`${prop}: var(${pf}${prop});`
	);

	decl.remove();

	container.walk(i => {i.raws.before = "\n\t";});
	reset.walk(i => {i.raws.before = "\n\t";});


}

export default postcss.plugin("postcss-gap", (opts) => {
	var webComponents = false;
	if (opts && opts.webComponents) {
		webComponents = true;
	}

	return function (css) {
		const rootRule = postcss.rule({selector: ":root"});

		css.prepend(rootRule);

		rootRule.append(
			`${pf}has-polyfil_gap-container: 0px;
			${pf}has-polyfil_gap-item: 0px;`
		);

		rootRule.walk(i => { i.raws.before = "\n\t" });

		css.walkDecls(function (decl) {
			if (decl.prop === "width" || decl.prop === "height") {
				addWidth(decl);
			}
			if (decl.prop === "display") {
				hasFlex(decl);
			}
			if (decl.prop === "gap") {
				decl.parent.walkDecls(function (declTwo) {

					if (declTwo.prop === "display") {
						if (declTwo.value !== "grid") {
							addGap(decl, webComponents);
						}
					}
				});

			}
		});
	};
});
