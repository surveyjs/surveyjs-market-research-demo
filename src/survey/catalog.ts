import {
  AGE_BRACKETS,
  CONSENT_STATUSES,
  DEVICES,
  INCENTIVE_STATUSES,
  INCENTIVE_TYPES,
  INCOME_RANGES,
  PARTICIPANT_STATUSES,
  PARTICIPATION_METHODS,
  PARTICIPATION_STATUSES,
  PROJECT_STATUSES,
  RECRUITMENT_SOURCES,
  SCREENER_STATUSES,
  SEGMENTS,
  SHOPPING_CHANNELS,
  SHOPPING_FREQUENCIES,
  SURVEY_STATUSES,
  YES_NO,
} from '../domain/constants';
import { QualificationConfig } from '../domain/qualify';
import { FormDefinition, FormId } from '../types/forms';

function choices(values: readonly string[]) {
  return values.map((value) => ({ value, text: value }));
}

function dropdown(name: string, title: string, values: readonly string[], required = false) {
  return { type: 'dropdown', name, title, isRequired: required, choices: choices(values), placeholder: 'Select...' };
}

function radio(name: string, title: string, values: readonly string[], required = false) {
  return { type: 'radiogroup', name, title, isRequired: required, choices: choices(values) };
}

const base = { showQuestionNumbers: 'off', questionErrorLocation: 'bottom', widthMode: 'responsive' };

