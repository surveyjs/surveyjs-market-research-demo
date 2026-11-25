import { ageYears } from '../src/domain/age';
import {
  INCENTIVE_STATUSES,
  INCENTIVE_TYPES,
  PARTICIPATION_STATUSES,
  PROJECT_STATUSES,
  RULE_OPERATORS,
  SCREENER_STATUSES,
  SURVEY_STATUSES,
} from '../src/domain/constants';
import { parseQualificationConfig, QualificationConfig } from '../src/domain/qualify';
import { ResearchError } from './errors';

export function text(value: unknown, label: string, required = false): string {
  const result = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  if (required && !result) throw new ResearchError(`${label} is required.`);
  return result;
}

export function limited(value: string, label: string, max: number): string {
  if (value.length > max) throw new ResearchError(`${label} must be ${max} characters or fewer.`);
  return value;
}

export function oneOf(value: string, allowed: readonly string[], label: string, required = false): string {
  if (!value && !required) return '';
  if (!allowed.includes(value)) throw new ResearchError(`${label} is not valid.`);
  return value;
}

export function isoDate(value: unknown, label: string, required = false): string {
  const result = text(value, label, required);
  if (!result) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(new Date(`${result}T00:00:00`).getTime())) {
    throw new ResearchError(`${label} is not a valid date.`);
  }
  return result;
}

export function adultDate(value: unknown): string {
  const result = isoDate(value, 'Date of birth', true);
  const age = ageYears(result);
  if (age < 18) throw new ResearchError('Participant must be 18 or older.');
  return result;
}

