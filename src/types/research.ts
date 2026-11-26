import type { QualificationConfig, QualificationStatus } from '../domain/qualify';

export interface Project {
  id: string;
  name: string;
  client: string;
  objective: string;
  description: string;
  targetAudience: string;
  startDate: string;
  endDate: string;
  datesConfirmed: boolean;
  recruitmentTarget: number;
  recruited: number;
  status: string;
  archived: boolean;
  allowRepeat: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Study {
  id: string;
  projectId: string;
  name: string;
  description: string;
  method: string;
  durationMinutes: number;
  status: string;
}

export interface ParticipantSummary {
  id: string;
  participantCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: string;
  segment: string;
  city: string;
  recruitmentSource: string;
  lastStudy: string;
  projectCount: number;
  studyCount: number;
  screenerCount: number;
  createdAt: string;
}

export interface Participant extends ParticipantSummary {
  dateOfBirth: string;
  ageBand: string;
  phone: string;
  occupation: string;
  preferredDevice: string;
  shoppingFrequency: string;
  recruitmentSource: string;
  consentStatus: string;
  researchNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participation {
  id: string;
  participantId: string;
  participantName: string;
  participantCode: string;
  projectId: string;
  projectName: string;
  studyId: string;
  studyName: string;
  participationDate: string;
  method: string;
  status: string;
  incentiveDescription: string;
  incentiveAmount: number | null;
  incentiveStatus: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantNote {
  id: string;
  participantId: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningRecord {
  id: string;
  participantId: string;
  participantName: string;
  participantCode: string;
  screenerId: string;
  screenerName: string;
  projectId: string;
  projectName: string;
  responseData: Record<string, unknown>;
  qualificationStatus: QualificationStatus | string;
  reason: string;
  submittedAt: string;
  schema: Record<string, unknown>;
}

export interface SurveyRecord {
  id: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  estimatedDuration: number;
  status: string;
  questionCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  schema?: Record<string, unknown>;
}

export interface SurveyResponseRecord {
  id: string;
  surveyId: string;
  surveyName: string;
  participantId: string;
  participantName: string;
  projectId: string;
  responseData: Record<string, unknown>;
  isTestResponse: boolean;
  submittedBy: string;
  submittedAt: string;
  schema: Record<string, unknown>;
}

export interface ScreenerRecord {
  id: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  status: string;
  questionCount: number;
  responseCount: number;
  eligibleCount: number;
  disqualifiedCount: number;
  qualification: QualificationConfig;
  createdAt: string;
  updatedAt: string;
  schema?: Record<string, unknown>;
}

export interface Incentive {
  id: string;
  participationId: string;
  participantId: string;
  participantName: string;
  participantCode: string;
  projectId: string;
  projectName: string;
  incentiveType: string;
  amount: number;
  description: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Choice {
  value: string;
  text: string;
  code?: string;
}

export interface ParticipantProfile {
  participant: Participant;
  participations: Participation[];
  screening: ScreeningRecord[];
  notes: ParticipantNote[];
  incentives: Incentive[];
}

export interface ProjectDetail {
  project: Project;
  studies: Study[];
  surveys: SurveyRecord[];
  screeners: ScreenerRecord[];
  participants: ParticipantSummary[];
  participations: Participation[];
  screening: ScreeningRecord[];
}
