/** A two-state iOS-style toggle switch built from a checkbox + slider. */
export interface SwitchHandle {
    wrapper: HTMLLabelElement;
    input: HTMLInputElement;
}

export function createSwitch(
    checked: boolean,
    onChange: (next: boolean) => void,
    title?: string,
): SwitchHandle {
    const wrapper = document.createElement('label');
    wrapper.className = 'wme-vbr-switch';
    if (title) wrapper.title = title;

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
