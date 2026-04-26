import type { WmeSDK, Segment, SdkFeature, RoadTypeId } from 'wme-sdk-typings';

const SCRIPT_ID = 'wme-validador-vel-br';
const SCRIPT_NAME = 'Validador de Velocidades BR';
const LAYER_NAME = 'wme-validador-velocidades-br';
const STORAGE_KEY = 'wme-validador-vel-br:config:v1';

type Operador = '==' | '!=' | '>' | '>=' | '<' | '<=';

interface Regra {
    id: string;
    enabled: boolean;
    roadType: RoadTypeId;
    operador: Operador;
    velocidade: number;
    cor: string;
}

interface Config {
    regras: Regra[];
}

const ROAD_TYPES: { id: RoadTypeId; nome: string }[] = [
    { id: 1, nome: 'Rua' },
    { id: 2, nome: 'Via Principal' },
    { id: 3, nome: 'Autoestrada' },
    { id: 4, nome: 'Rampa' },
    { id: 6, nome: 'Rodovia (Major)' },
    { id: 7, nome: 'Rodovia (Minor)' },
    { id: 8, nome: 'Off-road' },
    { id: 17, nome: 'Estrada Privada' },
    { id: 20, nome: 'Estacionamento' },
    { id: 22, nome: 'Beco' },
];

const OPERADORES: Operador[] = ['==', '!=', '>', '>=', '<', '<='];

const DEFAULT_CONFIG: Config = {
    regras: [
        { id: 'default-1', enabled: true, roadType: 2, operador: '==', velocidade: 30, cor: '#FF0000' },
        { id: 'default-2', enabled: true, roadType: 1, operador: '>', velocidade: 30, cor: '#FFA500' },
    ],
};

let sdk: WmeSDK | null = null;
let modoDebug = false;
let config: Config = carregarConfig();
let contagens: Record<string, number> = {};
let contagemDebug = 0;
let onContagensAtualizadas: (() => void) | null = null;

function clonar<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
}

function carregarConfig(): Config {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return clonar(DEFAULT_CONFIG);
        const parsed = JSON.parse(raw) as Config;
        if (!parsed?.regras || !Array.isArray(parsed.regras)) return clonar(DEFAULT_CONFIG);
        return parsed;
    } catch {
        return clonar(DEFAULT_CONFIG);
    }
}

function salvarConfig(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error(`[${SCRIPT_NAME}] erro ao salvar config:`, e);
    }
}

function novoId(): string {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function compara(a: number, op: Operador, b: number): boolean {
    switch (op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>': return a > b;
        case '>=': return a >= b;
        case '<': return a < b;
        case '<=': return a <= b;
    }
}

function classificar(seg: Segment): { cor: string; ruleId: string | null } | null {
    if (modoDebug) return { cor: '#00BFFF', ruleId: null };
    const fwd = seg.fwdSpeedLimit ?? 0;
    const rev = seg.revSpeedLimit ?? 0;

    for (const r of config.regras) {
        if (!r.enabled) continue;
        if (seg.roadType !== r.roadType) continue;
        if (compara(fwd, r.operador, r.velocidade) || compara(rev, r.operador, r.velocidade)) {
            return { cor: r.cor, ruleId: r.id };
        }
    }
    return null;
}

function verificarVelocidades(): void {
    if (!sdk) return;
    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });

    contagens = {};
    contagemDebug = 0;

    const features: SdkFeature[] = [];
    for (const seg of sdk.DataModel.Segments.getAll()) {
        const r = classificar(seg);
        if (!r || !seg.geometry) continue;

        if (modoDebug) {
            contagemDebug++;
        } else if (r.ruleId) {
            contagens[r.ruleId] = (contagens[r.ruleId] ?? 0) + 1;
        }

        features.push({
            type: 'Feature',
            id: seg.id,
            geometry: seg.geometry,
            properties: { id: seg.id, color: r.cor },
        });
    }

    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ features, layerName: LAYER_NAME });
    }

    onContagensAtualizadas?.();
}

function estilizarBotao(btn: HTMLButtonElement): void {
    Object.assign(btn.style, {
        fontSize: '11px',
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: '#f5f5f5',
        cursor: 'pointer',
    } as CSSStyleDeclaration);
}

