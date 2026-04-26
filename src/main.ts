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

function classificar(seg: Segment): string | null {
    if (modoDebug) return '#00BFFF';
    const fwd = seg.fwdSpeedLimit ?? 0;
    const rev = seg.revSpeedLimit ?? 0;

    for (const r of config.regras) {
        if (!r.enabled) continue;
        if (seg.roadType !== r.roadType) continue;
        if (compara(fwd, r.operador, r.velocidade) || compara(rev, r.operador, r.velocidade)) {
            return r.cor;
        }
    }
    return null;
}

function verificarVelocidades(): void {
    if (!sdk) return;
    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });

    const features: SdkFeature[] = [];
    for (const seg of sdk.DataModel.Segments.getAll()) {
        const cor = classificar(seg);
        if (!cor || !seg.geometry) continue;
        features.push({
            type: 'Feature',
            id: seg.id,
            geometry: seg.geometry,
            properties: { id: seg.id, color: cor },
        });
    }

    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ features, layerName: LAYER_NAME });
    }
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

function criarLinhaRegra(regra: Regra, onChange: () => void, onRemove: () => void): HTMLElement {
    const linha = document.createElement('div');
    Object.assign(linha.style, {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto auto',
        gap: '4px',
        alignItems: 'center',
        padding: '4px 0',
        borderBottom: '1px solid #eee',
    } as CSSStyleDeclaration);

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = regra.enabled;
    chk.title = 'Ativar/desativar';
    chk.addEventListener('change', () => { regra.enabled = chk.checked; onChange(); });

    const selRoad = document.createElement('select');
    selRoad.style.fontSize = '11px';
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

    const selOp = document.createElement('select');
    selOp.style.fontSize = '11px';
    selOp.style.width = '46px';
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
    inpVel.min = '0';
    inpVel.max = '200';
    inpVel.value = String(regra.velocidade);
    inpVel.style.width = '52px';
    inpVel.style.fontSize = '11px';
    inpVel.title = 'km/h';
    inpVel.addEventListener('change', () => {
        const v = parseInt(inpVel.value, 10);
        regra.velocidade = isNaN(v) ? 0 : v;
        onChange();
    });

    const inpCor = document.createElement('input');
    inpCor.type = 'color';
    inpCor.value = regra.cor;
    inpCor.style.width = '32px';
    inpCor.style.height = '22px';
    inpCor.style.border = 'none';
    inpCor.style.padding = '0';
    inpCor.addEventListener('change', () => {
        regra.cor = inpCor.value;
        onChange();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.textContent = '×';
    btnDel.title = 'Remover regra';
    Object.assign(btnDel.style, {
        background: 'transparent',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        width: '22px',
        height: '22px',
        lineHeight: '18px',
        padding: '0',
    } as CSSStyleDeclaration);
    btnDel.addEventListener('click', onRemove);

    linha.appendChild(chk);
    linha.appendChild(selRoad);
    linha.appendChild(selOp);
    linha.appendChild(inpVel);
    linha.appendChild(inpCor);
    linha.appendChild(btnDel);
    return linha;
}

function renderizarRegras(container: HTMLElement): void {
    container.innerHTML = '';

    const cabecalho = document.createElement('div');
    Object.assign(cabecalho.style, {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto auto',
        gap: '4px',
        alignItems: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#666',
        padding: '4px 0',
        borderBottom: '2px solid #ccc',
    } as CSSStyleDeclaration);
    for (const txt of ['', 'Tipo de via', 'Op', 'km/h', 'Cor', '']) {
        const c = document.createElement('div');
        c.textContent = txt;
        cabecalho.appendChild(c);
    }
    container.appendChild(cabecalho);

    const reagir = () => { salvarConfig(); verificarVelocidades(); };

    for (const regra of config.regras) {
        const linha = criarLinhaRegra(regra, reagir, () => {
            config.regras = config.regras.filter((r) => r.id !== regra.id);
            salvarConfig();
            renderizarRegras(container);
            verificarVelocidades();
        });
        container.appendChild(linha);
    }
}

async function criarMenuInterativo(): Promise<void> {
    if (!sdk) return;

    const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
    tabLabel.innerText = '🚦 Validador BR';
    tabLabel.title = 'Validador de Velocidades BR';

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
    renderizarRegras(containerRegras);

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
        renderizarRegras(containerRegras);
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
        renderizarRegras(containerRegras);
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
