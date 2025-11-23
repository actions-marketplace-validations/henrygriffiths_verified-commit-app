import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node }, rules: { "no-async-promise-executor": "off", "no-unused-vars": "off", "semi": ["error", "always"] } },
  globalIgnores(["dist/*"]),
]);
