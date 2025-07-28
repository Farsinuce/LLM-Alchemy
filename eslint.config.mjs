import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/components",
              from: "./src/lib/supabase/server.ts",
              message: "Server-only Supabase functions cannot be imported in client components. Use './src/lib/supabase' instead."
            },
            {
              target: "./src/app",
              from: "./src/lib/supabase/server.ts", 
              message: "Server-only Supabase functions cannot be imported in client components. Use './src/lib/supabase' instead."
            }
          ]
        }
      ],
      "import/no-cycle": "error"
    }
  }
];

export default eslintConfig;
