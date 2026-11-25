import { describe, expect, it } from 'vitest';
import { ageBand, ageYears } from '../src/domain/age';
import { evaluateQualification } from '../src/domain/qualify';
import { questionCount } from '../src/domain/questions';

describe('ageBand', () => {
  const today = new Date('2026-11-25T12:00:00');

  it('places Emma Thompson in the 25–34 band', () => {
    expect(ageYears('1994-04-18', today)).toBe(32);
    expect(ageBand('1994-04-18', today)).toBe('25–34');
  });

  it('rejects an under-18 date of birth by band', () => {
    expect(ageBand('2010-01-01', today)).toBe('Under 18');
  });
});

describe('evaluateQualification', () => {
  const config = {
    qualifiedReason: 'Matches target audience',
    rules: [
      { id: 'consent', question: 'consent', operator: 'eq' as const, expected: 'Yes', failStatus: 'Disqualified' as const, reason: 'Consent was not granted' },
      {
        id: 'channel',
        question: 'shoppingChannel',
        operator: 'in' as const,
        expected: 'Online, Both equally',
        failStatus: 'Disqualified' as const,
        reason: 'Does not shop online',
      },
    ],
  };

  it('qualifies a matching response', () => {
    const result = evaluateQualification(config, { consent: 'Yes', shoppingChannel: 'Online' });
    expect(result).toEqual({ qualificationStatus: 'Qualified', reason: 'Matches target audience' });
  });

  it('records a disqualification reason', () => {
    const result = evaluateQualification(config, { consent: 'No', shoppingChannel: 'Online' });
    expect(result.qualificationStatus).toBe('Disqualified');
    expect(result.reason).toBe('Consent was not granted');
  });

  it('returns pending review when a rule asks for review', () => {
    const result = evaluateQualification(
      {
        rules: [
          {
            id: 'freq',
            question: 'snackFrequency',
            operator: 'eq',
            expected: 'Weekly',
            failStatus: 'Pending review',
            reason: 'Does not buy snacks weekly',
          },
        ],
      },
      { snackFrequency: 'Monthly' },
    );
    expect(result).toEqual({ qualificationStatus: 'Pending review', reason: 'Does not buy snacks weekly' });
  });

  it('returns pending review when no rules are configured', () => {
    expect(evaluateQualification({ rules: [] }, { consent: 'Yes' }).qualificationStatus).toBe('Pending review');
  });
});

describe('questionCount', () => {
  it('counts questions and skips panels and html', () => {
    expect(
      questionCount({
        pages: [
          {
            elements: [
              { type: 'text', name: 'city' },
              { type: 'html', name: 'intro', html: '<p>Hi</p>' },
              { type: 'panel', name: 'group', elements: [{ type: 'dropdown', name: 'device' }] },
            ],
          },
        ],
      }),
    ).toBe(2);
  });
});
