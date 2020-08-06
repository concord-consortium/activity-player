// build/production configuration extends default/development configuration
module.exports = {
    extends: "./.eslintrc.js",
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error"
    },
    overrides: [
      {
        files: ["./src/lara-plugin/**/*.ts"],
        rules: {
          "@typescript-eslint/ban-ts-comment": "off",
          "@typescript-eslint/no-non-null-assertion": "off",
          "no-console": ["warn", { allow: ["warn", "error", "group", "groupEnd", "dir", "info"] }],
        }
      }
    ]
};
