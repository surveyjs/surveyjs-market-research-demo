import {
  Choice,
  Incentive,
  ParticipantProfile,
  ParticipantSummary,
  Participation,
  Project,
  ProjectDetail,
  ScreenerRecord,
  ScreeningRecord,
  SurveyRecord,
  SurveyResponseRecord,
} from '../types/research';
import { api } from './api';

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const researchRepository = {
  projects: () => api<Project[]>('/projects'),
  project: (id: string) => api<ProjectDetail>(`/projects/${id}`),
  createProject: (record: Record<string, unknown>) => api<ProjectDetail>('/projects', { method: 'POST', body: JSON.stringify(record) }),
  updateProject: (id: string, record: Record<string, unknown>) =>
    api<ProjectDetail>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  setProjectStatus: (id: string, status: string) =>
    api<ProjectDetail>(`/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  participants: (filter: { surname?: string; participantId?: string; email?: string }) =>
    api<ParticipantSummary[]>(`/participants${query(filter)}`),
  participantChoices: () => api<Choice[]>('/participants/choices'),
  participant: (id: string) => api<ParticipantProfile>(`/participants/${id}`),
  createParticipant: (record: Record<string, unknown>) =>
    api<ParticipantProfile>('/participants', { method: 'POST', body: JSON.stringify(record) }),
  updateParticipant: (id: string, record: Record<string, unknown>) =>
    api<ParticipantProfile>(`/participants/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  addNote: (id: string, note: string) =>
    api(`/participants/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
  updateNote: (id: string, note: string) => api(`/notes/${id}`, { method: 'PUT', body: JSON.stringify({ note }) }),
  deleteNote: (id: string) => api<void>(`/notes/${id}`, { method: 'DELETE' }),
  createParticipation: (record: Record<string, unknown>) =>
    api<Participation>('/participations', { method: 'POST', body: JSON.stringify(record) }),

  surveys: () => api<SurveyRecord[]>('/surveys'),
  survey: (id: string) => api<SurveyRecord>(`/surveys/${id}`),
  createSurvey: (record: Record<string, unknown>) => api<SurveyRecord>('/surveys', { method: 'POST', body: JSON.stringify(record) }),
  updateSurvey: (id: string, record: Record<string, unknown>) =>
    api<SurveyRecord>(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  saveSurveySchema: (id: string, schema: object) =>
    api<SurveyRecord>(`/surveys/${id}/schema`, { method: 'PUT', body: JSON.stringify({ schema }) }),
  setSurveyStatus: (id: string, status: string) =>
    api<SurveyRecord>(`/surveys/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  surveyResponses: (id: string) => api<SurveyResponseRecord[]>(`/surveys/${id}/responses`),
  addSurveyResponse: (id: string, response: Record<string, unknown>, isTestResponse = true) =>
    api<SurveyResponseRecord>(`/surveys/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify({ response, isTestResponse }),
    }),

  screeners: () => api<ScreenerRecord[]>('/screeners'),
  screener: (id: string) => api<ScreenerRecord>(`/screeners/${id}`),
  createScreener: (record: Record<string, unknown>) =>
    api<ScreenerRecord>('/screeners', { method: 'POST', body: JSON.stringify(record) }),
  updateScreener: (id: string, record: Record<string, unknown>) =>
    api<ScreenerRecord>(`/screeners/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  saveScreenerSchema: (id: string, schema: object) =>
    api<ScreenerRecord>(`/screeners/${id}/schema`, { method: 'PUT', body: JSON.stringify({ schema }) }),
  saveScreenerRules: (id: string, rules: unknown) =>
    api<ScreenerRecord>(`/screeners/${id}/rules`, { method: 'PUT', body: JSON.stringify(rules) }),
  setScreenerStatus: (id: string, status: string) =>
    api<ScreenerRecord>(`/screeners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  submitScreener: (participantId: string, screenerId: string, response: Record<string, unknown>) =>
    api<ScreeningRecord>('/screener-responses', {
      method: 'POST',
      body: JSON.stringify({ participantId, screenerId, response }),
    }),

  incentives: (filter: { status?: string; projectId?: string }) => api<Incentive[]>(`/incentives${query(filter)}`),
  createIncentive: (record: Record<string, unknown>) => api<Incentive>('/incentives', { method: 'POST', body: JSON.stringify(record) }),
  updateIncentive: (id: string, record: Record<string, unknown>) =>
    api<Incentive>(`/incentives/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
};