export const FORM_DEFINITIONS: FormDefinition[] = [
  {
    id: 'login',
    name: 'Sign in',
    description: 'Demo account sign-in.',
    formType: 'login',
    schema: {
      ...base,
      title: 'Sign in',
      completeText: 'Sign in',
      pages: [
        {
          name: 'sign-in',
          elements: [
            {
              type: 'dropdown',
              name: 'username',
              title: 'Account',
              isRequired: true,
              placeholder: 'Choose a demo account',
              choicesByUrl: { url: '/api/auth/roster', valueName: 'username', titleName: 'label' },
            },
            {
              type: 'text',
              name: 'password',
              title: 'Password',
              isRequired: true,
              inputType: 'password',
              description: 'Every demo password is demo1234.',
            },
            { type: 'boolean', name: 'remember_me', title: 'Keep me signed in on this device', defaultValue: false },
          ],
        },
      ],
    },
  },
  {
    id: 'participant-search',
    name: 'Participant search',
    description: 'Search by surname, participant ID, or email.',
    formType: 'search',
    schema: {
      ...base,
      title: 'Find a participant',
      completeText: 'Search',
      pages: [
        {
          name: 'search',
          elements: [
            { type: 'text', name: 'surname', title: 'Surname', placeholder: 'Thompson' },
            { type: 'text', name: 'participantId', title: 'Participant ID', placeholder: 'P-10481' },
            { type: 'text', name: 'email', title: 'Email', placeholder: 'emma.thompson@example.com' },
          ],
        },
      ],
    },
  },
  {
    id: 'participant',
    name: 'Participant',
    description: 'Register or edit a research participant.',
    formType: 'participant',
    schema: {
      ...base,
      title: 'Participant',
      completeText: 'Save participant',
      pages: [
        {
          name: 'personal',
          title: 'Personal information',
          elements: [
            { type: 'text', name: 'firstName', title: 'First name', isRequired: true },
            { type: 'text', name: 'lastName', title: 'Last name', isRequired: true },
            { type: 'text', name: 'dateOfBirth', title: 'Date of birth', inputType: 'date', isRequired: true },
            { type: 'text', name: 'participantCode', title: 'Participant ID', description: 'Leave blank to generate an ID.' },
          ],
        },
        {
          name: 'contact',
          title: 'Contact information',
          elements: [
            { type: 'text', name: 'email', title: 'Email', inputType: 'email', isRequired: true, validators: [{ type: 'email' }] },
            { type: 'text', name: 'phone', title: 'Phone' },
            { type: 'text', name: 'city', title: 'City', isRequired: true },
          ],
        },
        {
          name: 'research',
          title: 'Research profile',
          elements: [
            { type: 'text', name: 'occupation', title: 'Occupation' },
            dropdown('preferredDevice', 'Preferred device', DEVICES, true),
            dropdown('shoppingFrequency', 'Shopping frequency', SHOPPING_FREQUENCIES, true),
            dropdown('recruitmentSource', 'Recruitment source', RECRUITMENT_SOURCES, true),
            dropdown('consentStatus', 'Consent status', CONSENT_STATUSES, true),
            dropdown('status', 'Status', PARTICIPANT_STATUSES, true),
            dropdown('segment', 'Segment', SEGMENTS, true),
            { type: 'comment', name: 'researchNotes', title: 'Research notes', rows: 3 },
          ],
        },
      ],
    },
  },
  {
    id: 'participation',
    name: 'Study participation',
    description: 'Add a participant to a research study.',
    formType: 'participation',
    schema: {
      ...base,
      title: 'Add study participation',
      completeText: 'Save participation',
      pages: [
        {
          name: 'participation',
          elements: [
            {
              type: 'dropdown',
              name: 'participantId',
              title: 'Participant',
              isRequired: true,
              choicesByUrl: { url: '/api/participants/choices', valueName: 'value', titleName: 'text' },
            },
            {
              type: 'dropdown',
              name: 'projectId',
              title: 'Research project',
              isRequired: true,
              choicesByUrl: { url: '/api/projects/choices', valueName: 'value', titleName: 'text' },
            },
            radio('method', 'Participation method', PARTICIPATION_METHODS, true),
            { type: 'text', name: 'participationDate', title: 'Participation date', inputType: 'date', isRequired: true },
            dropdown('status', 'Participation status', PARTICIPATION_STATUSES, true),
            dropdown('incentiveType', 'Incentive', ['None', ...INCENTIVE_TYPES], false),
            {
              type: 'text',
              name: 'incentiveAmount',
              title: 'Incentive amount (£)',
              inputType: 'number',
              visibleIf: "{incentiveType} notempty and {incentiveType} <> 'None'",
              isRequired: false,
            },
            { type: 'text', name: 'incentiveDescription', title: 'Incentive description' },
            { type: 'comment', name: 'notes', title: 'Notes', rows: 3 },
          ],
        },
      ],
    },
  },
  {
    id: 'project',
    name: 'Research project',
    description: 'Create or edit a research project.',
    formType: 'project',
    schema: {
      ...base,
      title: 'Research project',
      completeText: 'Save project',
      pages: [
        {
          name: 'project',
          elements: [
            { type: 'text', name: 'name', title: 'Project name', isRequired: true },
            { type: 'text', name: 'client', title: 'Client', isRequired: true },
            { type: 'comment', name: 'objective', title: 'Objective', isRequired: true, rows: 3 },
            { type: 'comment', name: 'description', title: 'Description', rows: 2 },
            { type: 'comment', name: 'targetAudience', title: 'Target audience', isRequired: true, rows: 2 },
            { type: 'text', name: 'startDate', title: 'Fieldwork start', inputType: 'date', isRequired: true },
            { type: 'text', name: 'endDate', title: 'Fieldwork end', inputType: 'date' },
            { type: 'text', name: 'recruitmentTarget', title: 'Recruitment target', inputType: 'number', isRequired: true, min: 1 },
            dropdown('status', 'Status', PROJECT_STATUSES, true),
            { type: 'boolean', name: 'allowRepeat', title: 'Allow the same participant to join this project more than once', defaultValue: false },
          ],
        },
      ],
    },
  },
  {
    id: 'survey-details',
    name: 'Survey details',
    description: 'Name, project, and duration for a questionnaire.',
    formType: 'survey',
    schema: {
      ...base,
      title: 'Survey details',
      completeText: 'Save survey',
      pages: [
        {
          name: 'survey',
          elements: [
            { type: 'text', name: 'name', title: 'Survey name', isRequired: true },
            { type: 'comment', name: 'description', title: 'Description', rows: 2 },
            {
              type: 'dropdown',
              name: 'projectId',
              title: 'Research project',
              choicesByUrl: { url: '/api/projects/choices', valueName: 'value', titleName: 'text' },
              allowClear: true,
            },
            { type: 'text', name: 'estimatedDuration', title: 'Estimated duration (minutes)', inputType: 'number', isRequired: true, min: 1 },
            dropdown('status', 'Status', SURVEY_STATUSES, true),
          ],
        },
      ],
    },
  },
  {
    id: 'screener-details',
    name: 'Screener details',
    description: 'Name and project for a screening form.',
    formType: 'screener',
    schema: {
      ...base,
      title: 'Screener details',
      completeText: 'Save screener',
      pages: [
        {
          name: 'screener',
          elements: [
            { type: 'text', name: 'name', title: 'Screener name', isRequired: true },
            { type: 'comment', name: 'description', title: 'Description', rows: 2 },
            {
              type: 'dropdown',
              name: 'projectId',
              title: 'Research project',
              choicesByUrl: { url: '/api/projects/choices', valueName: 'value', titleName: 'text' },
              allowClear: true,
            },
            dropdown('status', 'Status', SCREENER_STATUSES, true),
          ],
        },
      ],
    },
  },
  {
    id: 'incentive',
    name: 'Incentive',
    description: 'Record a voucher, cash payment, or gift card.',
    formType: 'incentive',
    schema: {
      ...base,
      title: 'Incentive',
      completeText: 'Save incentive',
      pages: [
        {
          name: 'incentive',
          elements: [
            {
              type: 'dropdown',
              name: 'participantId',
              title: 'Participant',
              isRequired: true,
              choicesByUrl: { url: '/api/participants/choices', valueName: 'value', titleName: 'text' },
            },
            {
              type: 'dropdown',
              name: 'projectId',
              title: 'Research project',
              isRequired: true,
              choicesByUrl: { url: '/api/projects/choices', valueName: 'value', titleName: 'text' },
            },
            dropdown('incentiveType', 'Type', INCENTIVE_TYPES, true),
            { type: 'text', name: 'amount', title: 'Amount (£)', inputType: 'number', isRequired: true, min: 0 },
            { type: 'text', name: 'description', title: 'Description', isRequired: true },
            dropdown('status', 'Status', INCENTIVE_STATUSES, true),
            { type: 'comment', name: 'notes', title: 'Notes', rows: 2 },
          ],
        },
      ],
    },
  },
  {
    id: 'note',
    name: 'Research note',
    description: 'Add a note to a participant profile.',
    formType: 'note',
    schema: {
      ...base,
      title: 'Research note',
      completeText: 'Save note',
      pages: [
        {
          name: 'note',
          elements: [{ type: 'comment', name: 'note', title: 'Note', isRequired: true, rows: 4 }],
        },
      ],
    },
  },
];

