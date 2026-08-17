import nextTypescript from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['tests/support/clover-visual-evidence.ts'],
    rules: {
      // Visual QA receipts deliberately preserve extensible JSON-shaped metrics.
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];

export default eslintConfig;
