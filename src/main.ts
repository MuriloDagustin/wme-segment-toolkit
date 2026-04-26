import { App } from './app';
import { waitForSdkInjection } from './sdk-bootstrap';

const SCRIPT_ID = 'wme-validador-vel-br';
const SCRIPT_NAME = 'WME Speed Limit Validator';

async function bootstrap(): Promise<void> {
    await waitForSdkInjection();
    await window.SDK_INITIALIZED;

    const sdk = window.getWmeSdk!({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
    await sdk.Events.once({ eventName: 'wme-ready' });

    const app = new App(sdk);
    app.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] error:`, e));
    });
} else {
    bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] error:`, e));
}
