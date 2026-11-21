import { defineConfig } from "typed-openapi";

/**
 * Paths are resolved from the command working directory (frontend/),
 * not from this file's directory.
 */
export default defineConfig({
  input: "../contracts/openapi.yaml",
  output: "./src/api/generated/client.ts",
  runtime: "zod",
  defaultFetcher: true,
});
