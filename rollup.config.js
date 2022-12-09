import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"
import pkg from "./package.json" assert { type: "json" }

export default {
	input: "src/index.ts",
	output: [
		{ file: pkg.module, format: "es" },
		{ file: pkg.main, format: "cjs", name: "SK_CAS" }
	],
	plugins: [
		typescript(),
		resolve(),
		terser({
			format: {
				comments: false
			}
		})
	],
	external: Object.keys(pkg.dependencies)
}
