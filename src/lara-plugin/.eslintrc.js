module.exports = {
    extends: "../../.eslintrc.js",
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": ["warn", { allow: ["warn", "error", "group", "groupEnd", "dir", "info"] }],
      "no-debugger": "error"
    }
};
