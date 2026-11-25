import { QUALIFICATION_STATUSES, RULE_OPERATORS } from './constants';

export type RuleOperator = (typeof RULE_OPERATORS)[number];
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];

export interface QualificationRule {
  id: string;
  question: string;
  operator: RuleOperator;
  expected: string;
  failStatus: 'Disqualified' | 'Pending review';
  reason: string;
}

export interface QualificationConfig {
  qualifiedReason?: string;
  rules: QualificationRule[];
}

export interface QualificationResult {
  qualificationStatus: QualificationStatus;
  reason: string;
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function matches(rule: QualificationRule, value: unknown): boolean {
  const text = asText(value).trim();
  const expected = (rule.expected ?? '').trim();
  const list = expected
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  switch (rule.operator) {
    case 'eq':
      return text === expected;
    case 'neq':
      return text !== expected;
    case 'in':
      return list.includes(text);
    case 'nin':
      return !list.includes(text);
    case 'empty':
      return text === '';
    case 'notEmpty':
      return text !== '';
    default:
      return true;
  }
}

export function evaluateQualification(config: QualificationConfig, data: Record<string, unknown>): QualificationResult {
  const rules = Array.isArray(config?.rules) ? config.rules : [];
  if (rules.length === 0) {
    return { qualificationStatus: 'Pending review', reason: 'No qualification rules are configured.' };
  }
  const failures = rules.filter((rule) => !matches(rule, data?.[rule.question]));
  const disqualified = failures.filter((rule) => rule.failStatus === 'Disqualified');
  if (disqualified.length) {
    return { qualificationStatus: 'Disqualified', reason: disqualified.map((rule) => rule.reason).filter(Boolean).join(' ') };
  }
  if (failures.length) {
    return { qualificationStatus: 'Pending review', reason: failures.map((rule) => rule.reason).filter(Boolean).join(' ') };
  }
  return { qualificationStatus: 'Qualified', reason: config.qualifiedReason?.trim() || 'Matches qualification rules.' };
}

export function parseQualificationConfig(value: unknown): QualificationConfig {
  const source = value && typeof value === 'object' ? (value as QualificationConfig) : { rules: [] };
  const rules = Array.isArray(source.rules) ? source.rules : [];
  return {
    qualifiedReason: typeof source.qualifiedReason === 'string' ? source.qualifiedReason : '',
    rules: rules.map((rule, index) => ({
      id: typeof rule?.id === 'string' && rule.id ? rule.id : `rule-${index + 1}`,
      question: typeof rule?.question === 'string' ? rule.question : '',
      operator: RULE_OPERATORS.includes(rule?.operator) ? rule.operator : 'eq',
      expected: typeof rule?.expected === 'string' ? rule.expected : '',
      failStatus: rule?.failStatus === 'Pending review' ? 'Pending review' : 'Disqualified',
      reason: typeof rule?.reason === 'string' ? rule.reason : '',
    })),
  };
}
