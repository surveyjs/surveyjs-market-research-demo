import { FormId } from './forms';

export type CreatorState =
  | { kind: 'form'; formId: FormId }
  | { kind: 'survey'; id: string; title: string; schema: object; reload: () => void }
  | { kind: 'screener'; id: string; title: string; schema: object; reload: () => void };
