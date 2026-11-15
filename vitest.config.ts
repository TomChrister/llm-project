import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "./src"),
            "@shared": path.resolve(rootDir, "./shared"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        // .claude/worktrees holds Claude Code's spare copies of the repo.
        exclude: [...configDefaults.exclude, ".claude/**", ".next/**"],
    },
});
