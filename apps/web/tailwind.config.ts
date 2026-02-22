import type { Config } from 'tailwindcss';
import baseConfig from '@marketplace/ui/tailwind.config';

const config: Config = {
  presets: [baseConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
};

export default config;