export const FORM_BY_ID = Object.fromEntries(FORM_DEFINITIONS.map((form) => [form.id, form])) as Record<FormId, FormDefinition>;

export function blankQuestionnaire(title: string, questionTitle: string): Record<string, unknown> {
  return {
    title,
    showQuestionNumbers: 'off',
    pages: [
      {
        name: 'page1',
        elements: [{ type: 'comment', name: 'response', title: questionTitle, isRequired: true }],
      },
    ],
  };
}

function screenerPage(name: string, title: string, elements: Record<string, unknown>[]) {
  return {
    title,
    showQuestionNumbers: 'off',
    completeText: 'Submit screener',
    pages: [{ name, title, elements }],
  };
}

export const HOLIDAY_SCREENER_SCHEMA = screenerPage('eligibility', 'Holiday shopper eligibility', [
  { type: 'text', name: 'participantCode', title: 'Participant ID', readOnly: true },
  radio('ageBracket', 'Age bracket', AGE_BRACKETS, true),
  radio('shoppingChannel', 'Primary shopping channel', SHOPPING_CHANNELS, true),
  dropdown('income', 'Household income range', INCOME_RANGES, true),
  radio('consent', 'Consent to be contacted', YES_NO, true),
  radio('followUp', 'Interest in a follow-up interview', YES_NO, true),
]);

export const BANKING_SCREENER_SCHEMA = screenerPage('banking', 'Mobile banking eligibility', [
  { type: 'text', name: 'participantCode', title: 'Participant ID', readOnly: true },
  radio('ageBracket', 'Age bracket', AGE_BRACKETS, true),
  radio('mobileBanking', 'Do you use a mobile banking app?', YES_NO, true),
  radio('weeklyUse', 'Do you use mobile banking at least weekly?', YES_NO, true),
  radio('consent', 'Consent to be contacted', YES_NO, true),
]);

export const SNACK_SCREENER_SCHEMA = screenerPage('snacks', 'Healthy snack buyer', [
  { type: 'text', name: 'participantCode', title: 'Participant ID', readOnly: true },
  radio('ageBracket', 'Age bracket', AGE_BRACKETS, true),
  radio('snackFrequency', 'How often do you buy snacks?', SHOPPING_FREQUENCIES, true),
  radio('consent', 'Consent to be contacted', YES_NO, true),
]);

export const AGE_SCREENER_SCHEMA = screenerPage('age', 'Age eligibility', [
  { type: 'text', name: 'participantCode', title: 'Participant ID', readOnly: true },
  radio('ageBracket', 'Age bracket', AGE_BRACKETS, true),
]);

export const CATEGORY_SCREENER_SCHEMA = screenerPage('category', 'Category interest', [
  { type: 'text', name: 'participantCode', title: 'Participant ID', readOnly: true },
  radio('interest', 'Are you interested in this product category?', YES_NO, true),
  radio('consent', 'Consent to be contacted', YES_NO, true),
]);

