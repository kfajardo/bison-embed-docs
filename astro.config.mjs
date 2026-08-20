// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
    integrations: [starlight({
        title: 'Bison Embed',
        logo: {
            src: './src/assets/bison-logo-white.png',
            alt: 'Bison',
            replacesTitle: true,
        },
        description:
            'Embed Bison JIB Pay in your application with a server-side launch request and an iframe.',
        customCss: ['./src/styles/theme.css'],
        components: {
            Head: './src/components/Head.astro',
        },
        sidebar: [
            { label: 'Guide', slug: 'index' },
            { label: 'Troubleshooting', slug: 'troubleshooting' },
        ],
		}), mdx()],
});
