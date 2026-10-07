// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
            'Embed Bison JIB Pay in your application: start a session from your server, load an iframe, and hand it a one-time launch token.',
        customCss: ['./src/styles/theme.css', './src/styles/layout.css'],
        components: {
            Head: './src/components/Head.astro',
            Header: './src/components/Header.astro',
            Sidebar: './src/components/Sidebar.astro',
            PageSidebar: './src/components/PageSidebar.astro',
            PageTitle: './src/components/PageTitle.astro',
            MarkdownContent: './src/components/MarkdownContent.astro',
        },
        sidebar: [
            { label: 'Guide', slug: 'index' },
            { label: 'Authentication', slug: 'authentication' },
            { label: 'Screens', slug: 'screens' },
            { label: 'Launch API', slug: 'launch-api' },
            { label: 'Messages', slug: 'messages' },
            { label: 'Troubleshooting', slug: 'troubleshooting' },
        ],
		})],
});
