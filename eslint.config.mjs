import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The backend checkout (any letter case) is a separate repository.
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "[Aa][Ll][Pp][Hh][Aa][Bb][Aa][Cc][Kk][Ee][Nn][Dd]/**"]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
