/* eslint-env node */
// build/production configuration extends default/development configuration
module.exports = {
    extends: [
      "../.eslintrc.js",
      "plugin:cypress/recommended",
      "plugin:chai-friendly/recommended"
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "cypress/no-unnecessary-waiting": "off"
    },
    overrides: [
      {
        files: ["**/index.js"],
        rules: {
          "@typescript-eslint/no-require-imports": "off",
          "@typescript-eslint/no-var-requires": "off"
        }
      }
    ]
};