function injetarEstilos(): void {
    const ID = 'wme-validador-styles';
    if (document.getElementById(ID)) return;

    const style = document.createElement('style');
    style.id = ID;
    style.textContent = `
.wme-vbr-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    margin-bottom: 6px;
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
}
.wme-vbr-row-top, .wme-vbr-row-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
}
.wme-vbr-row-top > .wme-vbr-roadtype { flex: 1; min-width: 0; }
.wme-vbr-row-bottom { padding-left: 4px; }
.wme-vbr-row-bottom > .wme-vbr-op { flex: 0 0 auto; }
.wme-vbr-row-bottom > .wme-vbr-vel { flex: 1; min-width: 60px; }

/* iOS-style switch */
.wme-vbr-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
}
.wme-vbr-switch input { opacity: 0; width: 0; height: 0; }
.wme-vbr-switch .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: #ccc;
    border-radius: 20px;
    transition: background .2s;
}
.wme-vbr-switch .slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: transform .2s;
    box-shadow: 0 1px 2px rgba(0,0,0,.3);
}
.wme-vbr-switch input:checked + .slider { background: #34c759; }
.wme-vbr-switch input:checked + .slider::before { transform: translateX(16px); }

.wme-vbr-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 20px;
    font-size: 11px;
    font-weight: 700;
    padding: 0 8px;
    border-radius: 10px;
    color: #fff;
    background: #999;
    flex-shrink: 0;
}
.wme-vbr-badge.hidden { display: none; }

.wme-vbr-row select,
.wme-vbr-row input[type="number"] {
    font-size: 12px;
    padding: 3px 4px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
}
.wme-vbr-row select.wme-vbr-roadtype { width: 100%; }
.wme-vbr-row input[type="number"].wme-vbr-vel { width: 100%; }
.wme-vbr-row select.wme-vbr-op { width: 56px; }

.wme-vbr-color {
    width: 36px;
    height: 26px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    flex-shrink: 0;
}
.wme-vbr-del {
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    width: 26px;
    height: 26px;
    line-height: 18px;
    padding: 0;
    font-size: 16px;
    flex-shrink: 0;
}
.wme-vbr-del:hover { background: #fee; border-color: #f99; }
.wme-vbr-vel-suffix { font-size: 11px; color: #666; flex-shrink: 0; }
`;
    document.head.appendChild(style);
}

function criarSwitch(checked: boolean, onChange: (v: boolean) => void): { wrapper: HTMLElement; input: HTMLInputElement } {
    const wrapper = document.createElement('label');
    wrapper.className = 'wme-vbr-switch';
    wrapper.title = 'Ativar/desativar regra';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const slider = document.createElement('span');
    slider.className = 'slider';
    wrapper.appendChild(input);
    wrapper.appendChild(slider);
    return { wrapper, input };
}

