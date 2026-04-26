import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default {
    plugins: [
        autoprefixer({
            // Modern userscript users; keep prefixes minimal but safe.
            overrideBrowserslist: ['last 2 versions', 'not dead', '> 0.5%'],
        }),
        cssnano({
            preset: ['default', { discardComments: { removeAll: true } }],
        }),
    ],
};
