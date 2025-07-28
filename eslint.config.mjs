import { FlatCompat } from '@eslint/eslintrc';
import pluginImport from 'eslint-plugin-import';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  // Next.js + TypeScript presets
  ...compat.extends('next', 'next/core-web-vitals', 'next/typescript'),
  // Plugin registrations
  { plugins: { import: pluginImport } },

  // Project‑specific rules
  {
    rules: {
      /* ---- security gates ---- */
      'import/no-restricted-paths': ['error', {
        zones: [
          { target: './src/components/**/*', from: '@/lib/supabase/server' },
          { target: './src/app/**/*',        from: '@/lib/supabase/server', except: ['./src/app/api/**/*'] }
        ]
      }],
      /* guard the two deprecated shim files */
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@/lib/supabase-client-deprecated',  message: 'Use @/lib/supabase/browser instead' },
          { name: '@/lib/supabase-server-deprecated',  message: 'Use @/lib/supabase/server instead' }
        ]
      }],
      /* extra safety */
      'import/no-cycle': 'error'
    }
  }
];
