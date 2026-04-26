import styles from '../styles.css?inline';

const STYLE_ELEMENT_ID = 'wme-speed-validator-styles';

/** Inject the bundled stylesheet into the page (idempotent). */
export function injectStyles(): void {
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = styles;
    document.head.appendChild(style);
}
