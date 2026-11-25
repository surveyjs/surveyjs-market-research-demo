import { FORM_BY_ID } from '../survey/catalog';
import { FormId, StoredForm } from '../types/forms';
import { api } from './api';

type Listener = (formId: FormId) => void;
const listeners = new Set<Listener>();
const active = new Map<string, StoredForm>();

export const formRepository = {
  async init(): Promise<void> {
    try {
      const forms = await api<StoredForm[]>('/forms');
      active.clear();
      forms.forEach((form) => active.set(form.id, form));
    } catch (error) {
      console.error('Failed to load form schemas:', error);
    }
  },

  getForm(formId: FormId): Record<string, unknown> {
    return active.get(formId)?.schema ?? FORM_BY_ID[formId].schema;
  },

  getMetadata(formId: FormId) {
    const current = active.get(formId);
    const fallback = FORM_BY_ID[formId];
    return {
      title: current?.name ?? fallback.name,
      description: current?.description ?? fallback.description,
      defaultSchema: structuredClone(fallback.schema),
    };
  },

  async saveForm(formId: FormId, schema: object): Promise<void> {
    const saved = await api<StoredForm>(`/forms/${formId}/schema`, {
      method: 'POST',
      body: JSON.stringify({ schema }),
    });
    active.set(formId, saved);
    listeners.forEach((listener) => listener(formId));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
