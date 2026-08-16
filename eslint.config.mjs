import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      ".next/**",
      ".firebase/**",
      "node_modules/**",
      "out/**",
      "public/**",
      "*.js",
      "*.py",
      "*.ps1",
      "*.json",
      "*.txt",
      "daily_reports/**",
      "scratch/**",
      "scripts/**",
    ],
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
];
