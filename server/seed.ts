import type Database from 'better-sqlite3';
import { DEMO_PASSWORD } from '../src/domain/constants';
import {
  AGE_RULES,
  AGE_SCREENER_SCHEMA,
  BANKING_RULES,
  BANKING_SCREENER_SCHEMA,
  BRAND_SURVEY_SCHEMA,
  CATEGORY_RULES,
  CATEGORY_SCREENER_SCHEMA,
  FEEDBACK_SURVEY_SCHEMA,
  FORM_DEFINITIONS,
  HOLIDAY_RULES,
  HOLIDAY_SCREENER_SCHEMA,
  SHOPPING_SURVEY_SCHEMA,
  SNACK_RULES,
  SNACK_SCREENER_SCHEMA,
} from '../src/survey/catalog';
import { hashPassword } from './password';

type Sql = Database.Database;

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function seedDatabase(db: Sql): void {
  const run = (sql: string, ...params: unknown[]) => db.prepare(sql).run(...params);
  const password = hashPassword(DEMO_PASSWORD);
  const users = [
    ['user-maya', 'maya.collins', 'Maya Collins', 'administrator', 1],
    ['user-owen', 'owen.blake', 'Owen Blake', 'research_manager', 2],
    ['user-priya', 'priya.shah', 'Priya Shah', 'researcher', 3],
    ['user-noah', 'noah.grant', 'Noah Grant', 'readonly', 4],
  ];
  for (const [id, username, fullName, role, seq] of users) {
    run(
      `INSERT INTO users (id, username, password_hash, full_name, role, seq) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      username,
      password,
      fullName,
      role,
      seq,
    );
  }

  const projects: unknown[][] = [
    ['proj-holiday', 'Holiday Shopping Study 2026', 'Northstar Retail', 'Understand holiday shopping habits and purchase drivers', 'Online survey with an optional follow-up interview.', 'Adults 18+ who shop online monthly', '2025-11-01', '2026-01-31', 1, 100, 'Recruiting', 0, 1],
    ['proj-banking', 'Mobile Banking UX Study', 'FinEdge', 'Evaluate mobile banking tasks and usability pain points', 'Moderated remote sessions with weekly mobile-banking users.', 'Adults using mobile banking weekly', '2026-08-12', '2026-09-30', 1, 24, 'Fieldwork', 0, 2],
    ['proj-snacks', 'Healthy Snacks Concept Test', 'GreenBite', 'Assess appeal of three new healthy snack concepts', 'Concept test planned before fieldwork opens.', 'Adults 25–44 who buy snacks weekly', '2026-10-01', '2026-10-31', 0, 40, 'Draft', 0, 3],
    ['proj-brand', 'Brand Tracker', 'Harbor Media', 'Track brand awareness and recommendation', 'Completed quarterly brand measure.', 'Category buyers', '2026-03-01', '2026-03-31', 1, 1, 'Completed', 0, 4],
    ['proj-usability', 'Website Usability Study', 'Northstar Retail', 'Find friction in the purchase journey', 'Remote video interviews.', 'Recent site visitors', '2026-01-01', '2026-01-31', 1, 1, 'Completed', 0, 5],
    ['proj-concept', 'Product Concept Test', 'Fieldnote Labs', 'Test a new product concept with category buyers', 'Invitation wave is open.', 'Adults who shop the category', '2026-10-01', '2026-11-15', 1, 12, 'Recruiting', 0, 6],
  ];
  for (const row of projects) {
    run(
      `INSERT INTO projects (
        id, name, client, objective, description, target_audience, start_date, end_date,
        dates_confirmed, recruitment_target, status, allow_repeat, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-10-01T09:00:00.000Z', '2025-10-01T09:00:00.000Z')`,
      ...row,
    );
  }

  const studies: unknown[][] = [
    ['study-holiday', 'proj-holiday', 'Holiday shopping survey', 'Main holiday habits questionnaire.', 'Online Survey', 20, 'Active'],
    ['study-banking', 'proj-banking', 'Mobile banking sessions', 'Task-based usability sessions.', 'Video Interview', 45, 'Active'],
    ['study-snacks', 'proj-snacks', 'Snack concept test', 'Three-concept appeal test.', 'Online Survey', 15, 'Draft'],
    ['study-brand', 'proj-brand', 'Brand Tracker', 'Brand awareness and recommendation.', 'Online Survey', 12, 'Completed'],
    ['study-usability', 'proj-usability', 'Website Usability Study', 'Remote journey interview.', 'Video Interview', 40, 'Completed'],
    ['study-concept', 'proj-concept', 'Product Concept Test', 'Concept invitation.', 'Online Survey', 15, 'Active'],
  ];
  for (const row of studies) {
    run(
      `INSERT INTO studies (id, project_id, name, description, method, duration_minutes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '2025-10-01T09:00:00.000Z', '2025-10-01T09:00:00.000Z')`,
      ...row,
    );
  }

  const named = [
    ['part-emma', 'P-10481', 'Emma', 'Thompson', '1994-04-18', 'emma.thompson@example.com', '+44 7700 900456', 'Bristol', 'Marketing Specialist', 'Mobile', 'Weekly', 'Referral', 'Consented', 'Active', 'Frequent Online Shopper', 'Prefers evening interviews. Comfortable with remote sessions.', '2025-08-01T10:00:00.000Z'],
    ['part-james', 'P-10490', 'James', 'Okonkwo', '1988-02-02', 'james.okonkwo@example.com', '+44 7700 900190', 'Bristol', 'Civil Engineer', 'Desktop', 'Monthly', 'Website signup', 'Consented', 'Active', 'High Street Regular', '', '2025-09-12T10:00:00.000Z'],
    ['part-sofia', 'P-10492', 'Sofia', 'Alvarez', '1996-11-30', 'sofia.alvarez@example.com', '+44 7700 900192', 'London', 'Teacher', 'Mobile + Laptop', 'Weekly', 'Social media', 'Consented', 'Active', 'Mobile-first Shopper', '', '2025-09-18T10:00:00.000Z'],
    ['part-daniel', 'P-10510', 'Daniel', 'Hughes', '1979-07-09', 'daniel.hughes@example.com', '+44 7700 900210', 'Manchester', 'Accountant', 'Laptop', 'Occasionally', 'Panel partner', 'Pending', 'Inactive', 'Occasional Buyer', '', '2026-01-04T10:00:00.000Z'],
    ['part-hannah', 'P-10522', 'Hannah', 'Brooks', '1991-12-21', 'hannah.brooks@example.com', '+44 7700 900222', 'Cardiff', 'Nurse', 'Tablet', 'Monthly', 'Referral', 'Consented', 'Active', 'High Street Regular', 'Screened out of the holiday study.', '2025-11-02T10:00:00.000Z'],
  ];
  for (const row of named) {
    run(
      `INSERT INTO participants (
        id, participant_code, first_name, last_name, date_of_birth, email, phone, city, occupation,
        preferred_device, shopping_frequency, recruitment_source, consent_status, status, segment,
        research_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...row,
      row[16],
    );
  }

  const firstNames = ['Ava', 'Noah', 'Mia', 'Leo', 'Isla', 'Jack', 'Freya', 'Oscar', 'Lily', 'Harry', 'Grace', 'George', 'Chloe', 'Charlie', 'Ella'];
  const lastNames = ['Bennett', 'Clarke', 'Dawson', 'Ellis', 'Foster', 'Graham', 'Irving', 'Jenkins', 'Knight', 'Lambert', 'Morris', 'Nash', 'Palmer', 'Quinn', 'Reed', 'Shaw', 'Turner', 'Walsh', 'Ahmed', 'Khan'];
  const cities = ['London', 'Manchester', 'Bristol', 'Leeds', 'Cardiff', 'Edinburgh', 'Birmingham'];
  const segments = ['Frequent Online Shopper', 'High Street Regular', 'Occasional Buyer', 'Mobile-first Shopper'];
  const devices = ['Mobile', 'Desktop', 'Laptop', 'Mobile + Laptop', 'Tablet'];
  const jobs = ['Retail Buyer', 'Software Engineer', 'Nurse', 'Teacher', 'Designer', 'Analyst', 'Chef', 'Driver'];
  const methods = ['Online Survey', 'Video Interview', 'Focus Group', 'In-person Interview'];
  const statuses = ['Completed', 'Completed', 'Scheduled', 'Invited'];

  for (let index = 0; index < 60; index += 1) {
    const holiday = index < 42;
    const id = `gen-p-${index}`;
    const code = `P-${20000 + index}`;
    const first = firstNames[index % firstNames.length];
    const last = lastNames[index % lastNames.length];
    const year = 1976 + (index % 28);
    const month = String((index % 12) + 1).padStart(2, '0');
    const day = String((index % 27) + 1).padStart(2, '0');
    run(
      `INSERT INTO participants (
        id, participant_code, first_name, last_name, date_of_birth, email, phone, city, occupation,
        preferred_device, shopping_frequency, recruitment_source, consent_status, status, segment,
        research_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Weekly', 'Panel partner', 'Consented', 'Active', ?, '', ?, ?)`,
      id,
      code,
      first,
      last,
      `${year}-${month}-${day}`,
      `panel.${code.toLowerCase()}@example.com`,
      `+44 7700 ${String(100000 + index).slice(0, 6)}`,
      cities[index % cities.length],
      jobs[index % jobs.length],
      devices[index % devices.length],
      segments[index % segments.length],
      '2025-10-15T09:00:00.000Z',
      '2025-10-15T09:00:00.000Z',
    );

    const status = statuses[index % statuses.length];
    const method = holiday ? methods[index % methods.length] : 'Video Interview';
    const date = holiday ? addDays('2025-11-01', index % 80) : addDays('2026-08-12', index % 40);
    const amount = method === 'Video Interview' || method === 'In-person Interview' ? 40 : method === 'Focus Group' ? 30 : 15;
    const incentiveType = amount === 40 ? 'Cash' : 'Voucher';
    const incentiveStatus = status === 'Completed' ? 'Issued' : status === 'Scheduled' ? 'Approved' : 'Pending';
    const description = amount === 40 ? `£${amount}` : `£${amount} voucher`;
    const projectId = holiday ? 'proj-holiday' : 'proj-banking';
    const studyId = holiday ? 'study-holiday' : 'study-banking';
    run(
      `INSERT INTO participations (
        id, participant_id, project_id, study_id, participation_date, method, status, incentive_description, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
      `gen-pa-${index}`,
      id,
      projectId,
      studyId,
      date,
      method,
      status,
      description,
      `${date}T12:00:00.000Z`,
      `${date}T12:00:00.000Z`,
    );
    run(
      `INSERT INTO incentives (
        id, participation_id, participant_id, project_id, incentive_type, amount, description, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
      `gen-inc-${index}`,
      `gen-pa-${index}`,
      id,
      projectId,
      incentiveType,
      amount,
      description,
      incentiveStatus,
      `${date}T12:00:00.000Z`,
      `${date}T12:00:00.000Z`,
    );
  }

  const emmaParts: unknown[][] = [
    ['pa-emma-brand', 'part-emma', 'proj-brand', 'study-brand', '2026-03-15', 'Online Survey', 'Completed', '£15 voucher', ''],
    ['pa-emma-web', 'part-emma', 'proj-usability', 'study-usability', '2026-01-20', 'Video Interview', 'Completed', '£40', ''],
    ['pa-emma-concept', 'part-emma', 'proj-concept', 'study-concept', '2026-10-08', 'Online Survey', 'Invited', '£20 voucher', 'Invitation sent by email.'],
  ];
  for (const row of emmaParts) {
    run(
      `INSERT INTO participations (
        id, participant_id, project_id, study_id, participation_date, method, status, incentive_description, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...row,
      `${row[4]}T15:00:00.000Z`,
      `${row[4]}T15:00:00.000Z`,
    );
  }
  const emmaIncentives: unknown[][] = [
    ['inc-emma-brand', 'pa-emma-brand', 'part-emma', 'proj-brand', 'Voucher', 15, '£15 voucher', 'Issued'],
    ['inc-emma-web', 'pa-emma-web', 'part-emma', 'proj-usability', 'Cash', 40, '£40', 'Issued'],
    ['inc-emma-concept', 'pa-emma-concept', 'part-emma', 'proj-concept', 'Voucher', 20, '£20 voucher', 'Pending'],
  ];
  for (const row of emmaIncentives) {
    run(
      `INSERT INTO incentives (
        id, participation_id, participant_id, project_id, incentive_type, amount, description, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '2026-03-15T15:00:00.000Z', '2026-03-15T15:00:00.000Z')`,
      ...row,
    );
  }

  const notes: unknown[][] = [
    ['note-1', 'part-emma', 'user-maya', 'Prefers evening interviews', '2026-01-12T18:10:00.000Z'],
    ['note-2', 'part-emma', 'user-owen', 'Owns iPhone and Windows laptop', '2026-03-16T11:00:00.000Z'],
    ['note-3', 'part-emma', 'user-maya', 'Comfortable with remote sessions', '2026-06-02T09:30:00.000Z'],
    ['note-4', 'part-emma', 'user-priya', 'Engaged and provides detailed feedback', '2026-10-09T16:45:00.000Z'],
  ];
  for (const row of notes) {
    run(
      `INSERT INTO participant_notes (id, participant_id, author_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ...row,
      row[4],
    );
  }

  const surveys: unknown[][] = [
    ['survey-shopping', 'Main Shopping Habits Survey', 'Holiday shopping habits and purchase drivers.', 'proj-holiday', JSON.stringify(SHOPPING_SURVEY_SCHEMA), 12, 'Active', '2025-10-20T09:00:00.000Z', '2026-01-08T09:00:00.000Z'],
    ['survey-brand', 'Brand Perception Survey', 'Awareness and recommendation for the tracked brand.', 'proj-brand', JSON.stringify(BRAND_SURVEY_SCHEMA), 8, 'Active', '2026-02-01T09:00:00.000Z', '2026-03-01T09:00:00.000Z'],
    ['survey-feedback', 'Post-Study Feedback', 'Short follow-up after a session.', 'proj-holiday', JSON.stringify(FEEDBACK_SURVEY_SCHEMA), 5, 'Draft', '2026-01-15T09:00:00.000Z', '2026-01-15T09:00:00.000Z'],
  ];
  for (const row of surveys) {
    run(
      `INSERT INTO surveys (id, name, description, project_id, schema_json, estimated_duration, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'user-maya', ?, ?)`,
      ...row,
    );
  }

  const screeners: unknown[][] = [
    ['scr-holiday', 'Holiday Shopper Screener', 'Checks age, online shopping, and consent for the holiday study.', 'proj-holiday', JSON.stringify(HOLIDAY_SCREENER_SCHEMA), JSON.stringify(HOLIDAY_RULES), 'Active', '2025-10-18T09:00:00.000Z', '2026-01-10T09:00:00.000Z'],
    ['scr-banking', 'Mobile Banking Screener', 'Confirms weekly mobile banking use.', 'proj-banking', JSON.stringify(BANKING_SCREENER_SCHEMA), JSON.stringify(BANKING_RULES), 'Active', '2026-07-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'],
    ['scr-snacks', 'Snack Buyer Screener', 'Age and weekly snack purchase for the concept test.', 'proj-snacks', JSON.stringify(SNACK_SCREENER_SCHEMA), JSON.stringify(SNACK_RULES), 'Draft', '2026-09-01T09:00:00.000Z', '2026-09-12T09:00:00.000Z'],
    ['scr-age', 'Age Eligibility Check', 'Earlier age gate used before the holiday wave.', null, JSON.stringify(AGE_SCREENER_SCHEMA), JSON.stringify(AGE_RULES), 'Archived', '2025-10-01T09:00:00.000Z', '2025-11-05T09:00:00.000Z'],
    ['scr-category', 'Category Interest Screener', 'Category interest and consent.', null, JSON.stringify(CATEGORY_SCREENER_SCHEMA), JSON.stringify(CATEGORY_RULES), 'Archived', '2025-07-01T09:00:00.000Z', '2025-08-12T09:00:00.000Z'],
  ];
  for (const row of screeners) {
    run(
      `INSERT INTO screeners (id, name, description, project_id, schema_json, rules_json, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'user-maya', ?, ?)`,
      ...row,
    );
  }

  const responses: unknown[][] = [
    ['sr-holiday', 'part-emma', 'scr-holiday', 'proj-holiday', JSON.stringify({ participantCode: 'P-10481', ageBracket: '25–34', shoppingChannel: 'Online', income: '£35,000–£49,999', consent: 'Yes', followUp: 'Yes' }), 'Qualified', 'Matches target audience', '2026-01-10T10:00:00.000Z'],
    ['sr-age', 'part-emma', 'scr-age', null, JSON.stringify({ participantCode: 'P-10481', ageBracket: '25–34' }), 'Disqualified', 'Outside age range', '2025-11-05T10:00:00.000Z'],
    ['sr-category', 'part-emma', 'scr-category', null, JSON.stringify({ participantCode: 'P-10481', interest: 'Yes', consent: 'Yes' }), 'Qualified', 'Interested in category', '2025-08-12T10:00:00.000Z'],
    ['sr-hannah', 'part-hannah', 'scr-holiday', 'proj-holiday', JSON.stringify({ participantCode: 'P-10522', ageBracket: '25–34', shoppingChannel: 'In-store', income: 'Under £35,000', consent: 'Yes', followUp: 'No' }), 'Disqualified', 'Does not shop online', '2025-11-03T10:00:00.000Z'],
  ];
  for (const row of responses) {
    run(
      `INSERT INTO screener_responses (
        id, participant_id, screener_id, project_id, response_json, qualification_status, reason, submitted_by, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'user-maya', ?)`,
      ...row,
    );
  }
  for (let index = 0; index < 5; index += 1) {
    run(
      `INSERT INTO screener_responses (
        id, participant_id, screener_id, project_id, response_json, qualification_status, reason, submitted_by, submitted_at
      ) VALUES (?, ?, 'scr-holiday', 'proj-holiday', ?, 'Qualified', 'Matches target audience', 'user-owen', '2025-11-20T10:00:00.000Z')`,
      `sr-gen-${index}`,
      `gen-p-${index}`,
      JSON.stringify({
        participantCode: `P-${20000 + index}`,
        ageBracket: '25–34',
        shoppingChannel: 'Online',
        income: '£50,000–£74,999',
        consent: 'Yes',
        followUp: 'Yes',
      }),
    );
  }

  run(
    `INSERT INTO survey_responses (id, survey_id, participant_id, project_id, response_json, is_test, submitted_by, submitted_at)
     VALUES ('resp-shopping-1', 'survey-shopping', 'part-emma', 'proj-holiday', ?, 0, 'user-maya', '2026-01-11T12:00:00.000Z')`,
    JSON.stringify({ shoppingFrequency: 'Weekly', primaryChannel: 'Online', holidayBudget: 240, categories: ['Gifts', 'Food'], premiumDrivers: 'Free delivery and a clear returns policy.' }),
  );

  for (const form of FORM_DEFINITIONS) {
    run(
      `INSERT INTO form_templates (id, name, description, form_type, schema_json, version, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 'Active', 'user-maya', '2025-10-01T09:00:00.000Z', '2025-10-01T09:00:00.000Z')`,
      form.id,
      form.name,
      form.description,
      form.formType,
      JSON.stringify(form.schema),
    );
  }
}
