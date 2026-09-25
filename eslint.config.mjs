import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const lintConfig = [
  { ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'tools/**'] },
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
];

export default lintConfig;
