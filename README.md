# VelocityDiff

Userscript para o Waze Map Editor (WME) construído com **Vite + TypeScript** e empacotado como `.user.js` minificado para o **Tampermonkey**.

## Scripts

- `npm run dev` — build em watch mode (gera `.user.js` a cada alteração).
- `npm run build` — type-check + build de produção minificado em `dist/`.

## Instalação no Tampermonkey

1. Rode `npm install` e depois `npm run build`.
2. O arquivo final ficará em `dist/velocity-diff.user.js`.
3. No Tampermonkey, vá em *Dashboard → Utilities → Import from file*, ou simplesmente arraste o arquivo para o navegador para instalar.
4. Para desenvolvimento, use `npm run dev` e configure o Tampermonkey para servir o script localmente (ou recarregue o arquivo após cada build).

## Sobre o SDK

O script obtém o SDK via `window.getWmeSdk({ scriptId, scriptName })` após aguardar `window.SDK_INITIALIZED`, conforme o fluxo recomendado pelo WME.

> Substitua `src/types/wme-sdk.d.ts` pelos tipos oficiais quando desejar tipagem completa.
