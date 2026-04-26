import type { WmeSDK, Segment, SdkFeature } from 'wme-sdk-typings';

const SCRIPT_ID = 'wme-validador-vel-br';
const SCRIPT_NAME = 'Validador de Velocidades BR';
const LAYER_NAME = 'wme-validador-velocidades-br';

let sdk: WmeSDK | null = null;
let modoDebug = false;

async function criarMenuInterativo(): Promise<void> {
    if (!sdk) return;

    const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();

    tabLabel.innerText = '🚦 Validador BR';
    tabLabel.title = 'Validador de Velocidades BR';

    const titulo = document.createElement('h4');
    titulo.innerText = 'Validador de Velocidades BR';
    titulo.style.margin = '0 0 8px 0';

    const descricao = document.createElement('p');
    descricao.style.fontSize = '12px';
    descricao.style.color = '#555';
    descricao.style.margin = '0 0 10px 0';
    descricao.innerHTML =
        '<b>Vermelho:</b> Via Principal a 30 km/h<br>' +
        '<b>Laranja:</b> Rua a mais de 30 km/h';

    const label = document.createElement('label');
    label.style.cursor = 'pointer';
    label.style.display = 'flex';
    label.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'wme-validador-debug';
    checkbox.style.marginRight = '8px';

    checkbox.addEventListener('change', (e) => {
        modoDebug = (e.target as HTMLInputElement).checked;
        verificarVelocidades();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('Debug (pintar tudo de azul)'));

    tabPane.appendChild(titulo);
    tabPane.appendChild(descricao);
    tabPane.appendChild(label);
}

function classificar(seg: Segment): string | null {
    if (modoDebug) return '#00BFFF';

    const fwd = seg.fwdSpeedLimit ?? 0;
    const rev = seg.revSpeedLimit ?? 0;
    const rt = seg.roadType;

    // roadType 2 = Primary Street; 1 = Street (no Brasil)
    if (rt === 2 && (fwd === 30 || rev === 30)) return '#FF0000';
    if (rt === 1 && (fwd > 30 || rev > 30)) return '#FFA500';
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



