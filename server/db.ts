import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { ageBand } from '../src/domain/age';
import { PROJECT_STATUSES, RECRUITED_STATUSES, SCHEMA_VERSION } from '../src/domain/constants';
import { fullName } from '../src/domain/format';
import { questionCount } from '../src/domain/questions';
import { evaluateQualification, parseQualificationConfig, QualificationConfig } from '../src/domain/qualify';
import { FORM_BY_ID } from '../src/survey/catalog';
import { AuthUser, RosterEntry, Session, UserRole } from '../src/types/auth';
import { FormId, StoredForm } from '../src/types/forms';
import {
  Choice,
  Incentive,
  Participant,
  ParticipantNote,
  ParticipantProfile,
  ParticipantSummary,
  Participation,
  Project,
  ProjectDetail,
  ScreenerRecord,
  ScreeningRecord,
  Study,
  SurveyRecord,
  SurveyResponseRecord,
} from '../src/types/research';
import { blankQuestionnaire } from '../src/survey/catalog';
import { ResearchError } from './errors';
import { passwordsMatch } from './password';
import { seedDatabase } from './seed';
import {
  incentiveInput,
  participantInput,
  participationInput,
  projectInput,
  oneOf,
  qualificationInput,
  recordObject,
  schemaObject,
  screenerInput,
  surveyInput,
  text,
} from './validate';

type Row = Record<string, unknown>;

const TABLES = [
  'screener_responses',
  'survey_responses',
  'incentives',
  'participations',
  'participant_notes',
  'screeners',
  'surveys',
  'studies',
  'participants',
  'projects',
  'form_templates',
  'sessions',
  'users',
  'schema_meta',
];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  objective TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  dates_confirmed INTEGER NOT NULL DEFAULT 1,
  recruitment_target INTEGER NOT NULL,
  status TEXT NOT NULL,
  allow_repeat INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_studies_project ON studies(project_id);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  participant_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  preferred_device TEXT NOT NULL DEFAULT '',
  shopping_frequency TEXT NOT NULL DEFAULT '',
  recruitment_source TEXT NOT NULL DEFAULT '',
  consent_status TEXT NOT NULL,
  status TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT '',
  research_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_participants_last_name ON participants(last_name);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);

