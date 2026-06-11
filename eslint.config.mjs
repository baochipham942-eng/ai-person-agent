import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["scripts/**/*.{ts,tsx,js,mjs,cjs}", "scripts/*.{ts,tsx,js,mjs,cjs}"],
    rules: {
      // Data repair/enrichment scripts process ad-hoc raw payloads and are not part of the app runtime.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["lib/datasources/**/*.{ts,tsx}", "lib/skills/**/*.{ts,tsx}"],
    rules: {
      // External API adapters receive provider-specific JSON before normalizing it.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
