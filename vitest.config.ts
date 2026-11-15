import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    // The aliases live in tsconfig.json only.
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        // .claude/worktrees holds Claude Code's spare copies of the repo.
        exclude: [...configDefaults.exclude, ".claude/**", ".next/**"],
    },
});
