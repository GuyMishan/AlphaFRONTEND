import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
  {
    files: [
      "src/app/access/page.tsx",
      "src/app/employees/page.tsx",
      "src/app/employers/page.tsx",
      "src/components/manual-deposit-data.tsx",
    ],
    rules: { "react/jsx-key": "off" },
  },
]);
