import { defineConfig } from "vitest/config";

// Single flat test config for the whole monorepo instead of a per-package
// vitest workspace — simpler to wire up, and the handful of DOM-touching
// web tests opt into jsdom per-file via a `// @vitest-environment jsdom`
// pragma comment rather than needing their own project config.
export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
    watch: false,
  },
});