export function emailAddress(value: unknown): string {
  const result = limited(text(value, 'Email', true), 'Email', 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ResearchError('Email is not valid.');
  return result;
}

export function wholeNumber(value: unknown, label: string, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ResearchError(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

export function flag(value: unknown): boolean {
  return value === true || value === 1 || value === 'true';
}

export function schemaObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResearchError('A form schema is required.');
  return value as Record<string, unknown>;
}

export function recordObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResearchError('A form record is required.');
  return value as Record<string, unknown>;
}

export function participantInput(body: Record<string, unknown>) {
  const status = text(body.status, 'Status') || 'Active';
  return {
    firstName: limited(text(body.firstName, 'First name', true), 'First name', 80),
    lastName: limited(text(body.lastName, 'Last name', true), 'Last name', 80),
    dateOfBirth: adultDate(body.dateOfBirth),
    participantCode: limited(text(body.participantCode, 'Participant ID'), 'Participant ID', 40),
    email: emailAddress(body.email),
    phone: limited(text(body.phone, 'Phone'), 'Phone', 40),
    city: limited(text(body.city, 'City'), 'City', 80),
    occupation: limited(text(body.occupation, 'Occupation'), 'Occupation', 120),
    preferredDevice: limited(text(body.preferredDevice, 'Preferred device'), 'Preferred device', 80),
    shoppingFrequency: limited(text(body.shoppingFrequency, 'Shopping frequency'), 'Shopping frequency', 80),
    recruitmentSource: limited(text(body.recruitmentSource, 'Recruitment source'), 'Recruitment source', 80),
    consentStatus: limited(text(body.consentStatus, 'Consent status', true), 'Consent status', 40),
    status: limited(status, 'Status', 40),
    segment: limited(text(body.segment, 'Segment'), 'Segment', 80),
    researchNotes: limited(text(body.researchNotes, 'Research notes'), 'Research notes', 4000),
  };
}

export function projectInput(body: Record<string, unknown>) {
  const startDate = isoDate(body.startDate, 'Fieldwork start', true);
  const endDate = isoDate(body.endDate, 'Fieldwork end');
  if (endDate && endDate < startDate) throw new ResearchError('Fieldwork end must be on or after the start date.');
  return {
    name: limited(text(body.name, 'Project name', true), 'Project name', 160),
    client: limited(text(body.client, 'Client', true), 'Client', 160),
    objective: limited(text(body.objective, 'Objective', true), 'Objective', 2000),
    description: limited(text(body.description, 'Description'), 'Description', 4000),
    targetAudience: limited(text(body.targetAudience, 'Target audience', true), 'Target audience', 1000),
    startDate,
    endDate,
    recruitmentTarget: wholeNumber(body.recruitmentTarget, 'Recruitment target', 1, 100000),
    status: oneOf(text(body.status, 'Status', true), PROJECT_STATUSES, 'Status', true),
    allowRepeat: flag(body.allowRepeat),
  };
}

export function participationInput(body: Record<string, unknown>) {
  const incentiveType = text(body.incentiveType, 'Incentive');
  const normalizedType = !incentiveType || incentiveType === 'None' ? '' : oneOf(incentiveType, INCENTIVE_TYPES, 'Incentive', true);
  const amountText = text(body.incentiveAmount, 'Incentive amount');
  return {
    participantId: text(body.participantId, 'Participant', true),
    projectId: text(body.projectId, 'Research project', true),
    participationDate: isoDate(body.participationDate, 'Participation date', true),
    method: limited(text(body.method, 'Participation method', true), 'Participation method', 80),
    status: oneOf(text(body.status, 'Participation status', true), PARTICIPATION_STATUSES, 'Participation status', true),
    notes: limited(text(body.notes, 'Notes'), 'Notes', 4000),
    incentiveType: normalizedType,
    incentiveAmount: normalizedType ? wholeNumber(amountText || body.incentiveAmount, 'Incentive amount', 0, 10000) : 0,
    incentiveDescription: limited(text(body.incentiveDescription, 'Incentive description'), 'Incentive description', 300),
  };
}

export function surveyInput(body: Record<string, unknown>) {
  return {
    name: limited(text(body.name, 'Survey name', true), 'Survey name', 160),
    description: limited(text(body.description, 'Description'), 'Description', 2000),
    projectId: text(body.projectId, 'Research project'),
    estimatedDuration: wholeNumber(body.estimatedDuration, 'Estimated duration', 1, 600),
    status: oneOf(text(body.status, 'Status', true), SURVEY_STATUSES, 'Status', true),
  };
}

export function screenerInput(body: Record<string, unknown>) {
  return {
    name: limited(text(body.name, 'Screener name', true), 'Screener name', 160),
    description: limited(text(body.description, 'Description'), 'Description', 2000),
    projectId: text(body.projectId, 'Research project'),
    status: oneOf(text(body.status, 'Status', true), SCREENER_STATUSES, 'Status', true),
  };
}

export function incentiveInput(body: Record<string, unknown>) {
  return {
    participantId: text(body.participantId, 'Participant', true),
    projectId: text(body.projectId, 'Research project', true),
    participationId: text(body.participationId, 'Participation'),
    incentiveType: oneOf(text(body.incentiveType, 'Type', true), INCENTIVE_TYPES, 'Type', true),
    amount: wholeNumber(body.amount, 'Amount', 0, 10000),
    description: limited(text(body.description, 'Description', true), 'Description', 300),
    status: oneOf(text(body.status, 'Status', true), INCENTIVE_STATUSES, 'Status', true),
    notes: limited(text(body.notes, 'Notes'), 'Notes', 2000),
  };
}

export function qualificationInput(body: unknown): QualificationConfig {
  const config = parseQualificationConfig(body);
  if ((config.qualifiedReason ?? '').length > 300) throw new ResearchError('The qualified reason is too long.');
  config.rules.forEach((rule) => {
    if (!rule.question.trim()) throw new ResearchError('Each qualification rule needs a question name.');
    if (!RULE_OPERATORS.includes(rule.operator)) throw new ResearchError('A qualification rule uses an unknown operator.');
    if (!rule.reason.trim()) throw new ResearchError('Each qualification rule needs a reason.');
    if (rule.reason.length > 300) throw new ResearchError('A qualification reason is too long.');
  });
  return config;
}
