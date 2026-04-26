import type { RoadTypeId } from 'wme-sdk-typings';
import {
    OPERATORS,
    VERIFIED_FILTERS,
    type Operator,
    type Rule,
    type VerifiedFilter,
} from '../config';
import type { CountryProfile } from '../countries';
import type { Messages } from '../i18n';
import { createSwitch } from './switch';

export interface RuleRowHandle {
    el: HTMLElement;
    setCount: (n: number) => void;
}

export interface RuleRowDeps {
    rule: Rule;
    profile: CountryProfile;
    messages: Messages;
    onChange: () => void;
    onRemove: () => void;
}

function createRoadTypeSelect(
    profile: CountryProfile,
    selected: RoadTypeId,
    onChange: (id: RoadTypeId) => void,
    title: string,
): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'wme-vbr-roadtype';
    select.title = title;
    for (const entry of profile.roadTypes) {
        const opt = document.createElement('option');
        opt.value = String(entry.id);
        opt.textContent = entry.label;
        if (entry.id === selected) opt.selected = true;
        select.appendChild(opt);
    }
    select.addEventListener('change', () =>
        onChange(Number(select.value) as RoadTypeId),
    );
    return select;
}

/**
 * Render a single rule row (3-line layout: type/delete, op/speed/color,
 * verified-filter). Returns the root element plus a `setCount(n)` callback
 * the caller invokes when match counts change.
 */
export function createRuleRow(deps: RuleRowDeps): RuleRowHandle {
    const { rule, profile, messages, onChange, onRemove } = deps;

    const row = document.createElement('div');
    row.className = 'wme-vbr-row';

    // -------------------------------------------------------------------
    // Top: enable switch + count badge + road-type select + delete
    // -------------------------------------------------------------------
    const top = document.createElement('div');
    top.className = 'wme-vbr-row-top';

    const sw = createSwitch(
        rule.enabled,
        (v) => {
            rule.enabled = v;
            updateBadgeVisibility();
            onChange();
        },
        messages.toggleRule,
    );

    const badge = document.createElement('span');
    badge.className = 'wme-vbr-badge hidden';
    badge.textContent = '0';
    badge.title = messages.badgeTitle;

    const roadSelect = createRoadTypeSelect(profile, rule.roadType, (id) => {
        rule.roadType = id;
        onChange();
    }, messages.speedHelp.roadType);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'wme-vbr-del';
    deleteBtn.textContent = '×';
    deleteBtn.title = messages.deleteRule;
    deleteBtn.addEventListener('click', onRemove);

    top.appendChild(sw.wrapper);
    top.appendChild(badge);
    top.appendChild(roadSelect);
    top.appendChild(deleteBtn);

    // -------------------------------------------------------------------
    // Middle: operator + speed + km/h suffix + color picker
    // -------------------------------------------------------------------
    const bottom = document.createElement('div');
    bottom.className = 'wme-vbr-row-bottom';

    const opSelect = document.createElement('select');
    opSelect.className = 'wme-vbr-op';
    opSelect.title = messages.speedHelp.operator;
    for (const op of OPERATORS) {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op === 'unset' ? messages.operator.unset : op;
        if (op === rule.operator) opt.selected = true;
        opSelect.appendChild(opt);
    }
    opSelect.addEventListener('change', () => {
        rule.operator = opSelect.value as Operator;
        updateOperatorUi();
        onChange();
    });

    const speedInput = document.createElement('input');
    speedInput.type = 'number';
    speedInput.className = 'wme-vbr-vel';
    speedInput.min = '0';
    speedInput.max = '200';
    speedInput.value = String(rule.speedKmh);
    speedInput.title = messages.speedHelp.speed;
    speedInput.addEventListener('change', () => {
        const v = parseInt(speedInput.value, 10);
        rule.speedKmh = isNaN(v) ? 0 : v;
        onChange();
    });

    const speedSuffix = document.createElement('span');
    speedSuffix.className = 'wme-vbr-vel-suffix';
    speedSuffix.textContent = messages.speedSuffix;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'wme-vbr-color';
    colorInput.value = rule.color;
    colorInput.title = messages.speedHelp.color;
    colorInput.addEventListener('change', () => {
        rule.color = colorInput.value;
        updateBadgeVisibility();
        onChange();
    });

    bottom.appendChild(opSelect);
    bottom.appendChild(speedInput);
    bottom.appendChild(speedSuffix);
    bottom.appendChild(colorInput);

    // -------------------------------------------------------------------
    // Extra: verified-filter dropdown with its own label
    // -------------------------------------------------------------------
    const extra = document.createElement('div');
    extra.className = 'wme-vbr-row-extra';

    const verifiedLabel = document.createElement('span');
    verifiedLabel.className = 'wme-vbr-verified-label';
    verifiedLabel.textContent = `${messages.verifiedFilter.title}:`;

    const verifiedSelect = document.createElement('select');
    verifiedSelect.className = 'wme-vbr-verified';
    verifiedSelect.title = messages.speedHelp.verifiedFilter;
    for (const f of VERIFIED_FILTERS) {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = messages.verifiedFilter[f];
        if ((rule.verifiedFilter ?? 'any') === f) opt.selected = true;
        verifiedSelect.appendChild(opt);
    }
    verifiedSelect.addEventListener('change', () => {
        rule.verifiedFilter = verifiedSelect.value as VerifiedFilter;
        onChange();
    });

    extra.appendChild(verifiedLabel);
    extra.appendChild(verifiedSelect);

    row.appendChild(top);
    row.appendChild(bottom);
    row.appendChild(extra);

    function updateOperatorUi(): void {
        const isUnset = rule.operator === 'unset';
        speedInput.classList.toggle('hidden', isUnset);
        speedSuffix.classList.toggle('hidden', isUnset);
        // Verified filter has no meaning for the 'unset' operator.
        extra.classList.toggle('hidden', isUnset);
    }

    let lastCount = 0;
    function updateBadgeVisibility(): void {
        const visible = rule.enabled && lastCount > 0;
        badge.classList.toggle('hidden', !visible);
        badge.style.background = rule.color;
    }

    updateOperatorUi();

    return {
        el: row,
        setCount: (n: number) => {
            lastCount = n;
            badge.textContent = String(n);
            updateBadgeVisibility();
        },
    };
}
