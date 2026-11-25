import type { SurveyCreator } from 'survey-creator-react';
import { creatorTheme, setActiveCreator } from '../theme/demoDisplay';

export function applyResearchCreatorTheme(editor: SurveyCreator): void {
  setActiveCreator(editor);
  editor.applyCreatorTheme(creatorTheme() as never);
}

export function clearResearchCreator(): void {
  setActiveCreator(null);
}
