import React, { useMemo, useRef, useState } from 'react';
import { Model } from 'survey-core';
import { PARTICIPANT_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import {
  configureParticipantSearch,
  EMPTY_PARTICIPANT_SEARCH,
  PARTICIPANT_SEARCH_FIELDS,
  ParticipantSearchField,
  ParticipantSearchValues,
} from '../survey/searchLayout';
import { SurveyDialog } from '../survey/SurveyDialog';
import { SurveyRenderer } from '../survey/SurveyRenderer';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { EmptyState, PageHeader, PageState, useAsync, useDocumentTitle } from '../ui/components';

const PREFILL = {
  firstName: 'Jordan',
  lastName: 'Blake',
  dateOfBirth: '1992-03-14',
  email: 'jordan.blake@example.com',
  phone: '+44 7700 900321',
  city: 'Leeds',
  occupation: 'Product Designer',
  preferredDevice: 'Laptop',
  shoppingFrequency: 'Weekly',
  recruitmentSource: 'Website signup',
  consentStatus: 'Consented',
  status: 'Active',
  segment: 'Frequent Online Shopper',
  researchNotes: 'Prefers lunchtime sessions.',
};

const FILTER_LABELS: Record<ParticipantSearchField, string> = {
  surname: 'Name',
  participantId: 'Participant ID',
  email: 'Email',
};

const SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status' },
  { id: 'projects', label: 'Projects' },
  { id: 'studies', label: 'Studies' },
  { id: 'screeners', label: 'Screeners' },
  { id: 'added', label: 'Date added' },
] as const;
type ParticipantView = 'all' | (typeof PARTICIPANT_STATUSES)[number];

export function ParticipantsPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Participants');
  const [filter, setFilter] = useState<ParticipantSearchValues>(EMPTY_PARTICIPANT_SEARCH);
  const [view, setView] = useState<ParticipantView>('all');
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('name');
  const [creating, setCreating] = useState(false);
  const searchModel = useRef<Model | null>(null);
  const handlers = useRef({ openCreator, setFilter, designing: canDesign(user.role) });
  handlers.current = { openCreator, setFilter, designing: canDesign(user.role) };
  const { data, error, loading, reload } = useAsync(
    () => researchRepository.participants(filter),
    PARTICIPANT_SEARCH_FIELDS.map((name) => filter[name]),
  );
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);
  const people = data ?? [];
  const counts = useMemo(() => {
    return {
      all: people.length,
      ...Object.fromEntries(PARTICIPANT_STATUSES.map((status) => [status, people.filter((person) => person.status === status).length])),
    } as Record<ParticipantView, number>;
  }, [people]);
  const rows = useMemo(() => {
    const matched = people.filter((person) => view === 'all' || person.status === view);
    const mapped = matched.map((person) => ({
      id: person.id,
      name: person.fullName,
      nameHref: `/participants/${person.id}`,
      email: person.email,
      status: person.status,
      projects: String(person.projectCount),
      studies: String(person.studyCount),
      screeners: String(person.screenerCount),
      added: formatDate(person.createdAt),
      lastStudy: person.lastStudy || '—',
    }));
    return mapped.sort((a, b) => a[sort].localeCompare(b[sort], undefined, { numeric: true, sensitivity: 'base' }));
  }, [people, view, sort]);
  const active = PARTICIPANT_SEARCH_FIELDS.filter((name) => filter[name]);

  return (
    <>
      <PageHeader
        title="Participants"
        description="Search the panel by name, participant ID, or email. The name field also matches a phone number."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Add participant
            </button>
          ) : null
        }
      />
      <section className="card app-card mb-3">
        <SurveyRenderer
          id="participant-search"
          schema={formRepository.getForm('participant-search')}
          showNavigation={false}
          onModel={(model) => {
            searchModel.current = model;
          }}
          configure={(model) => {
            configureParticipantSearch(model, {
              canCustomize: handlers.current.designing,
              onCustomize: () => handlers.current.openCreator({ kind: 'form', formId: 'participant-search' }),
              onChange: (record) => handlers.current.setFilter(record),
            });
          }}
        />
      </section>
      {active.length > 0 ? (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3" aria-label="Active filters">
          {active.map((name) => (
            <button
              key={name}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => searchModel.current?.clearValue(name)}
            >
              {FILTER_LABELS[name]}: {filter[name]} ×
            </button>
          ))}
        </div>
      ) : null}
      <div className="nav nav-pills project-status-nav flex-wrap gap-2 mb-3" role="tablist" aria-label="Participant status">
        {([{ id: 'all' as const, label: 'All' }, ...PARTICIPANT_STATUSES.map((status) => ({ id: status, label: status }))]).map((item) => (
          <button key={item.id} type="button" className={`nav-link ${view === item.id ? 'active' : ''}`} aria-selected={view === item.id} onClick={() => setView(item.id)}>
            {item.label}
            <span className="badge rounded-pill ms-2 text-bg-light">{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <PageState loading={loading} error={error}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <p className="mb-0 text-secondary">
            {data?.length ?? 0} {data?.length === 1 ? 'participant' : 'participants'}
          </p>
          <label className="d-flex align-items-center gap-2 small mb-0">
            Sort
            <select className="form-select form-select-sm" value={sort} onChange={(event) => setSort(event.target.value as (typeof SORTS)[number]['id'])}>
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState>No participants match this search.</EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              pageSize={10}
              columns={[
                { name: 'name', title: 'Participant', kind: 'link', minWidth: '10rem' },
                { name: 'email', title: 'Email', minWidth: '12rem' },
                { name: 'status', title: 'Status', minWidth: '8rem' },
                { name: 'projects', title: 'Projects', minWidth: '6rem' },
                { name: 'studies', title: 'Studies', minWidth: '6rem' },
                { name: 'screeners', title: 'Screeners', minWidth: '6rem' },
                { name: 'added', title: 'Date added', minWidth: '8rem' },
                { name: 'lastStudy', title: 'Last activity', minWidth: '10rem' },
              ]}
              rows={rows}
            />
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Add participant"
          id="participant-create"
          presentation="panel"
          schema={formRepository.getForm('participant')}
          prefill={PREFILL}
          onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'participant' }) : undefined}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createParticipant(record);
            showToast(`${saved.participant.fullName} was added.`);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
