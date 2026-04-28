import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
) as { version: string };

const REPO = 'MuriloDagustin/wme-segment-toolkit';
const FILE_NAME = 'wme-segment-toolkit.user.js';
const META_FILE_NAME = 'wme-segment-toolkit.meta.js';

// `releases/latest/download/...` always resolves to the asset of the most
// recent published GitHub Release, so Tampermonkey/Violentmonkey can poll
// the `.meta.js` and fetch the new `.user.js` whenever a release is cut.
const DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/${FILE_NAME}`;
const UPDATE_URL = `https://github.com/${REPO}/releases/latest/download/${META_FILE_NAME}`;
const ICON_URL = `https://raw.githubusercontent.com/${REPO}/main/assets/wme-segment-toolkit-logo.png`;

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: 'WME Segment Toolkit',
                namespace: 'http://tampermonkey.net/',
                icon: ICON_URL,
                match: ['https://www.waze.com/*/editor*', 'https://beta.waze.com/*/editor*'],
                exclude: ['https://www.waze.com/user/editor*'],
                grant: 'none',
                'run-at': 'document-end',
                description: 'Toolkit for WME segment editing: speed-limit validator, select whole street and more.',
                author: "Murilo D'agustin",
                version: pkg.version,
                homepageURL: `https://github.com/${REPO}`,
                supportURL: `https://github.com/${REPO}/issues`,
                downloadURL: DOWNLOAD_URL,
                updateURL: UPDATE_URL,
            },
            build: {
                fileName: FILE_NAME,
                // Emits a small `<name>.meta.js` containing only the metadata
                // block; pointed at by `@updateURL` for fast update checks.
                metaFileName: META_FILE_NAME,
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