function criarLinhaRegra(regra: Regra, onChange: () => void, onRemove: () => void): { el: HTMLElement; atualizarContagem: (n: number) => void } {
    const linha = document.createElement('div');
    linha.className = 'wme-vbr-row';

    // ===== Linha de cima: switch + badge + tipo de via + remover =====
    const top = document.createElement('div');
    top.className = 'wme-vbr-row-top';

    const sw = criarSwitch(regra.enabled, (v) => {
        regra.enabled = v;
        atualizarVisibilidadeBadge();
        onChange();
    });

    const badge = document.createElement('span');
    badge.className = 'wme-vbr-badge hidden';
    badge.textContent = '0';
    badge.title = 'Segmentos visíveis que casam esta regra';

    const selRoad = document.createElement('select');
    selRoad.className = 'wme-vbr-roadtype';
    for (const rt of ROAD_TYPES) {
        const opt = document.createElement('option');
        opt.value = String(rt.id);
        opt.textContent = rt.nome;
        if (rt.id === regra.roadType) opt.selected = true;
        selRoad.appendChild(opt);
    }
    selRoad.addEventListener('change', () => {
        regra.roadType = Number(selRoad.value) as RoadTypeId;
        onChange();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'wme-vbr-del';
    btnDel.textContent = '×';
    btnDel.title = 'Remover regra';
    btnDel.addEventListener('click', onRemove);

    top.appendChild(sw.wrapper);
    top.appendChild(badge);
    top.appendChild(selRoad);
    top.appendChild(btnDel);

    // ===== Linha de baixo: operador + km/h + cor =====
    const bottom = document.createElement('div');
    bottom.className = 'wme-vbr-row-bottom';

    const selOp = document.createElement('select');
    selOp.className = 'wme-vbr-op';
    for (const op of OPERADORES) {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        if (op === regra.operador) opt.selected = true;
        selOp.appendChild(opt);
    }
    selOp.addEventListener('change', () => {
        regra.operador = selOp.value as Operador;
        onChange();
    });

    const inpVel = document.createElement('input');
    inpVel.type = 'number';
    inpVel.className = 'wme-vbr-vel';
    inpVel.min = '0';
    inpVel.max = '200';
    inpVel.value = String(regra.velocidade);
    inpVel.title = 'km/h';
    inpVel.addEventListener('change', () => {
        const v = parseInt(inpVel.value, 10);
        regra.velocidade = isNaN(v) ? 0 : v;
        onChange();
    });

    const sufixo = document.createElement('span');
    sufixo.className = 'wme-vbr-vel-suffix';
    sufixo.textContent = 'km/h';

    const inpCor = document.createElement('input');
    inpCor.type = 'color';
    inpCor.className = 'wme-vbr-color';
    inpCor.value = regra.cor;
    inpCor.title = 'Cor';
    inpCor.addEventListener('change', () => {
        regra.cor = inpCor.value;
        atualizarVisibilidadeBadge();
        onChange();
    });

    bottom.appendChild(selOp);
    bottom.appendChild(inpVel);
    bottom.appendChild(sufixo);
    bottom.appendChild(inpCor);

    linha.appendChild(top);
    linha.appendChild(bottom);

    let ultimaContagem = 0;

    function atualizarVisibilidadeBadge(): void {
        const visivel = regra.enabled && ultimaContagem > 0;
        badge.classList.toggle('hidden', !visivel);
        badge.style.background = regra.cor;
    }

    return {
        el: linha,
        atualizarContagem: (n: number) => {
            ultimaContagem = n;
            badge.textContent = String(n);
            atualizarVisibilidadeBadge();
        },
    };
}

function renderizarRegras(container: HTMLElement, totalEl: HTMLElement): void {
    container.innerHTML = '';

    const reagir = () => { salvarConfig(); verificarVelocidades(); };

    const handlersContagem: { ruleId: string; atualizar: (n: number) => void }[] = [];

    for (const regra of config.regras) {
        const { el, atualizarContagem } = criarLinhaRegra(regra, reagir, () => {
            config.regras = config.regras.filter((r) => r.id !== regra.id);
            salvarConfig();
            renderizarRegras(container, totalEl);
            verificarVelocidades();
        });
        container.appendChild(el);
        handlersContagem.push({ ruleId: regra.id, atualizar: atualizarContagem });
    }

    onContagensAtualizadas = () => {
        for (const h of handlersContagem) {
            h.atualizar(contagens[h.ruleId] ?? 0);
        }
        const total = modoDebug
            ? contagemDebug
            : Object.values(contagens).reduce((a, b) => a + b, 0);
        totalEl.textContent = modoDebug
            ? `Debug: ${total} segmento(s) na vista`
            : `Total: ${total} segmento(s) destacado(s)`;
    };
    onContagensAtualizadas();
}

async function criarMenuInterativo(): Promise<void> {
    if (!sdk) return;

    injetarEstilos();

    const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
    tabLabel.innerText = '🚦 Validador BR';
    tabLabel.title = 'Validador de Velocidades BR';

    tabPane.style.padding = '6px';
    tabPane.style.boxSizing = 'border-box';

    const titulo = document.createElement('h4');
    titulo.innerText = 'Validador de Velocidades BR';
    titulo.style.margin = '0 0 8px 0';
    tabPane.appendChild(titulo);

    const descricao = document.createElement('p');
    descricao.style.fontSize = '11px';
    descricao.style.color = '#555';
    descricao.style.margin = '0 0 10px 0';
    descricao.innerHTML =
        'Configure regras por tipo de via, operador, velocidade (km/h) e cor. ' +
        'Um segmento é destacado se <i>qualquer</i> regra ativa casar com a velocidade fwd ou rev.';
    tabPane.appendChild(descricao);

    const labelDebug = document.createElement('label');
    Object.assign(labelDebug.style, {
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        margin: '0 0 10px 0',
    } as CSSStyleDeclaration);

    const chkDebug = document.createElement('input');
    chkDebug.type = 'checkbox';
    chkDebug.style.marginRight = '8px';
    chkDebug.addEventListener('change', () => {
        modoDebug = chkDebug.checked;
        verificarVelocidades();
    });
    labelDebug.appendChild(chkDebug);
    labelDebug.appendChild(document.createTextNode('Debug (pintar tudo de azul)'));
    tabPane.appendChild(labelDebug);

    const containerRegras = document.createElement('div');
    containerRegras.style.margin = '0 0 8px 0';
    tabPane.appendChild(containerRegras);

    const totalEl = document.createElement('div');
    Object.assign(totalEl.style, {
        fontSize: '11px',
        color: '#333',
        margin: '6px 0 8px 0',
        padding: '4px 8px',
        background: '#f0f0f0',
        borderRadius: '4px',
    } as CSSStyleDeclaration);
    totalEl.textContent = 'Total: 0 segmento(s) destacado(s)';
    tabPane.appendChild(totalEl);

    renderizarRegras(containerRegras, totalEl);

    const botoes = document.createElement('div');
    botoes.style.display = 'flex';
    botoes.style.gap = '6px';

    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.textContent = '+ Adicionar regra';
    estilizarBotao(btnAdd);
    btnAdd.addEventListener('click', () => {
        config.regras.push({
            id: novoId(),
            enabled: true,
            roadType: 1,
            operador: '>',
            velocidade: 30,
            cor: '#00AAFF',
        });
        salvarConfig();
        renderizarRegras(containerRegras, totalEl);
        verificarVelocidades();
    });

    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.textContent = 'Restaurar padrões';
    estilizarBotao(btnReset);
    btnReset.addEventListener('click', () => {
        if (!confirm('Restaurar configuração padrão?')) return;
        config = clonar(DEFAULT_CONFIG);
        salvarConfig();
        renderizarRegras(containerRegras, totalEl);
        verificarVelocidades();
    });

    botoes.appendChild(btnAdd);
    botoes.appendChild(btnReset);
    tabPane.appendChild(botoes);
}

function initScript(): void {
    if (!sdk) return;
    console.log(`[${SCRIPT_NAME}] SDK pronto, ativando script.`);

    sdk.Map.addLayer({
        layerName: LAYER_NAME,
        styleContext: {
            getStrokeColor: ({ feature }) =>
                (feature?.properties?.color as string | undefined) ?? '#00BFFF',
        },
        styleRules: [
            {
                style: {
                    strokeColor: '${getStrokeColor}',
                    strokeWidth: 6,
                    strokeOpacity: 0.65,
                    strokeLinecap: 'round',
                },
            },
        ],
    });

    criarMenuInterativo().catch((e) =>
        console.error(`[${SCRIPT_NAME}] erro ao registrar aba:`, e),
    );

    sdk.Events.on({ eventName: 'wme-map-move-end', eventHandler: verificarVelocidades });
    sdk.Events.on({ eventName: 'wme-map-zoom-changed', eventHandler: verificarVelocidades });
    sdk.Events.on({ eventName: 'wme-map-data-loaded', eventHandler: verificarVelocidades });
    sdk.Events.on({ eventName: 'wme-data-model-objects-changed', eventHandler: verificarVelocidades });

    verificarVelocidades();
}

function aguardarSdkInjetado(timeoutMs = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
        const inicio = Date.now();
        const checar = () => {
            const w = window as unknown as {
                SDK_INITIALIZED?: Promise<unknown>;
                getWmeSdk?: unknown;
            };
            if (w.SDK_INITIALIZED && w.getWmeSdk) {
                resolve();
                return;
            }
            if (Date.now() - inicio > timeoutMs) {
                reject(new Error('Timeout aguardando window.SDK_INITIALIZED'));
                return;
            }
            setTimeout(checar, 200);
        };
        checar();
    });
}

async function bootstrap(): Promise<void> {
    await aguardarSdkInjetado();
    await window.SDK_INITIALIZED;
    const wmeSdk = window.getWmeSdk!({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
    sdk = wmeSdk;
    await wmeSdk.Events.once({ eventName: 'wme-ready' });
    initScript();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] erro:`, e));
    });
} else {
    bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] erro:`, e));
}
