// build/production configuration extends default/development configuration
module.exports = {
    extends: "./.eslintrc.js",
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "groupEnd", "dir", "info"] }],
      "no-debugger": "error"
    }
};
