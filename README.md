# WME Segment Toolkit

Userscript para o **Waze Map Editor (WME)**, construído com **Vite + TypeScript** e empacotado via `vite-plugin-monkey` como `.user.js` minificado para o **Tampermonkey**.

Conjunto de ferramentas para inspecionar e corrigir segmentos no WME, organizado em quatro abas no painel lateral do editor.

## Recursos

### 🚦 Aba **Velocidades**
Destaca no mapa segmentos que casam com regras configuráveis sobre o limite de velocidade.

- Regras por **tipo de via**, **operador** (`==`, `!=`, `>`, `>=`, `<`, `<=`, `sem limite`), **velocidade (km/h)** e **cor**.
- Filtro por status de **verificação** do limite (qualquer / verificado / não verificado).
- Casa nas duas direções (`fwd` ou `rev`); um segmento é destacado se *qualquer* regra ativa casar.
- Perfil por país (lista de tipos de via e velocidades padrão), com **auto-detecção** pelo país visível no mapa.
- Modo **debug**: pinta tudo de ciano para validar que a camada está renderizando.
- Contador de matches por regra (badge) e total geral.

### 🏷️ Aba **Nomes**
Destaca segmentos cujo nome de rua casa com um padrão, opcionalmente filtrado por tipo de via. Útil para encontrar avenidas/rodovias mal classificadas.

- **Padrão** de texto, case-insensitive, com 3 modos: `começa com`, `contém`, `igual a`.
- **Fonte do nome**: principal, alternativo ou qualquer.
- **Filtro de tipo de via** com chips clicáveis, em modo `é um destes` ou `NÃO é um destes` (vazio = ignora tipo).
- Camada própria com tracejado, para sobrepor sem conflito aos destaques de velocidade.

### 🎯 Aba **Seleção**
Botões para expandir a seleção a partir de um segmento.

- **Selecionar rua inteira** — navega pelos nós e expande para todos os segmentos conectados que compartilham a mesma rua principal.
- **Selecionar por nome** — variante mais agressiva: atravessa rotatórias seguindo o nome principal/alternativo.

### 🚧 Aba **Problemas**
Checagens prontas para problemas comuns de qualidade de mapa. Cada uma é um toggle independente com cor própria; os destaques saem em camada pontilhada (não conflita com as outras).

- **Vias sem nome** — Streets, Primary Streets, Highways e Ramps sem `primaryStreetId` ou com nome vazio.
- **Segmentos muito curtos (< 5m)** — frequentemente erros de mapa. Segmentos de rotatória são ignorados.
- **Sem limite de velocidade** — Primary Streets e acima sem velocidade definida na(s) direção(ões) ativa(s); respeita one-way.

### Geral
- Persistência em `localStorage` (chave versionada).
- i18n: **PT-BR** e **EN**, escolhido automaticamente pelo locale do WME.
- Tooltips em todos os controles.

## Scripts

- `npm install` — instala dependências.
- `npm run dev` — build em watch mode.
- `npm run build` — type-check + build de produção minificado.
- `npm test` — roda a suíte Vitest (lógica pura: classificação por nome, regras de velocidade, detecção de país, parsing de config).

## Instalação no Tampermonkey

### Recomendado (auto-update via GitHub Releases)

Instale direto pelo link do release mais recente — o Tampermonkey/Violentmonkey vai checar atualizações sozinho:

- [wme-segment-toolkit.user.js (latest release)](https://github.com/MuriloDagustin/wme-segment-toolkit/releases/latest/download/wme-segment-toolkit.user.js)

O script tem `@updateURL` apontando para o `.meta.js` do mesmo release, então novas versões publicadas no GitHub aparecem automaticamente como update.

### Build local (desenvolvimento)

1. `npm install` e `npm run build`.
2. O arquivo final fica em `dist/wme-segment-toolkit.user.js`.
3. No Tampermonkey: *Dashboard → Utilities → Import from file*, ou arraste o `.user.js` para o navegador.
4. Para desenvolvimento, use `npm run dev` e recarregue o script no Tampermonkey após cada build.

## Releases

O versionamento é automatizado com [release-please](https://github.com/googleapis/release-please) baseado em [Conventional Commits](https://www.conventionalcommits.org/):

- A cada push em `main`, o workflow mantém uma **Release PR** aberta com bump de versão e CHANGELOG gerados a partir dos commits (`feat:`, `fix:`, `feat!:`/`BREAKING CHANGE:`, etc.).
- Mergeando essa PR, o GitHub Release é criado e o mesmo workflow builda o userscript com a versão nova já no header e anexa `.user.js` + `.meta.js` ao release.

## Estrutura

```
src/
  app.ts                 # orquestração (SDK ready, refresh loop, layers)
  config.ts              # tipos e (de)serialização de regras (speed + name)
  countries.ts           # perfis por país e auto-detecção
  rules.ts               # avaliação de regras de velocidade
  highlights.ts          # camada e features de velocidade
  name-classify.ts       # avaliação pura de regras de nome
  name-highlights.ts     # camada e features de nome (tracejado)
  issues.ts              # checagens puras de problemas comuns
  issues-highlights.ts   # camada e features de problemas (pontilhado)
  select-street.ts       # expansão de seleção (BFS por nós)
  i18n.ts                # mensagens PT/EN
  ui/
    panel.ts             # painel lateral + tabs
    tabs/
      speed.ts           # aba Velocidades
      names.ts           # aba Nomes
      issues.ts          # aba Problemas
      selection.ts       # aba Seleção
    rule-row.ts          # linha de regra de velocidade
    name-rule-row.ts     # linha de regra de nome
    tabs.ts              # componente genérico de tabs
  styles.css             # estilos do painel
```

## SDK

O script obtém o SDK via `window.getWmeSdk({ scriptId, scriptName })` após aguardar `window.SDK_INITIALIZED`. Tipos oficiais em `wme-sdk-typings`.

## Stack

- TypeScript 5.6 (`strict`, target ES2020)
- Vite 5.4 + `vite-plugin-monkey`
- Vitest 2 + happy-dom
- Sem dependências de runtime — só o SDK do WME.
