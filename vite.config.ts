import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: 'WME Validador de Velocidades (BR)',
                namespace: 'http://tampermonkey.net/',
                match: ['https://www.waze.com/*/editor*', 'https://beta.waze.com/*/editor*'],
                exclude: ['https://www.waze.com/user/editor*'],
                grant: 'none',
                'run-at': 'document-end',
                description: 'Destaca limites de velocidade fora do padrão. Atualizado para o novo WME SDK.',
                author: 'Você',
                version: '0.4',
            },
            build: {
                // Generates a single .user.js with everything bundled & minified by Vite.
                fileName: 'velocity-diff.user.js',
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
