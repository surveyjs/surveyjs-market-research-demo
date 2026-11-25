import type { SurveyCreator } from 'survey-creator-react';

const STORAGE_KEY = 'acme-research-display';

export const demoDisplay: { mode: 'light' | 'dark'; outlines: boolean } = { mode: 'light', outlines: false };

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { mode?: string; outlines?: boolean } | null;
  if (saved?.mode === 'dark' || saved?.mode === 'light') demoDisplay.mode = saved.mode;
  if (typeof saved?.outlines === 'boolean') demoDisplay.outlines = saved.outlines;
} catch {
  // Storage can be unavailable. The defaults stay in effect for this view.
}

export function saveDemoDisplay(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: demoDisplay.mode, outlines: demoDisplay.outlines }));
  } catch {
    // Storage can be unavailable. The choice lasts for this view.
  }
}

export function applyDemoDisplay(): void {
  const root = document.documentElement;
  root.dataset.bsTheme = demoDisplay.mode;
  root.dataset.surveyOutlines = String(demoDisplay.outlines);
}

let activeCreator: SurveyCreator | null = null;

export function setActiveCreator(editor: SurveyCreator | null): void {
  activeCreator = editor;
}

export function reapplyCreatorTheme(): void {
  activeCreator?.applyCreatorTheme(creatorTheme());
}

export function creatorTheme() {
  return {
    themeName: 'default',
    colorPalette: demoDisplay.mode,
    cssVariables: {
      '--sjs2-color-project-brand-600': 'var(--bs-primary)',
      '--sjs2-color-bg-brand-primary-dim': 'var(--bs-primary)',
      '--sjs2-color-fg-brand-on-primary': '#fff',
      '--sjs2-color-fg-basic-primary': 'var(--bs-body-color)',
      '--sjs2-color-fg-basic-secondary': 'var(--bs-secondary-color)',
      '--sjs2-color-border-basic-secondary': 'var(--bs-border-color)',
      '--sjs2-color-bg-basic-primary': 'var(--bs-body-bg)',
      '--sjs2-color-bg-basic-secondary': 'var(--bs-tertiary-bg)',
      '--sjs2-color-utility-body': 'var(--bs-body-bg)',
      '--sjs2-color-utility-sheet': 'var(--bs-body-bg)',
      '--sjs2-color-utility-toolbox': 'var(--bs-tertiary-bg)',
      '--sjs2-color-utility-property-grid': 'var(--bs-body-bg)',
      '--sjs2-color-utility-tabs': 'var(--bs-body-bg)',
      '--sjs2-color-utility-surface-survey': 'var(--bs-body-bg)',
      '--sjs2-color-utility-surface-designer': 'var(--bs-tertiary-bg)',
      '--sjs2-color-utility-surface-json-editor': 'var(--bs-body-bg)',
      '--sjs2-color-utility-surface-logic': 'var(--bs-tertiary-bg)',
    },
  };
}

applyDemoDisplay();
