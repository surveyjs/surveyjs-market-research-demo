import type { SurveyCreator } from 'survey-creator-react';

export function applyResearchCreatorTheme(editor: SurveyCreator): void {
  editor.applyCreatorTheme({
    themeName: 'default',
    colorPalette: 'light',
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
  } as never);
}
