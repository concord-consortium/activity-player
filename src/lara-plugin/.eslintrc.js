module.exports = {
    extends: "../../.eslintrc.js",
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "no-console": ["warn", { allow: ["warn", "error", "group", "groupEnd", "dir", "info"] }],
      "no-duplicate-imports": "off",
      "no-debugger": "error",
      "prefer-object-spread": "off"
    }
};
