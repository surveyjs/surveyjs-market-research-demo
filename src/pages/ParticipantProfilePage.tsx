import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SendScreenerDialog } from '../components/screeners/SendScreenerDialog';
import { PARTICIPANT_STATUSES } from '../domain/constants';
import { formatDate, formatDateTime, formatMoney } from '../domain/format';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { ScreeningRecord } from '../types/research';
import { canDesign, canWrite } from '../ui/access';
import { escapeHtml, linkHtml, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

export function ParticipantProfilePage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  const { participantId = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => researchRepository.participant(participantId), [participantId]);
  const [editing, setEditing] = useState(false);
  const [participation, setParticipation] = useState(false);
  const [screener, setScreener] = useState(false);
  const [note, setNote] = useState(false);
  const [view, setView] = useState<ScreeningRecord | null>(null);
  const [tab, setTab] = useState<'details' | 'participation' | 'screening' | 'notes'>('details');
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);
  const person = data?.participant;
  useDocumentTitle(person?.fullName ?? 'Participant');

  return (
    <PageState loading={loading} error={error}>
      {person && data ? (
        <>
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/participants">Participants</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {person.fullName}
              </li>
            </ol>
          </nav>
          <section className="card app-card mb-3">
            <div className="card-body">
              <div className="d-flex gap-3">
                <div className="person-avatar" aria-hidden="true">
                  {initials(person.fullName)}
                </div>
                <div className="flex-grow-1">
                  <PageHeader
                    compact
                    title={person.fullName}
                    description={`${person.participantCode} · ${person.segment || 'No segment'} · ${person.city || 'City not set'}`}
                    actions={
                      writing ? (
                        <>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                            Edit participant
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setParticipation(true)}>
                            Add study participation
                          </button>
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => setScreener(true)}>
                            Send screener
                          </button>
                        </>
                      ) : null
                    }
                  />
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <StatusBadge value={person.status} />
                    <StatusBadge value={person.segment} />
                    <StatusBadge value={person.consentStatus} />
                    {writing ? (
                      <label className="d-flex align-items-center gap-2 small mb-0 ms-md-2">
                        Change status
                        <select
                          className="form-select form-select-sm"
                          value={person.status}
                          onChange={(event) => {
                            researchRepository
                              .setParticipantStatus(person.id, event.target.value)
                              .then(() => {
                                showToast(`Status set to ${event.target.value}.`);
                                reload();
                              })
                              .catch((err) => showToast(errorMessage(err)));
                          }}
                        >
                          {PARTICIPANT_STATUSES.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
          <ul className="nav nav-tabs mb-3" role="tablist">
            {(
              [
                ['details', 'Overview'],
                ['participation', 'Projects'],
                ['screening', 'Screeners'],
                ['notes', 'Activity'],
              ] as const
            ).map(([id, label]) => (
              <li className="nav-item" key={id}>
                <button type="button" className={`nav-link ${tab === id ? 'active' : ''}`} aria-selected={tab === id} onClick={() => setTab(id)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
          {tab === 'details' ? (
          <div className="row g-3">
            <div className="col-lg-6">
              <section className="card app-card h-100">
                <div className="card-body">
                  <h2 className="h5">Basic details</h2>
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Age band</dt>
                    <dd className="col-sm-7">{person.ageBand}</dd>
                    <dt className="col-sm-5">Occupation</dt>
                    <dd className="col-sm-7">{person.occupation || '—'}</dd>
                    <dt className="col-sm-5">Recruitment source</dt>
                    <dd className="col-sm-7">{person.recruitmentSource || '—'}</dd>
                    <dt className="col-sm-5">Shopping frequency</dt>
                    <dd className="col-sm-7">{person.shoppingFrequency || '—'}</dd>
                    <dt className="col-sm-5">Date of birth</dt>
                    <dd className="col-sm-7">{formatDate(person.dateOfBirth)}</dd>
                  </dl>
                </div>
              </section>
            </div>
            <div className="col-lg-6">
              <section className="card app-card h-100">
                <div className="card-body">
                  <h2 className="h5">Contact details</h2>
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Email</dt>
                    <dd className="col-sm-7">{person.email}</dd>
                    <dt className="col-sm-5">Phone</dt>
                    <dd className="col-sm-7">{person.phone || '—'}</dd>
                    <dt className="col-sm-5">City</dt>
                    <dd className="col-sm-7">{person.city || '—'}</dd>
                    <dt className="col-sm-5">Preferred device</dt>
                    <dd className="col-sm-7">{person.preferredDevice || '—'}</dd>
                  </dl>
                </div>
              </section>
            </div>
          </div>
          ) : null}
          {tab === 'participation' ? (
            <div className="col-12">
              <section className="card app-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h5 mb-0">Study participation</h2>
                    {writing ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setParticipation(true)}>
                        Add study participation
                      </button>
                    ) : null}
                  </div>
                  {data.participations.length === 0 ? (
                    <p className="text-secondary mb-0">No participation records yet.</p>
                  ) : (
                    <RecordGrid
                      columns={[
                        { name: 'study', title: 'Study', kind: 'html', minWidth: '10rem' },
                        { name: 'date', title: 'Date', minWidth: '7rem' },
                        { name: 'method', title: 'Method', minWidth: '8rem' },
                        { name: 'incentive', title: 'Incentive', kind: 'html', minWidth: '10rem' },
                        { name: 'status', title: 'Status', minWidth: '8rem' },
                      ]}
                      rows={data.participations.map((item) => ({
                        id: item.id,
                        study: linkHtml(`/projects/${item.projectId}`, item.studyName, item.notes || undefined),
                        date: formatDate(item.participationDate),
                        method: item.method,
                        incentive:
                          item.incentiveAmount != null
                            ? `${escapeHtml(item.incentiveDescription || '—')}<div class="small text-secondary">${escapeHtml(`${formatMoney(item.incentiveAmount)} · ${item.incentiveStatus ?? ''}`)}</div>`
                            : escapeHtml(item.incentiveDescription || '—'),
                        status: item.status,
                      }))}
                    />
                  )}
                </div>
              </section>
            </div>
          ) : null}
          {tab === 'screening' ? (
            <div className="col-12">
              <section className="card app-card">
                <div className="card-body">
                  <h2 className="h5">Screening history</h2>
                  {data.screening.length === 0 ? (
                    <p className="text-secondary mb-0">No screener submissions yet.</p>
                  ) : (
                    <RecordGrid
                      columns={[
                        { name: 'screener', title: 'Screener', minWidth: '10rem' },
                        { name: 'submitted', title: 'Submitted', minWidth: '8rem' },
                        { name: 'result', title: 'Result', minWidth: '9rem' },
                        { name: 'reason', title: 'Reason', minWidth: '12rem' },
                        { name: 'view', title: ' ', kind: 'action', actionVariant: 'secondary', minWidth: '9rem' },
                      ]}
                      rows={data.screening.map((item) => ({
                        id: item.id,
                        screener: item.screenerName,
                        submitted: formatDate(item.submittedAt),
                        result: item.qualificationStatus,
                        reason: item.reason || '—',
                        view: 'View responses',
                      }))}
                      onAction={(_column, row) => {
                        const item = data.screening.find((entry) => entry.id === row.id);
                        if (item) setView(item);
                      }}
                    />
                  )}
                </div>
              </section>
            </div>
          ) : null}
          {tab === 'notes' ? (
            <div className="col-12">
              <section className="card app-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h5 mb-0">Research notes</h2>
                    {writing ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setNote(true)}>
                        Add note
                      </button>
                    ) : null}
                  </div>
                  {person.researchNotes ? <p>{person.researchNotes}</p> : null}
                  {data.notes.length === 0 ? (
                    <p className="text-secondary mb-0">No notes yet.</p>
                  ) : (
                    <ul className="list-group">
                      {data.notes.map((item) => (
                        <li key={item.id} className="list-group-item">
                          <div className="d-flex justify-content-between gap-3">
                            <div>
                              <div>{item.note}</div>
                              <div className="small text-secondary">
                                {item.authorName} · {formatDateTime(item.createdAt)}
                              </div>
                            </div>
                            {writing ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  if (!window.confirm('Delete this note?')) return;
                                  researchRepository.deleteNote(item.id).then(() => {
                                    showToast('Note deleted.');
                                    reload();
                                  });
                                }}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          ) : null}
          {editing ? (
            <SurveyDialog
              title="Edit participant"
              id="participant-edit"
              presentation="panel"
              schema={formRepository.getForm('participant')}
              data={person}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'participant' }) : undefined}
              onClose={() => setEditing(false)}
              onSave={async (record) => {
                await researchRepository.updateParticipant(person.id, record);
                showToast('Participant updated.');
                reload();
              }}
            />
          ) : null}
          {participation ? (
            <SurveyDialog
              title="Add study participation"
              id="participation-create"
              schema={formRepository.getForm('participation')}
              data={{ participantId: person.id, incentiveType: 'None' }}
              configure={(model) => {
                const question = model.getQuestionByName('participantId');
                if (question) question.readOnly = true;
              }}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'participation' }) : undefined}
              onClose={() => setParticipation(false)}
              onSave={async (record) => {
                const saved = await researchRepository.createParticipation({ ...record, participantId: person.id });
                showToast(`${person.fullName} was added to ${saved.projectName}.`);
                reload();
              }}
            />
          ) : null}
          {screener ? (
            <SendScreenerDialog
              participantId={person.id}
              onClose={() => setScreener(false)}
              onComplete={(message) => {
                showToast(message);
                reload();
              }}
            />
          ) : null}
          {note ? (
            <SurveyDialog
              title="Add research note"
              id="participant-note"
              schema={formRepository.getForm('note')}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'note' }) : undefined}
              onClose={() => setNote(false)}
              onSave={async (record) => {
                await researchRepository.addNote(person.id, String(record.note ?? ''));
                showToast('Note added.');
                reload();
              }}
            />
          ) : null}
          {view ? (
            <SurveyDialog
              title={view.screenerName}
              id={`screening-${view.id}`}
              schema={view.schema}
              data={view.responseData}
              readOnly
              onClose={() => setView(null)}
            />
          ) : null}
        </>
      ) : null}
    </PageState>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
