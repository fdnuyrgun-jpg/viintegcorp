import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Глобальное игнорирование папок
  { ignores: ["dist", "node_modules", ".next"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic, // Добавляет приятные правила оформления
      react.configs.recommended,
      react.configs["jsx-runtime"],
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh для Fast Refresh
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // TypeScript & Clean Code
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_" 
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      
      // React специфичные
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off", // Часто мешает при использовании forwardRef в shadcn
      
      // Общие улучшения
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);