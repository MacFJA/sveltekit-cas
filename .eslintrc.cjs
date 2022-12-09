module.exports = {
	root: true,
	env: {
		browser: true,
		es2017: true
	},
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: "module"
	},
	plugins: ["@typescript-eslint"]
}
