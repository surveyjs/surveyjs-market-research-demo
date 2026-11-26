import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SendScreenerDialog } from '../components/screeners/SendScreenerDialog';
import { PROJECT_STATUSES } from '../domain/constants';
import { fieldworkLabel, formatDate, recruitmentLabel } from '../domain/format';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { ConfirmDialog, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

export function ProjectDetailPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => researchRepository.project(projectId), [projectId]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'restore' | 'delete' | null>(null);
  const [confirmError, setConfirmError] = useState('');
  const [busy, setBusy] = useState(false);
  const [survey, setSurvey] = useState(false);
  const [screener, setScreener] = useState(false);
  const [participation, setParticipation] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'overview' | 'studies' | 'participants' | 'screeners'>('overview');
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);
  const project = data?.project;
  useDocumentTitle(project?.name ?? 'Project');

  const changeStatus = (status: string) => {
    researchRepository
      .setProjectStatus(projectId, status)
      .then(() => {
        showToast(`Status set to ${status}.`);
        reload();
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  return (
    <PageState loading={loading} error={error}>
      {project && data ? (
        <>
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/projects">Research Projects</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {project.name}
              </li>
            </ol>
          </nav>
          <PageHeader
            title={project.name}
            description={project.client}
            actions={
              writing ? (
                <>
                  {project.archived ? null : (
                    <label className="d-flex align-items-center gap-2 small mb-0">
                      <span className="text-secondary">Status</span>
                      <select className="form-select form-select-sm w-auto" value={project.status} onChange={(event) => changeStatus(event.target.value)} aria-label="Project status">
                        {PROJECT_STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing(true)}>
                    Edit project
                  </button>
                  <ProjectActions
                    archived={project.archived}
                    onDuplicate={() => {
                      setBusy(true);
                      researchRepository
                        .duplicateProject(project.id)
                        .then((copy) => {
                          showToast(`${copy.project.name} was created as a draft.`);
                          navigate(`/projects/${copy.project.id}`);
                        })
                        .catch((err) => showToast(errorMessage(err)))
                        .finally(() => setBusy(false));
                    }}
                    onArchive={() => {
                      setConfirmError('');
                      setConfirm('archive');
                    }}
                    onRestore={() => {
                      setConfirmError('');
                      setConfirm('restore');
                    }}
                    onDelete={() => {
                      setConfirmError('');
                      setConfirm('delete');
                    }}
                  />
                </>
              ) : null
            }
          />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            {project.archived ? <StatusBadge value="Archived" /> : null}
            <StatusBadge value={project.status} />
            <span className="text-secondary small">{fieldworkLabel(project)}</span>
            <span className="text-secondary small">
              {project.recruited} / {project.recruitmentTarget} recruited
            </span>
          </div>
          <ul className="nav nav-tabs mb-3" role="tablist">
            {(
              [
                ['overview', 'Overview'],
                ['studies', 'Studies & Surveys'],
                ['participants', 'Participants'],
                ['screeners', 'Screeners'],
              ] as const
            ).map(([id, label]) => (
              <li className="nav-item" key={id}>
                <button type="button" className={`nav-link ${tab === id ? 'active' : ''}`} aria-selected={tab === id} onClick={() => setTab(id)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
          {tab === 'overview' ? (
          <div className="row g-3">
            <div className="col-lg-7">
              <section className="card app-card h-100">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <h2 className="h5 mb-0">Overview</h2>
                  </div>
                  <p>{project.objective}</p>
                  {project.description ? <p className="text-secondary">{project.description}</p> : null}
                  <dl className="row mb-0">
                    <dt className="col-sm-4">Fieldwork</dt>
                    <dd className="col-sm-8">{fieldworkLabel(project)}</dd>
                    <dt className="col-sm-4">Target audience</dt>
                    <dd className="col-sm-8">{project.targetAudience}</dd>
                    <dt className="col-sm-4">Repeat visits</dt>
                    <dd className="col-sm-8">{project.allowRepeat ? 'Allowed' : 'One record per participant'}</dd>
                  </dl>
                </div>
              </section>
            </div>
            <div className="col-lg-5">
              <section className="card app-card h-100">
                <div className="card-body">
                  <h2 className="h5">Recruitment</h2>
                  <p className="fs-4 fw-semibold mb-1">{project.recruited}</p>
                  <p className="text-secondary">{recruitmentLabel(project.recruited, project.recruitmentTarget, project.status)}</p>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={project.recruited}
                    aria-valuemin={0}
                    aria-valuemax={project.recruitmentTarget}
                    aria-label="Recruitment progress"
                  >
                    <div
                      className="progress-bar"
                      style={{ width: `${project.recruitmentTarget ? Math.min(100, (project.recruited / project.recruitmentTarget) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
          ) : null}
          {tab === 'studies' ? (
            <div className="col-lg-8">
              <section className="card app-card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <h2 className="h5 mb-0">Surveys</h2>
                    {designing ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSurvey(true)}>
                        Add survey
                      </button>
                    ) : null}
                  </div>
                  {data.surveys.length === 0 ? <p className="text-secondary mb-0">No surveys linked to this project.</p> : null}
                  <ul className="list-group">
                    {data.surveys.map((item) => (
                      <li key={item.id} className="list-group-item d-flex justify-content-between">
                        <span>{item.name}</span>
                        <StatusBadge value={item.status} />
                      </li>
                    ))}
                  </ul>
                  <h3 className="h6 mt-3">Studies</h3>
                  <ul className="mb-0">
                    {data.studies.map((study) => (
                      <li key={study.id}>
                        {study.name} · {study.method}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          ) : null}
          {tab === 'screeners' ? (
            <div className="col-lg-8">
              <section className="card app-card h-100">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <h2 className="h5 mb-0">Screeners</h2>
                    <div className="d-flex flex-wrap gap-2">
                      {writing ? (
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSending(true)}>
                          Send screener
                        </button>
                      ) : null}
                      {designing ? (
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setScreener(true)}>
                          Add screener
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {data.screeners.length === 0 ? <p className="text-secondary mb-0">No screeners linked to this project.</p> : null}
                  <ul className="list-group">
                    {data.screeners.map((item) => (
                      <li key={item.id} className="list-group-item d-flex justify-content-between">
                        <span>
                          {item.name}
                          <span className="small text-secondary d-block">{item.responseCount} responses</span>
                        </span>
                        <StatusBadge value={item.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          ) : null}
          {tab === 'participants' ? (
            <div className="col-12">
              <section className="card app-card">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <h2 className="h5 mb-0">Participants</h2>
                    {writing ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setParticipation(true)}>
                        Add participation
                      </button>
                    ) : null}
                  </div>
                  {data.participants.length === 0 ? (
                    <p className="text-secondary">No participants are assigned yet.</p>
                  ) : (
                    <RecordGrid
                      columns={[
                        { name: 'name', title: 'Name', kind: 'link', minWidth: '10rem' },
                        { name: 'code', title: 'ID', minWidth: '7rem' },
                        { name: 'city', title: 'City', minWidth: '7rem' },
                        { name: 'status', title: 'Status', minWidth: '8rem' },
                      ]}
                      rows={data.participants.map((person) => ({
                        id: person.id,
                        name: person.fullName,
                        nameHref: `/participants/${person.id}`,
                        code: person.participantCode,
                        city: person.city || '—',
                        status: person.status,
                      }))}
                    />
                  )}
                  <h3 className="h6 mt-3">Participation records</h3>
                  {data.participations.length === 0 ? (
                    <p className="text-secondary mb-0">No participation records yet.</p>
                  ) : (
                    <RecordGrid
                      columns={[
                        { name: 'name', title: 'Participant', kind: 'link', minWidth: '10rem' },
                        { name: 'date', title: 'Date', minWidth: '7rem' },
                        { name: 'method', title: 'Method', minWidth: '8rem' },
                        { name: 'status', title: 'Status', minWidth: '8rem' },
                      ]}
                      rows={data.participations.map((item) => ({
                        id: item.id,
                        name: item.participantName,
                        nameHref: `/participants/${item.participantId}`,
                        date: formatDate(item.participationDate),
                        method: item.method,
                        status: item.status,
                      }))}
                    />
                  )}
                </div>
              </section>
            </div>
          ) : null}
          {confirm ? (
            <ConfirmDialog
              title={confirm === 'delete' ? 'Delete project' : confirm === 'archive' ? 'Archive project' : 'Restore project'}
              body={
                confirm === 'delete'
                  ? `Delete ${project.name}? The project record is removed. Linked surveys and screeners stay in the library.`
                  : confirm === 'archive'
                    ? `Archive ${project.name}? It leaves the active list. Restore brings it back with the ${project.status} status.`
                    : `Restore ${project.name}? It returns to the ${project.status} list.`
              }
              confirmLabel={confirm === 'delete' ? 'Delete' : confirm === 'archive' ? 'Archive' : 'Restore'}
              tone={confirm === 'delete' ? 'danger' : 'primary'}
              busy={busy}
              error={confirmError}
              onClose={() => {
                if (!busy) setConfirm(null);
              }}
              onConfirm={() => {
                const action = confirm;
                setBusy(true);
                setConfirmError('');
                const request =
                  action === 'delete'
                    ? researchRepository.deleteProject(project.id)
                    : action === 'archive'
                      ? researchRepository.archiveProject(project.id)
                      : researchRepository.restoreProject(project.id);
                request
                  .then(() => {
                    setConfirm(null);
                    if (action === 'delete') {
                      showToast(`${project.name} was deleted.`);
                      navigate('/projects');
                      return;
                    }
                    showToast(action === 'archive' ? `${project.name} was archived.` : `${project.name} was restored.`);
                    reload();
                  })
                  .catch((err) => setConfirmError(errorMessage(err)))
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
          {editing ? (
            <SurveyDialog
              title="Edit project"
              id="project-edit"
              schema={formRepository.getForm('project')}
              data={{ ...project, recruitmentTarget: project.recruitmentTarget }}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'project' }) : undefined}
              onClose={() => setEditing(false)}
              onSave={async (record) => {
                await researchRepository.updateProject(project.id, record);
                showToast('Project updated.');
                reload();
              }}
            />
          ) : null}
          {survey ? (
            <SurveyDialog
              title="Add survey"
              id="project-survey"
              schema={formRepository.getForm('survey-details')}
              data={{ projectId: project.id, status: 'Draft', estimatedDuration: 10 }}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'survey-details' }) : undefined}
              onClose={() => setSurvey(false)}
              onSave={async (record) => {
                const saved = await researchRepository.createSurvey({ ...record, projectId: project.id });
                showToast('Survey created. The builder is open.');
                reload();
                if (saved.schema) {
                  openCreator({ kind: 'survey', id: saved.id, title: saved.name, schema: saved.schema, reload });
                }
              }}
            />
          ) : null}
          {screener ? (
            <SurveyDialog
              title="Add screener"
              id="project-screener"
              schema={formRepository.getForm('screener-details')}
              data={{ projectId: project.id, status: 'Draft' }}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'screener-details' }) : undefined}
              onClose={() => setScreener(false)}
              onSave={async (record) => {
                const saved = await researchRepository.createScreener({ ...record, projectId: project.id });
                showToast('Screener created. The builder is open.');
                reload();
                if (saved.schema) {
                  openCreator({ kind: 'screener', id: saved.id, title: saved.name, schema: saved.schema, reload });
                }
              }}
            />
          ) : null}
          {participation ? (
            <SurveyDialog
              title="Add study participation"
              id="project-participation"
              schema={formRepository.getForm('participation')}
              data={{ projectId: project.id, incentiveType: 'None' }}
              configure={(model) => {
                const question = model.getQuestionByName('projectId');
                if (question) question.readOnly = true;
              }}
              onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'participation' }) : undefined}
              onClose={() => setParticipation(false)}
              onSave={async (record) => {
                await researchRepository.createParticipation({ ...record, projectId: project.id });
                showToast('Participation saved.');
                reload();
              }}
            />
          ) : null}
          {sending ? <SendScreenerDialog onClose={() => setSending(false)} onComplete={(message) => { showToast(message); reload(); }} /> : null}
        </>
      ) : null}
    </PageState>
  );
}

function ProjectActions({
  archived,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: {
  archived: boolean;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Actions
      </button>
      <ul className={`dropdown-menu dropdown-menu-end ${open ? 'show' : ''}`}>
        <li>
          <button type="button" className="dropdown-item" onClick={() => choose(onDuplicate)}>
            Duplicate
          </button>
        </li>
        <li>
          <button type="button" className="dropdown-item" onClick={() => choose(archived ? onRestore : onArchive)}>
            {archived ? 'Restore' : 'Archive'}
          </button>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button type="button" className="dropdown-item text-danger" onClick={() => choose(onDelete)}>
            Delete
          </button>
        </li>
      </ul>
    </div>
  );
}
