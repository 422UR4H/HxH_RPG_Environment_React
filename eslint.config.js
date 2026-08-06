import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Worktrees de fases anteriores e diretórios locais vivem dentro do repo. Sem
  // ignorá-los, o ESLint linta o codebase inteiro 3–4 vezes e o mesmo erro aparece
  // multiplicado — o que tornava `npm run lint` inútil como sinal de regressão.
  { ignores: ["dist", ".worktrees", ".claude", ".local"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // O `_` como prefixo já é a convenção do projeto para descarte intencional
      // (destructuring que remove campos, parâmetro de callback não usado).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  }
);
