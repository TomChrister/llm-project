import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    // The aliases live in tsconfig.json only.
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        // Undo every test's stubs and spies, so no file needs its own afterEach.
        unstubGlobals: true,
        unstubEnvs: true,
        restoreMocks: true,
        // .claude/worktrees holds Claude Code's spare copies of the repo.
        exclude: [...configDefaults.exclude, ".claude/**", ".next/**"],
    },
});