CREATE TABLE IF NOT EXISTS participations (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  study_id TEXT REFERENCES studies(id),
  participation_date TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  incentive_description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_participations_participant ON participations(participant_id, participation_date);
CREATE INDEX IF NOT EXISTS idx_participations_project ON participations(project_id);

CREATE TABLE IF NOT EXISTS participant_notes (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_participant ON participant_notes(participant_id, created_at);

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  project_id TEXT REFERENCES projects(id),
  schema_json TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surveys_project ON surveys(project_id);

CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES participants(id),
  project_id TEXT REFERENCES projects(id),
  response_json TEXT NOT NULL,
  is_test INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT,
  submitted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id, submitted_at);

CREATE TABLE IF NOT EXISTS screeners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  project_id TEXT REFERENCES projects(id),
  schema_json TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_screeners_project ON screeners(project_id);

CREATE TABLE IF NOT EXISTS screener_responses (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  screener_id TEXT NOT NULL REFERENCES screeners(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id),
  response_json TEXT NOT NULL,
  qualification_status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  submitted_by TEXT,
  submitted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_screener_responses_participant ON screener_responses(participant_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_screener_responses_screener ON screener_responses(screener_id);

CREATE TABLE IF NOT EXISTS incentives (
  id TEXT PRIMARY KEY,
  participation_id TEXT REFERENCES participations(id) ON DELETE SET NULL,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id),
  incentive_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incentives_participant ON incentives(participant_id);
CREATE INDEX IF NOT EXISTS idx_incentives_project ON incentives(project_id, status);

CREATE TABLE IF NOT EXISTS form_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  form_type TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const PROJECT_SELECT = `
SELECT p.*,
  (SELECT COUNT(DISTINCT pa.participant_id) FROM participations pa
    WHERE pa.project_id = p.id AND pa.status IN (${RECRUITED_STATUSES.map(() => '?').join(', ')})) AS recruited
FROM projects p
`;

function str(row: Row, key: string): string {
  const value = row[key];
  return value == null ? '' : String(value);
}

function num(row: Row, key: string): number {
  return Number(row[key] ?? 0);
}

function jsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function like(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

export class ResearchDb {
  constructor(private readonly db: Database.Database) {}

  migrate(): void {
    this.db.exec(SCHEMA_SQL);
    const row = this.db.prepare('SELECT version FROM schema_meta WHERE id = 1').get() as { version: number } | undefined;
    if (!row) this.seed();
    else if (row.version !== SCHEMA_VERSION) this.reset();
  }

  reset(): void {
    this.db.exec('PRAGMA foreign_keys = OFF');
    for (const table of TABLES) this.db.exec(`DROP TABLE IF EXISTS ${table}`);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
    this.seed();
  }

  private seed(): void {
    const run = this.db.transaction(() => {
      seedDatabase(this.db);
      this.db.prepare('INSERT INTO schema_meta (id, version) VALUES (1, ?)').run(SCHEMA_VERSION);
    });
    run();
  }

  roster(): RosterEntry[] {
    const rows = this.db.prepare('SELECT username, full_name, role FROM users ORDER BY seq').all() as Row[];
    return rows.map((row) => ({
      username: str(row, 'username'),
      fullName: str(row, 'full_name'),
      role: str(row, 'role') as UserRole,
      label: `${str(row, 'full_name')} — ${roleLabel(str(row, 'role'))}`,
    }));
  }

  authenticate(username: string, password: string): Session | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim()) as Row | undefined;
    if (!row || !passwordsMatch(password, str(row, 'password_hash'))) return null;
    const token = randomBytes(24).toString('hex');
    this.db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, str(row, 'id'), nowIso());
    return { ...this.mapUser(row), token };
  }

  logout(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  userByToken(token: string): AuthUser | null {
    const row = this.db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      )
      .get(token) as Row | undefined;
    return row ? this.mapUser(row) : null;
  }

  forms(): StoredForm[] {
    return (this.db.prepare('SELECT * FROM form_templates ORDER BY name').all() as Row[]).map((row) => this.mapForm(row));
  }

  saveFormSchema(id: string, schema: unknown, user: AuthUser): StoredForm {
    if (!FORM_BY_ID[id as FormId]) throw new ResearchError('That form was not found.', 404);
    const saved = schemaObject(schema);
    const now = nowIso();
    const result = this.db
      .prepare(
        `UPDATE form_templates SET schema_json = ?, version = version + 1, updated_at = ?, created_by = ? WHERE id = ?`,
      )
      .run(JSON.stringify(saved), now, user.id, id);
    if (result.changes === 0) throw new ResearchError('That form was not found.', 404);
    return this.mapForm(this.must('SELECT * FROM form_templates WHERE id = ?', id, 'Form'));
  }

  listProjects(): Project[] {
    return (this.db.prepare(`${PROJECT_SELECT} ORDER BY p.sort_order, p.name`).all(...RECRUITED_STATUSES) as Row[]).map((row) => this.mapProject(row));
  }

  projectChoices(): Choice[] {
    return (this.db.prepare('SELECT id, name FROM projects ORDER BY sort_order, name').all() as Row[]).map((row) => ({
      value: str(row, 'id'),
      text: str(row, 'name'),
    }));
  }

  getProject(id: string): ProjectDetail {
    const project = this.mapProject(this.must(`${PROJECT_SELECT} WHERE p.id = ?`, id, 'Project', RECRUITED_STATUSES));
    return {
      project,
      studies: this.studies(id),
      surveys: this.listSurveys().filter((item) => item.projectId === id),
      screeners: this.listScreeners().filter((item) => item.projectId === id),
      participants: this.projectParticipants(id),
      participations: this.participations('pa.project_id = ?', id),
      screening: this.screening('sr.project_id = ?', id),
    };
  }

  createProject(body: unknown, _user: AuthUser): ProjectDetail {
    const input = projectInput(recordObject(body));
    const id = randomUUID();
    const now = nowIso();
    const order = num(this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM projects').get() as Row, 'next');
    const save = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO projects (
            id, name, client, objective, description, target_audience, start_date, end_date, dates_confirmed,
            recruitment_target, status, allow_repeat, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.name,
          input.client,
          input.objective,
          input.description,
          input.targetAudience,
          input.startDate,
          input.endDate,
          input.endDate ? 1 : 0,
          input.recruitmentTarget,
          input.status,
          input.allowRepeat ? 1 : 0,
          order,
          now,
          now,
        );
      this.db
        .prepare(
          `INSERT INTO studies (id, project_id, name, description, method, duration_minutes, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Online Survey', 20, ?, ?, ?)`,
        )
        .run(randomUUID(), id, input.name, input.objective, input.status, now, now);
    });
    save();
    return this.getProject(id);
  }

  updateProject(id: string, body: unknown): ProjectDetail {
    this.must('SELECT id FROM projects WHERE id = ?', id, 'Project');
    const input = projectInput(recordObject(body));
    this.db
      .prepare(
        `UPDATE projects SET name = ?, client = ?, objective = ?, description = ?, target_audience = ?, start_date = ?,
         end_date = ?, dates_confirmed = ?, recruitment_target = ?, status = ?, allow_repeat = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.name,
        input.client,
        input.objective,
        input.description,
        input.targetAudience,
        input.startDate,
        input.endDate,
        input.endDate ? 1 : 0,
        input.recruitmentTarget,
        input.status,
        input.allowRepeat ? 1 : 0,
        nowIso(),
        id,
      );
    return this.getProject(id);
  }

  setProjectStatus(id: string, status: string): ProjectDetail {
    this.must('SELECT id FROM projects WHERE id = ?', id, 'Project');
    const next = oneOf(text(status, 'Status', true), PROJECT_STATUSES, 'Status', true);
    this.db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(next, nowIso(), id);
    return this.getProject(id);
  }

  searchParticipants(query: { surname?: string; participantId?: string; email?: string }): ParticipantSummary[] {
    const surname = (query.surname ?? '').trim();
    const participantId = (query.participantId ?? '').trim();
    const email = (query.email ?? '').trim();
    const rows = this.db
      .prepare(
        `SELECT p.*,
          (SELECT st.name FROM participations pa JOIN studies st ON st.id = pa.study_id
            WHERE pa.participant_id = p.id ORDER BY pa.participation_date DESC, pa.created_at DESC LIMIT 1) AS last_study
         FROM participants p
         WHERE (? = '' OR p.last_name LIKE ? ESCAPE '\\' COLLATE NOCASE)
           AND (? = '' OR p.participant_code LIKE ? ESCAPE '\\' COLLATE NOCASE)
           AND (? = '' OR p.email LIKE ? ESCAPE '\\' COLLATE NOCASE)
         ORDER BY p.last_name COLLATE NOCASE, p.first_name COLLATE NOCASE
         LIMIT 300`,
      )
      .all(surname, like(surname), participantId, like(participantId), email, like(email)) as Row[];
    return rows.map((row) => this.mapParticipantSummary(row));
  }

  participantChoices(): Choice[] {
    return (this.db.prepare('SELECT id, first_name, last_name, participant_code FROM participants ORDER BY last_name, first_name').all() as Row[]).map(
      (row) => ({
        value: str(row, 'id'),
        text: `${str(row, 'last_name')}, ${str(row, 'first_name')} (${str(row, 'participant_code')})`,
        code: str(row, 'participant_code'),
      }),
    );
  }

  getParticipant(id: string): ParticipantProfile {
    const row = this.must(
      `SELECT p.*,
        (SELECT st.name FROM participations pa JOIN studies st ON st.id = pa.study_id
          WHERE pa.participant_id = p.id ORDER BY pa.participation_date DESC LIMIT 1) AS last_study
       FROM participants p WHERE p.id = ?`,
      id,
      'Participant',
    );
    return {
      participant: this.mapParticipant(row),
      participations: this.participations('pa.participant_id = ?', id),
      screening: this.screening('sr.participant_id = ?', id),
      notes: this.notes(id),
      incentives: this.listIncentives({ participantId: id }),
    };
  }

  createParticipant(body: unknown): ParticipantProfile {
    const input = participantInput(recordObject(body));
    const id = randomUUID();
    const code = input.participantCode || this.nextParticipantCode();
    this.assertParticipantUnique(code, input.email);
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO participants (
          id, participant_code, first_name, last_name, date_of_birth, email, phone, city, occupation,
          preferred_device, shopping_frequency, recruitment_source, consent_status, status, segment,
          research_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        code,
        input.firstName,
        input.lastName,
        input.dateOfBirth,
        input.email,
        input.phone,
        input.city,
        input.occupation,
        input.preferredDevice,
        input.shoppingFrequency,
        input.recruitmentSource,
        input.consentStatus,
        input.status,
        input.segment,
        input.researchNotes,
        now,
        now,
      );
    return this.getParticipant(id);
  }

  updateParticipant(id: string, body: unknown): ParticipantProfile {
    this.must('SELECT id FROM participants WHERE id = ?', id, 'Participant');
    const input = participantInput(recordObject(body));
    const current = this.must('SELECT participant_code FROM participants WHERE id = ?', id, 'Participant');
    const code = input.participantCode || str(current, 'participant_code');
    this.assertParticipantUnique(code, input.email, id);
    this.db
      .prepare(
        `UPDATE participants SET participant_code = ?, first_name = ?, last_name = ?, date_of_birth = ?, email = ?, phone = ?,
         city = ?, occupation = ?, preferred_device = ?, shopping_frequency = ?, recruitment_source = ?, consent_status = ?,
         status = ?, segment = ?, research_notes = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        code,
        input.firstName,
        input.lastName,
        input.dateOfBirth,
        input.email,
        input.phone,
        input.city,
        input.occupation,
        input.preferredDevice,
        input.shoppingFrequency,
        input.recruitmentSource,
        input.consentStatus,
        input.status,
        input.segment,
        input.researchNotes,
        nowIso(),
        id,
      );
    return this.getParticipant(id);
  }

  addNote(participantId: string, body: unknown, user: AuthUser): ParticipantNote {
    this.must('SELECT id FROM participants WHERE id = ?', participantId, 'Participant');
    const note = text(recordObject(body).note, 'Note', true);
    if (note.length > 4000) throw new ResearchError('Note must be 4000 characters or fewer.');
    const id = randomUUID();
    const now = nowIso();
    this.db
      .prepare('INSERT INTO participant_notes (id, participant_id, author_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, participantId, user.id, note, now, now);
    return this.mapNote(this.must(NOTE_SQL + ' WHERE n.id = ?', id, 'Note'));
  }

  updateNote(id: string, body: unknown): ParticipantNote {
    this.must('SELECT id FROM participant_notes WHERE id = ?', id, 'Note');
    const note = text(recordObject(body).note, 'Note', true);
    if (note.length > 4000) throw new ResearchError('Note must be 4000 characters or fewer.');
    this.db.prepare('UPDATE participant_notes SET note = ?, updated_at = ? WHERE id = ?').run(note, nowIso(), id);
    return this.mapNote(this.must(NOTE_SQL + ' WHERE n.id = ?', id, 'Note'));
  }

  deleteNote(id: string): void {
    const result = this.db.prepare('DELETE FROM participant_notes WHERE id = ?').run(id);
    if (result.changes === 0) throw new ResearchError('Note was not found.', 404);
  }

  createParticipation(body: unknown): Participation {
    const input = participationInput(recordObject(body));
    const participant = this.must('SELECT id, first_name, last_name FROM participants WHERE id = ?', input.participantId, 'Participant');
    const project = this.must('SELECT id, name, allow_repeat FROM projects WHERE id = ?', input.projectId, 'Project');
    if (num(project, 'allow_repeat') !== 1) {
      const duplicate = this.db
        .prepare('SELECT id FROM participations WHERE participant_id = ? AND project_id = ?')
        .get(input.participantId, input.projectId) as Row | undefined;
      if (duplicate) {
        throw new ResearchError(
          `${fullName(str(participant, 'first_name'), str(participant, 'last_name'))} already has a participation record on ${str(project, 'name')}.`,
          409,
        );
      }
    }
    const study = this.db.prepare('SELECT id FROM studies WHERE project_id = ? ORDER BY created_at LIMIT 1').get(input.projectId) as Row | undefined;
    const id = randomUUID();
    const now = nowIso();
    const description =
      input.incentiveDescription || (input.incentiveType ? `${input.incentiveType === 'Cash' ? '£' + input.incentiveAmount : '£' + input.incentiveAmount + ' ' + input.incentiveType.toLowerCase()}` : '');
    const save = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO participations (
            id, participant_id, project_id, study_id, participation_date, method, status, incentive_description, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.participantId,
          input.projectId,
          study ? str(study, 'id') : null,
          input.participationDate,
          input.method,
          input.status,
          description,
          input.notes,
          now,
          now,
        );
      if (input.incentiveType) {
        const incentiveStatus = input.status === 'Completed' ? 'Issued' : input.status === 'Scheduled' ? 'Approved' : 'Pending';
        this.db
          .prepare(
            `INSERT INTO incentives (
              id, participation_id, participant_id, project_id, incentive_type, amount, description, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
          )
          .run(randomUUID(), id, input.participantId, input.projectId, input.incentiveType, input.incentiveAmount, description, incentiveStatus, now, now);
      }
    });
    save();
    return this.participations('pa.id = ?', id)[0];
  }

  listSurveys(): SurveyRecord[] {
    const rows = this.db
      .prepare(
        `SELECT s.*, pr.name AS project_name,
          (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) AS response_count
         FROM surveys s LEFT JOIN projects pr ON pr.id = s.project_id
         ORDER BY s.updated_at DESC`,
      )
      .all() as Row[];
    return rows.map((row) => this.mapSurvey(row, false));
  }

  getSurvey(id: string): SurveyRecord {
    return this.mapSurvey(this.surveyRow(id), true);
  }

  createSurvey(body: unknown, user: AuthUser): SurveyRecord {
    const input = surveyInput(recordObject(body));
    this.assertProject(input.projectId);
    const id = randomUUID();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO surveys (id, name, description, project_id, schema_json, estimated_duration, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.name, input.description, input.projectId || null, JSON.stringify(blankQuestionnaire(input.name, 'Your feedback')), input.estimatedDuration, input.status, user.id, now, now);
    return this.getSurvey(id);
  }

  updateSurvey(id: string, body: unknown): SurveyRecord {
    this.surveyRow(id);
    const input = surveyInput(recordObject(body));
    this.assertProject(input.projectId);
    this.db
      .prepare(
        `UPDATE surveys SET name = ?, description = ?, project_id = ?, estimated_duration = ?, status = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.name, input.description, input.projectId || null, input.estimatedDuration, input.status, nowIso(), id);
    return this.getSurvey(id);
  }

  saveSurveySchema(id: string, schema: unknown): SurveyRecord {
    this.surveyRow(id);
    this.db.prepare('UPDATE surveys SET schema_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(schemaObject(schema)), nowIso(), id);
    return this.getSurvey(id);
  }

  setSurveyStatus(id: string, status: string): SurveyRecord {
    const current = this.getSurvey(id);
    return this.updateSurvey(id, {
      name: current.name,
      description: current.description,
      projectId: current.projectId,
      estimatedDuration: current.estimatedDuration,
      status,
    });
  }

  surveyResponses(id: string): SurveyResponseRecord[] {
    this.surveyRow(id);
    const rows = this.db
      .prepare(
        `SELECT r.*, s.name AS survey_name, s.schema_json, p.first_name, p.last_name, u.full_name AS submitter
         FROM survey_responses r
         JOIN surveys s ON s.id = r.survey_id
         LEFT JOIN participants p ON p.id = r.participant_id
         LEFT JOIN users u ON u.id = r.submitted_by
         WHERE r.survey_id = ?
         ORDER BY r.submitted_at DESC`,
      )
      .all(id) as Row[];
    return rows.map((row) => this.mapSurveyResponse(row));
  }

  addSurveyResponse(id: string, body: unknown, user: AuthUser): SurveyResponseRecord {
    const survey = this.surveyRow(id);
    const record = recordObject(body);
    const response = recordObject(record.response ?? record);
    const isTest = record.isTestResponse !== false;
    const participantId = text(record.participantId, 'Participant');
    if (participantId) this.must('SELECT id FROM participants WHERE id = ?', participantId, 'Participant');
    const responseId = randomUUID();
    const submittedAt = nowIso();
    this.db
      .prepare(
        `INSERT INTO survey_responses (id, survey_id, participant_id, project_id, response_json, is_test, submitted_by, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(responseId, id, participantId || null, str(survey, 'project_id') || null, JSON.stringify(response), isTest ? 1 : 0, user.id, submittedAt);
    return this.mapSurveyResponse(
      this.must(
        `SELECT r.*, s.name AS survey_name, s.schema_json, p.first_name, p.last_name, u.full_name AS submitter
         FROM survey_responses r
         JOIN surveys s ON s.id = r.survey_id
         LEFT JOIN participants p ON p.id = r.participant_id
         LEFT JOIN users u ON u.id = r.submitted_by
         WHERE r.id = ?`,
        responseId,
        'Response',
      ),
    );
  }

  listScreeners(): ScreenerRecord[] {
    const rows = this.db
      .prepare(
        `SELECT s.*, pr.name AS project_name,
          (SELECT COUNT(*) FROM screener_responses r WHERE r.screener_id = s.id) AS response_count
         FROM screeners s LEFT JOIN projects pr ON pr.id = s.project_id
         ORDER BY CASE s.status WHEN 'Active' THEN 0 WHEN 'Draft' THEN 1 ELSE 2 END, s.name`,
      )
      .all() as Row[];
    return rows.map((row) => this.mapScreener(row, false));
  }

  getScreener(id: string): ScreenerRecord {
    return this.mapScreener(this.screenerRow(id), true);
  }

  createScreener(body: unknown, user: AuthUser): ScreenerRecord {
    const input = screenerInput(recordObject(body));
    this.assertProject(input.projectId);
    const id = randomUUID();
    const now = nowIso();
    const rules: QualificationConfig = { qualifiedReason: 'Matches qualification rules.', rules: [] };
    this.db
      .prepare(
        `INSERT INTO screeners (id, name, description, project_id, schema_json, rules_json, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.description,
        input.projectId || null,
        JSON.stringify(blankQuestionnaire(input.name, 'Your answer')),
        JSON.stringify(rules),
        input.status,
        user.id,
        now,
        now,
      );
    return this.getScreener(id);
  }

  updateScreener(id: string, body: unknown): ScreenerRecord {
    this.screenerRow(id);
    const input = screenerInput(recordObject(body));
    this.assertProject(input.projectId);
    this.db
      .prepare('UPDATE screeners SET name = ?, description = ?, project_id = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(input.name, input.description, input.projectId || null, input.status, nowIso(), id);
    return this.getScreener(id);
  }

  saveScreenerSchema(id: string, schema: unknown): ScreenerRecord {
    this.screenerRow(id);
    this.db.prepare('UPDATE screeners SET schema_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(schemaObject(schema)), nowIso(), id);
    return this.getScreener(id);
  }

  saveScreenerRules(id: string, body: unknown): ScreenerRecord {
    this.screenerRow(id);
    const rules = qualificationInput(body);
    this.db.prepare('UPDATE screeners SET rules_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(rules), nowIso(), id);
    return this.getScreener(id);
  }

  setScreenerStatus(id: string, status: string): ScreenerRecord {
    const current = this.getScreener(id);
    return this.updateScreener(id, {
      name: current.name,
      description: current.description,
      projectId: current.projectId,
      status,
    });
  }

  submitScreener(body: unknown, user: AuthUser): ScreeningRecord {
    const record = recordObject(body);
    const participantId = text(record.participantId, 'Participant', true);
    const screenerId = text(record.screenerId, 'Screener', true);
    const response = recordObject(record.response);
    this.must('SELECT id FROM participants WHERE id = ?', participantId, 'Participant');
    const screener = this.screenerRow(screenerId);
    if (str(screener, 'status') === 'Archived') throw new ResearchError('This screener is archived.');
    const config = parseQualificationConfig(jsonObject(str(screener, 'rules_json')));
    const result = evaluateQualification(config, response);
    const id = randomUUID();
    const submittedAt = nowIso();
    this.db
      .prepare(
        `INSERT INTO screener_responses (
          id, participant_id, screener_id, project_id, response_json, qualification_status, reason, submitted_by, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        participantId,
        screenerId,
        str(screener, 'project_id') || null,
        JSON.stringify(response),
        result.qualificationStatus,
        result.reason,
        user.id,
        submittedAt,
      );
    return this.screening('sr.id = ?', id)[0];
  }

  listIncentives(filter: { status?: string; projectId?: string; participantId?: string } = {}): Incentive[] {
    const status = filter.status ?? '';
    const projectId = filter.projectId ?? '';
    const participantId = filter.participantId ?? '';
    const rows = this.db
      .prepare(
        `SELECT i.*, p.first_name, p.last_name, p.participant_code, pr.name AS project_name
         FROM incentives i
         JOIN participants p ON p.id = i.participant_id
         JOIN projects pr ON pr.id = i.project_id
         WHERE (? = '' OR i.status = ?) AND (? = '' OR i.project_id = ?) AND (? = '' OR i.participant_id = ?)
         ORDER BY i.updated_at DESC`,
      )
      .all(status, status, projectId, projectId, participantId, participantId) as Row[];
    return rows.map((row) => this.mapIncentive(row));
  }

  createIncentive(body: unknown): Incentive {
    const input = incentiveInput(recordObject(body));
    this.must('SELECT id FROM participants WHERE id = ?', input.participantId, 'Participant');
    this.must('SELECT id FROM projects WHERE id = ?', input.projectId, 'Project');
    if (input.participationId) {
      const participation = this.must(
        'SELECT id, participant_id, project_id FROM participations WHERE id = ?',
        input.participationId,
        'Participation',
      );
      if (str(participation, 'participant_id') !== input.participantId || str(participation, 'project_id') !== input.projectId) {
        throw new ResearchError('That participation does not match the participant and project.');
      }
      const existing = this.db.prepare('SELECT id FROM incentives WHERE participation_id = ?').get(input.participationId) as Row | undefined;
      if (existing) throw new ResearchError('This participation already has an incentive.', 409);
    }
    const id = randomUUID();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO incentives (
          id, participation_id, participant_id, project_id, incentive_type, amount, description, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.participationId || null,
        input.participantId,
        input.projectId,
        input.incentiveType,
        input.amount,
        input.description,
        input.status,
        input.notes,
        now,
        now,
      );
    if (input.participationId) {
      this.db.prepare('UPDATE participations SET incentive_description = ?, updated_at = ? WHERE id = ?').run(input.description, now, input.participationId);
    }
    return this.listIncentives({ participantId: input.participantId }).find((item) => item.id === id)!;
  }

  updateIncentive(id: string, body: unknown): Incentive {
    const current = this.must('SELECT * FROM incentives WHERE id = ?', id, 'Incentive');
    const input = incentiveInput({
      ...recordObject(body),
      participantId: str(current, 'participant_id'),
      projectId: str(current, 'project_id'),
      participationId: str(current, 'participation_id'),
    });
    const now = nowIso();
    this.db
      .prepare('UPDATE incentives SET incentive_type = ?, amount = ?, description = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?')
      .run(input.incentiveType, input.amount, input.description, input.status, input.notes, now, id);
    if (input.participationId) {
      this.db.prepare('UPDATE participations SET incentive_description = ?, updated_at = ? WHERE id = ?').run(input.description, now, input.participationId);
    }
    return this.mapIncentive(
      this.must(
        `SELECT i.*, p.first_name, p.last_name, p.participant_code, pr.name AS project_name
         FROM incentives i JOIN participants p ON p.id = i.participant_id JOIN projects pr ON pr.id = i.project_id
         WHERE i.id = ?`,
        id,
        'Incentive',
      ),
    );
  }

  private studies(projectId: string): Study[] {
    return (this.db.prepare('SELECT * FROM studies WHERE project_id = ? ORDER BY name').all(projectId) as Row[]).map((row) => ({
      id: str(row, 'id'),
      projectId: str(row, 'project_id'),
      name: str(row, 'name'),
      description: str(row, 'description'),
      method: str(row, 'method'),
      durationMinutes: num(row, 'duration_minutes'),
      status: str(row, 'status'),
    }));
  }

  private projectParticipants(projectId: string): ParticipantSummary[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT p.*, st.name AS last_study
         FROM participants p
         JOIN participations pa ON pa.participant_id = p.id
         LEFT JOIN studies st ON st.id = pa.study_id
         WHERE pa.project_id = ?
         ORDER BY p.last_name, p.first_name`,
      )
      .all(projectId) as Row[];
    return rows.map((row) => this.mapParticipantSummary(row));
  }

  private participations(where: string, value: string): Participation[] {
    const rows = this.db
      .prepare(
        `SELECT pa.*, p.first_name, p.last_name, p.participant_code, pr.name AS project_name, st.name AS study_name,
           i.amount AS incentive_amount, i.status AS incentive_status
         FROM participations pa
         JOIN participants p ON p.id = pa.participant_id
         JOIN projects pr ON pr.id = pa.project_id
         LEFT JOIN studies st ON st.id = pa.study_id
         LEFT JOIN incentives i ON i.participation_id = pa.id
         WHERE ${where}
         ORDER BY pa.participation_date DESC, pa.created_at DESC`,
      )
      .all(value) as Row[];
    return rows.map((row) => ({
      id: str(row, 'id'),
      participantId: str(row, 'participant_id'),
      participantName: fullName(str(row, 'first_name'), str(row, 'last_name')),
      participantCode: str(row, 'participant_code'),
      projectId: str(row, 'project_id'),
      projectName: str(row, 'project_name'),
      studyId: str(row, 'study_id'),
      studyName: str(row, 'study_name') || str(row, 'project_name'),
      participationDate: str(row, 'participation_date'),
      method: str(row, 'method'),
      status: str(row, 'status'),
      incentiveDescription: str(row, 'incentive_description'),
      incentiveAmount: row.incentive_amount == null ? null : num(row, 'incentive_amount'),
      incentiveStatus: str(row, 'incentive_status'),
      notes: str(row, 'notes'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    }));
  }

  private screening(where: string, value: string): ScreeningRecord[] {
    const rows = this.db
      .prepare(
        `SELECT sr.*, s.name AS screener_name, s.schema_json, p.first_name, p.last_name, p.participant_code, pr.name AS project_name
         FROM screener_responses sr
         JOIN screeners s ON s.id = sr.screener_id
         JOIN participants p ON p.id = sr.participant_id
         LEFT JOIN projects pr ON pr.id = sr.project_id
         WHERE ${where}
         ORDER BY sr.submitted_at DESC`,
      )
      .all(value) as Row[];
    return rows.map((row) => ({
      id: str(row, 'id'),
      participantId: str(row, 'participant_id'),
      participantName: fullName(str(row, 'first_name'), str(row, 'last_name')),
      participantCode: str(row, 'participant_code'),
      screenerId: str(row, 'screener_id'),
      screenerName: str(row, 'screener_name'),
      projectId: str(row, 'project_id'),
      projectName: str(row, 'project_name'),
      responseData: jsonObject(str(row, 'response_json')),
      qualificationStatus: str(row, 'qualification_status'),
      reason: str(row, 'reason'),
      submittedAt: str(row, 'submitted_at'),
      schema: jsonObject(str(row, 'schema_json')),
    }));
  }

  private notes(participantId: string): ParticipantNote[] {
    return (this.db.prepare(NOTE_SQL + ' WHERE n.participant_id = ? ORDER BY n.created_at DESC').all(participantId) as Row[]).map((row) =>
      this.mapNote(row),
    );
  }

  private nextParticipantCode(): string {
    const row = this.db
      .prepare(`SELECT MAX(CAST(SUBSTR(participant_code, 3) AS INTEGER)) AS max_code FROM participants WHERE participant_code LIKE 'P-%'`)
      .get() as Row;
    return `P-${(num(row, 'max_code') || 10000) + 1}`;
  }

  private assertParticipantUnique(code: string, email: string, exceptId = ''): void {
    const codeRow = this.db.prepare('SELECT id FROM participants WHERE participant_code = ? COLLATE NOCASE').get(code) as Row | undefined;
    if (codeRow && str(codeRow, 'id') !== exceptId) throw new ResearchError(`Participant ID ${code} is already in use.`, 409);
    const emailRow = this.db.prepare('SELECT id FROM participants WHERE email = ? COLLATE NOCASE').get(email) as Row | undefined;
    if (emailRow && str(emailRow, 'id') !== exceptId) throw new ResearchError('A participant with this email already exists.', 409);
  }

  private assertProject(projectId: string): void {
    if (projectId) this.must('SELECT id FROM projects WHERE id = ?', projectId, 'Project');
  }

  private surveyRow(id: string): Row {
    return this.must(
      `SELECT s.*, pr.name AS project_name,
        (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) AS response_count
       FROM surveys s LEFT JOIN projects pr ON pr.id = s.project_id WHERE s.id = ?`,
      id,
      'Survey',
    );
  }

  private screenerRow(id: string): Row {
    return this.must(
      `SELECT s.*, pr.name AS project_name,
        (SELECT COUNT(*) FROM screener_responses r WHERE r.screener_id = s.id) AS response_count
       FROM screeners s LEFT JOIN projects pr ON pr.id = s.project_id WHERE s.id = ?`,
      id,
      'Screener',
    );
  }

  private must(sql: string, id: string, label: string, leading: readonly string[] = []): Row {
    const row = this.db.prepare(sql).get(...leading, id) as Row | undefined;
    if (!row) throw new ResearchError(`${label} was not found.`, 404);
    return row;
  }

  private mapUser(row: Row): AuthUser {
    return { id: str(row, 'id'), username: str(row, 'username'), fullName: str(row, 'full_name'), role: str(row, 'role') as UserRole };
  }

  private mapForm(row: Row): StoredForm {
    return {
      id: str(row, 'id') as FormId,
      name: str(row, 'name'),
      description: str(row, 'description'),
      formType: str(row, 'form_type'),
      schema: jsonObject(str(row, 'schema_json')),
      version: num(row, 'version'),
      status: str(row, 'status'),
      createdBy: str(row, 'created_by'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    };
  }

  private mapProject(row: Row): Project {
    return {
      id: str(row, 'id'),
      name: str(row, 'name'),
      client: str(row, 'client'),
      objective: str(row, 'objective'),
      description: str(row, 'description'),
      targetAudience: str(row, 'target_audience'),
      startDate: str(row, 'start_date'),
      endDate: str(row, 'end_date'),
      datesConfirmed: num(row, 'dates_confirmed') === 1,
      recruitmentTarget: num(row, 'recruitment_target'),
      recruited: num(row, 'recruited'),
      status: str(row, 'status'),
      allowRepeat: num(row, 'allow_repeat') === 1,
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    };
  }

  private mapParticipantSummary(row: Row): ParticipantSummary {
    return {
      id: str(row, 'id'),
      participantCode: str(row, 'participant_code'),
      firstName: str(row, 'first_name'),
      lastName: str(row, 'last_name'),
      fullName: fullName(str(row, 'first_name'), str(row, 'last_name')),
      email: str(row, 'email'),
      status: str(row, 'status'),
      segment: str(row, 'segment'),
      city: str(row, 'city'),
      lastStudy: str(row, 'last_study'),
    };
  }

  private mapParticipant(row: Row): Participant {
    return {
      ...this.mapParticipantSummary(row),
      dateOfBirth: str(row, 'date_of_birth'),
      ageBand: ageBand(str(row, 'date_of_birth')),
      phone: str(row, 'phone'),
      occupation: str(row, 'occupation'),
      preferredDevice: str(row, 'preferred_device'),
      shoppingFrequency: str(row, 'shopping_frequency'),
      recruitmentSource: str(row, 'recruitment_source'),
      consentStatus: str(row, 'consent_status'),
      researchNotes: str(row, 'research_notes'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    };
  }

  private mapNote(row: Row): ParticipantNote {
    return {
      id: str(row, 'id'),
      participantId: str(row, 'participant_id'),
      authorId: str(row, 'author_id'),
      authorName: str(row, 'author_name') || 'Research team',
      note: str(row, 'note'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    };
  }

  private mapSurvey(row: Row, includeSchema: boolean): SurveyRecord {
    const schema = jsonObject(str(row, 'schema_json'));
    return {
      id: str(row, 'id'),
      name: str(row, 'name'),
      description: str(row, 'description'),
      projectId: str(row, 'project_id'),
      projectName: str(row, 'project_name'),
      estimatedDuration: num(row, 'estimated_duration'),
      status: str(row, 'status'),
      questionCount: questionCount(schema),
      responseCount: num(row, 'response_count'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
      schema: includeSchema ? schema : undefined,
    };
  }

  private mapSurveyResponse(row: Row): SurveyResponseRecord {
    return {
      id: str(row, 'id'),
      surveyId: str(row, 'survey_id'),
      surveyName: str(row, 'survey_name'),
      participantId: str(row, 'participant_id'),
      participantName: fullName(str(row, 'first_name'), str(row, 'last_name')),
      projectId: str(row, 'project_id'),
      responseData: jsonObject(str(row, 'response_json')),
      isTestResponse: num(row, 'is_test') === 1,
      submittedBy: str(row, 'submitter'),
      submittedAt: str(row, 'submitted_at'),
      schema: jsonObject(str(row, 'schema_json')),
    };
  }

  private mapScreener(row: Row, includeSchema: boolean): ScreenerRecord {
    const schema = jsonObject(str(row, 'schema_json'));
    return {
      id: str(row, 'id'),
      name: str(row, 'name'),
      description: str(row, 'description'),
      projectId: str(row, 'project_id'),
      projectName: str(row, 'project_name'),
      status: str(row, 'status'),
      questionCount: questionCount(schema),
      responseCount: num(row, 'response_count'),
      qualification: parseQualificationConfig(jsonObject(str(row, 'rules_json'))),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
      schema: includeSchema ? schema : undefined,
    };
  }

  private mapIncentive(row: Row): Incentive {
    return {
      id: str(row, 'id'),
      participationId: str(row, 'participation_id'),
      participantId: str(row, 'participant_id'),
      participantName: fullName(str(row, 'first_name'), str(row, 'last_name')),
      participantCode: str(row, 'participant_code'),
      projectId: str(row, 'project_id'),
      projectName: str(row, 'project_name'),
      incentiveType: str(row, 'incentive_type'),
      amount: num(row, 'amount'),
      description: str(row, 'description'),
      status: str(row, 'status'),
      notes: str(row, 'notes'),
      createdAt: str(row, 'created_at'),
      updatedAt: str(row, 'updated_at'),
    };
  }
}

const NOTE_SQL = `
SELECT n.*, u.full_name AS author_name
FROM participant_notes n
LEFT JOIN users u ON u.id = n.author_id
`;

function roleLabel(role: string): string {
  if (role === 'administrator') return 'Administrator';
  if (role === 'research_manager') return 'Research Manager';
  if (role === 'researcher') return 'Researcher';
  return 'Read-only';
}

export function createDb(dbPath: string): ResearchDb {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');
  const db = new ResearchDb(sqlite);
  db.migrate();
  return db;
}
