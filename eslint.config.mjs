import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "src/app/access/page.tsx",
      "src/app/employees/page.tsx",
      "src/app/employers/page.tsx",
      "src/components/manual-deposit-data.tsx",
    ],
    // Cell renderers return ReactNode arrays which are immediately wrapped in keyed <td> elements.
    rules: { "react/jsx-key": "off" },
  },
];

export default config;
