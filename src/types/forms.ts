export type FormId =
  | 'login'
  | 'participant-search'
  | 'participant'
  | 'participation'
  | 'project'
  | 'survey-details'
  | 'screener-details'
  | 'incentive'
  | 'note';

export interface FormDefinition {
  id: FormId;
  name: string;
  description: string;
  formType: string;
  schema: Record<string, unknown>;
}

export interface StoredForm {
  id: FormId;
  name: string;
  description: string;
  formType: string;
  schema: Record<string, unknown>;
  version: number;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
