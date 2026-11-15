import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    // .claude/worktrees holds Claude Code's spare copies of the repo.
    globalIgnores([".next/**", "next-env.d.ts", "node_modules/**", ".claude/**"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            // `configs["recommended-latest"]` is still the legacy eslintrc shape
            // in v7; the flat one lives under `configs.flat`.
            reactHooks.configs.flat["recommended-latest"],
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
        },
    },
    // The scraping stack, the route handlers and the config files run in
    // Node, not the browser.
    {
        files: ["server/**/*.ts", "src/app/api/**/*.ts", "*.config.ts"],
        languageOptions: { globals: globals.node },
    },
])
