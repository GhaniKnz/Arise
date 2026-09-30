import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";


export default defineConfig({
  // fileURLToPath: a raw URL pathname breaks on Windows and on paths with spaces.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