export const SHOPPING_SURVEY_SCHEMA = {
  title: 'Main Shopping Habits Survey',
  description: 'Holiday shopping habits and purchase drivers.',
  showQuestionNumbers: 'off',
  completeText: 'Submit survey',
  pages: [
    {
      name: 'habits',
      title: 'Shopping habits',
      elements: [
        dropdown('shoppingFrequency', 'How often do you shop?', SHOPPING_FREQUENCIES, true),
        radio('primaryChannel', 'Where do you do most of your shopping?', SHOPPING_CHANNELS, true),
        {
          type: 'text',
          name: 'holidayBudget',
          title: 'Planned holiday spending (£)',
          inputType: 'number',
          isRequired: true,
          min: 0,
        },
        {
          type: 'checkbox',
          name: 'categories',
          title: 'Which categories will you shop?',
          isRequired: true,
          choices: ['Gifts', 'Food', 'Electronics', 'Clothing', 'Travel'],
        },
      ],
    },
    {
      name: 'drivers',
      title: 'Purchase drivers',
      elements: [
        {
          type: 'comment',
          name: 'premiumDrivers',
          title: 'What would make you spend more than £200?',
          isRequired: true,
          visibleIf: '{holidayBudget} >= 200',
        },
        { type: 'comment', name: 'otherDrivers', title: 'Anything else that influences the choice?', rows: 3 },
      ],
    },
  ],
};

export const BRAND_SURVEY_SCHEMA = {
  title: 'Brand Perception Survey',
  showQuestionNumbers: 'off',
  completeText: 'Submit survey',
  pages: [
    {
      name: 'brand',
      elements: [
        radio('awareness', 'Have you heard of this brand?', YES_NO, true),
        { type: 'rating', name: 'nps', title: 'How likely are you to recommend it?', rateMin: 0, rateMax: 10, isRequired: true },
        { type: 'comment', name: 'perception', title: 'Describe the brand in a sentence', isRequired: true },
      ],
    },
  ],
};

export const FEEDBACK_SURVEY_SCHEMA = {
  title: 'Post-Study Feedback',
  showQuestionNumbers: 'off',
  completeText: 'Submit feedback',
  pages: [
    {
      name: 'feedback',
      elements: [
        { type: 'rating', name: 'satisfaction', title: 'How was the session?', rateMin: 1, rateMax: 5, isRequired: true },
        radio('recommendAgain', 'Would you join another study?', YES_NO, true),
        {
          type: 'comment',
          name: 'againDetail',
          title: 'What should we keep the same?',
          visibleIf: "{recommendAgain} = 'Yes'",
        },
      ],
    },
  ],
};

export const HOLIDAY_RULES: QualificationConfig = {
  qualifiedReason: 'Matches target audience',
  rules: [
    { id: 'consent', question: 'consent', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Consent was not granted' },
    {
      id: 'channel',
      question: 'shoppingChannel',
      operator: 'in',
      expected: 'Online, Both equally',
      failStatus: 'Disqualified',
      reason: 'Does not shop online',
    },
    { id: 'age', question: 'ageBracket', operator: 'neq', expected: '55+', failStatus: 'Disqualified', reason: 'Outside age range' },
  ],
};

export const BANKING_RULES: QualificationConfig = {
  qualifiedReason: 'Uses mobile banking weekly',
  rules: [
    { id: 'consent', question: 'consent', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Consent was not granted' },
    { id: 'app', question: 'mobileBanking', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Does not use mobile banking' },
    { id: 'weekly', question: 'weeklyUse', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Does not use mobile banking weekly' },
  ],
};

export const SNACK_RULES: QualificationConfig = {
  qualifiedReason: 'Buys snacks weekly in the target age band',
  rules: [
    { id: 'consent', question: 'consent', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Consent was not granted' },
    { id: 'age', question: 'ageBracket', operator: 'in', expected: '25–34, 35–44', failStatus: 'Disqualified', reason: 'Outside age range' },
    {
      id: 'freq',
      question: 'snackFrequency',
      operator: 'eq',
      expected: 'Weekly',
      failStatus: 'Pending review',
      reason: 'Does not buy snacks weekly',
    },
  ],
};

export const AGE_RULES: QualificationConfig = {
  qualifiedReason: 'Inside the requested age range',
  rules: [{ id: 'age', question: 'ageBracket', operator: 'eq', expected: '18–24', failStatus: 'Disqualified', reason: 'Outside age range' }],
};

export const CATEGORY_RULES: QualificationConfig = {
  qualifiedReason: 'Interested in category',
  rules: [
    { id: 'interest', question: 'interest', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Not interested in the category' },
    { id: 'consent', question: 'consent', operator: 'eq', expected: 'Yes', failStatus: 'Disqualified', reason: 'Consent was not granted' },
  ],
};
