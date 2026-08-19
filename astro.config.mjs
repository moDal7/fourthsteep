import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://modal7.github.io',
  base: '/fourthsteep',
  output: 'static',
  integrations: [mdx()],
});
