import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: 'WME Segment Toolkit',
                namespace: 'http://tampermonkey.net/',
                match: ['https://www.waze.com/*/editor*', 'https://beta.waze.com/*/editor*'],
                exclude: ['https://www.waze.com/user/editor*'],
                grant: 'none',
                'run-at': 'document-end',
                description: 'Toolkit for WME segment editing: speed-limit validator, select whole street and more.',
                author: 'Murilo D\'agustin',
                version: '1.0.0',
            },
            build: {
                // Generates a single .user.js with everything bundled & minified by Vite.
                fileName: 'wme-segment-toolkit.user.js',
            },
        }),
    ],
    build: {
        minify: 'terser',
        target: 'es2020',
        sourcemap: false,
        cssMinify: true,
        terserOptions: {
            compress: {
                // Strip dev-only logs from the production bundle.
                drop_debugger: true,
                pure_funcs: ['console.debug', 'console.info'],
                passes: 2,
            },
            format: {
                comments: false,
            },
        },
    },
});
