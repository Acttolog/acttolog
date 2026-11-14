import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const lintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'tools/**',
      // generated artifacts (harvested mirror + ephemeral static workspace) — never lint copies
      '.pages-site/**',
      '.static-build/**',
      '_next/**',
      // Third-party bundles vendored into public/ (Leaflet). 362 of the repo's
      // 472 reported problems were unused-expression noise from minified vendor
      // code we do not own and cannot fix.
      '**/vendor/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Brand art is emitted as inline SVG data URIs and procedural canvases;
      // next/image cannot optimize data: URIs, so plain <img> is intentional.
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // This codebase hydrates persisted user preferences (theme, locale,
      // currency, consent, session, saved items) from localStorage after mount
      // to avoid SSR/client markup mismatches. That requires a synchronous
      // setState in a mount effect, which the React Compiler lint rule flags.
      // Kept as a warning so genuine cascading-render mistakes stay visible.
      'react-hooks/set-state-in-effect': 'warn',
      // Admin settings renders a local Row helper inside the page body; the
      // static-components rule wants it hoisted. Tracked for the CMS pass.
      'react-hooks/static-components': 'warn',
      // React Three Fiber mutates refs inside useFrame and reads them in JSX by
      // design; the React Compiler heuristics below conflict with that pattern.
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // public/ is served verbatim: the arcade and CUBE/26 canvases are vanilla
    // scripts with no React runtime, so hook rules only generate false
    // positives here (e.g. `const useEase = easeOutCubic` read as a hook call).
    files: ['public/**/*.js'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];

export default lintConfig;
