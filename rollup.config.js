import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import { terser } from "rollup-plugin-terser"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import pkg from "./package.json"

export default {
	input: "src/index.ts",
	output: [
		{ file: pkg.module, format: "es" },
		{ file: pkg.main, format: "cjs", name: "SK_CAS" }
	],
	plugins: [
		typescript(),
		commonjs(),
		json(),
		resolve(),
		terser({
			format: {
				comments: false
			}
		})
	],
	external: ["env-var", "universal-cookie", "njwt", "logical-cas-client"]
}
