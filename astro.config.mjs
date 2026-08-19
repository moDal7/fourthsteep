import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.topeki.com',
  base: '/fourthsteep',
  output: 'static',
  integrations: [mdx()],
});
