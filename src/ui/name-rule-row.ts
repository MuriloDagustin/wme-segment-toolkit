import {
    NAME_MATCH_MODES,
    NAME_SOURCES,
    ROAD_TYPE_FILTER_OPS,
    type NameMatchMode,
    type NameRule,
    type NameSource,
    type RoadTypeFilterOp,
} from '../config';
import type { CountryProfile } from '../countries';
import type { Messages } from '../i18n';
import { createSwitch } from './switch';

export interface NameRuleRowHandle {
    el: HTMLElement;
    setCount: (n: number) => void;
}

export interface NameRuleRowDeps {
    rule: NameRule;
    profile: CountryProfile;
    messages: Messages;
    onChange: () => void;
    onRemove: () => void;
}

/**
 * Render a single name-rule row. Layout (3 lines):
 *   1) switch | badge | pattern input | match mode | delete
 *   2) name source | road-type-filter operator | color
 *   3) road-type chip picker (multi-select, click to toggle)
 */
export function createNameRuleRow(deps: NameRuleRowDeps): NameRuleRowHandle {
    const { rule, profile, messages, onChange, onRemove } = deps;

    const row = document.createElement('div');
    row.className = 'wme-vbr-row';

    // ------------------------------------------------------------- top
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

    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.className = 'wme-vbr-name-pattern';
    patternInput.value = rule.pattern;
    patternInput.placeholder = messages.nameRule.patternPlaceholder;
    patternInput.title = messages.nameRule.help.pattern;
    patternInput.addEventListener('change', () => {
        rule.pattern = patternInput.value;
        onChange();
    });

    const modeSelect = document.createElement('select');
    modeSelect.className = 'wme-vbr-op';
    modeSelect.title = messages.nameRule.help.matchMode;
    for (const m of NAME_MATCH_MODES) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = messages.nameRule.matchMode[m];
        if (m === rule.matchMode) opt.selected = true;
        modeSelect.appendChild(opt);
    }
    modeSelect.addEventListener('change', () => {
        rule.matchMode = modeSelect.value as NameMatchMode;
        onChange();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'wme-vbr-del';
    deleteBtn.textContent = '×';
    deleteBtn.title = messages.deleteRule;
    deleteBtn.addEventListener('click', onRemove);

    top.appendChild(sw.wrapper);
    top.appendChild(badge);
    top.appendChild(patternInput);
    top.appendChild(modeSelect);
    top.appendChild(deleteBtn);

    // ---------------------------------------------------------- middle
    const middle = document.createElement('div');
    middle.className = 'wme-vbr-row-bottom';

    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'wme-vbr-verified';
    sourceSelect.title = messages.nameRule.help.nameSource;
    for (const s of NAME_SOURCES) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = messages.nameRule.nameSource[s];
        if (s === rule.nameSource) opt.selected = true;
        sourceSelect.appendChild(opt);
    }
    sourceSelect.addEventListener('change', () => {
        rule.nameSource = sourceSelect.value as NameSource;
        onChange();
    });

    const filterSelect = document.createElement('select');
    filterSelect.className = 'wme-vbr-verified';
    filterSelect.title = messages.nameRule.help.roadTypeFilter;
    for (const op of ROAD_TYPE_FILTER_OPS) {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent =
            op === 'in' ? messages.nameRule.roadTypeFilter.in : messages.nameRule.roadTypeFilter.notIn;
        if (op === rule.roadTypeFilter) opt.selected = true;
        filterSelect.appendChild(opt);
    }
    filterSelect.addEventListener('change', () => {
        rule.roadTypeFilter = filterSelect.value as RoadTypeFilterOp;
        onChange();
    });

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'wme-vbr-color';
    colorInput.value = rule.color;
    colorInput.title = messages.nameRule.help.color;
    colorInput.addEventListener('change', () => {
        rule.color = colorInput.value;
        updateBadgeVisibility();
        onChange();
    });

    middle.appendChild(sourceSelect);
    middle.appendChild(filterSelect);
    middle.appendChild(colorInput);

    // ------------------------------------------------------- chip row
    const chipRow = document.createElement('div');
    chipRow.className = 'wme-vbr-chip-row';
    chipRow.title = messages.nameRule.help.chips;

    const selectedSet = new Set<number>(rule.roadTypes);
    for (const entry of profile.roadTypes) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'wme-vbr-chip';
        chip.textContent = entry.label;
        chip.title = String(entry.id);
        if (selectedSet.has(entry.id)) chip.classList.add('wme-vbr-chip-active');

        chip.addEventListener('click', () => {
            if (selectedSet.has(entry.id)) {
                selectedSet.delete(entry.id);
                chip.classList.remove('wme-vbr-chip-active');
            } else {
                selectedSet.add(entry.id);
                chip.classList.add('wme-vbr-chip-active');
            }
            rule.roadTypes = Array.from(selectedSet);
            onChange();
        });
        chipRow.appendChild(chip);
    }

    row.appendChild(top);
    row.appendChild(middle);
    row.appendChild(chipRow);

    let lastCount = 0;
    function updateBadgeVisibility(): void {
        const visible = rule.enabled && lastCount > 0;
        badge.classList.toggle('hidden', !visible);
        badge.style.background = rule.color;
    }

    return {
        el: row,
        setCount: (n: number) => {
            lastCount = n;
            badge.textContent = String(n);
            updateBadgeVisibility();
        },
    };
}
