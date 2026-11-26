import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { previewScreenerResult, SendScreenerDialog } from '../components/screeners/SendScreenerDialog';
import { SCREENER_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { ConfirmDialog, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';
import { RulesDialog } from './ScreenersPage';

export function ScreenerDetailPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  const { screenerId = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => researchRepository.screener(screenerId), [screenerId]);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [rules, setRules] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const designing = canDesign(user.role);
  const writing = canWrite(user.role);
  useDocumentTitle(data?.name ?? 'Screener');
  const rate = data && data.responseCount ? Math.round((data.eligibleCount / data.responseCount) * 100) : 0;

  const setStatus = (status: string) => {
    if (!data) return;
    researchRepository
      .setScreenerStatus(data.id, status)
      .then(() => {
        showToast(`${data.name} is now ${status}.`);
        reload();
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  return (
    <PageState loading={loading} error={error}>
      {data ? (
        <>
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/screeners">Screeners</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {data.name}
              </li>
            </ol>
          </nav>
          <PageHeader
            title={data.name}
            description={data.projectName || 'No project'}
            actions={
              <>
                {designing ? (
                  <label className="d-flex align-items-center gap-2 small mb-0">
                    <span className="text-secondary">Status</span>
                    <select className="form-select form-select-sm w-auto" aria-label="Screener status" value={data.status} onChange={(event) => setStatus(event.target.value)}>
                      {SCREENER_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPreview(true)}>
                  Preview
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRules(true)}>
                  Rules
                </button>
                {writing && data.status !== 'Archived' ? (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setSending(true)}>
                    Send
                  </button>
                ) : null}
              </>
            }
          />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <StatusBadge value={data.status} />
            <span className="text-secondary small">{data.responseCount} screened</span>
            <span className="text-secondary small">{data.eligibleCount} eligible</span>
            <span className="text-secondary small">{data.disqualifiedCount} disqualified</span>
            <span className="text-secondary small">{data.responseCount ? `${rate}% eligible` : 'No results yet'}</span>
          </div>
          <div className="row g-3">
            <div className="col-lg-8">
              <section className="card app-card">
                <div className="card-body">
                  <h2 className="h5">Overview</h2>
                  <p>{data.description || 'No description.'}</p>
                  <dl className="row mb-0">
                    <dt className="col-sm-4">Project</dt>
                    <dd className="col-sm-8">{data.projectId ? <Link to={`/projects/${data.projectId}`}>{data.projectName}</Link> : '—'}</dd>
                    <dt className="col-sm-4">Questions</dt>
                    <dd className="col-sm-8">{data.questionCount}</dd>
                    <dt className="col-sm-4">Rules</dt>
                    <dd className="col-sm-8">{data.qualification.rules.length}</dd>
                    <dt className="col-sm-4">Updated</dt>
                    <dd className="col-sm-8">{formatDate(data.updatedAt)}</dd>
                  </dl>
                </div>
              </section>
            </div>
            {designing ? (
              <div className="col-lg-4">
                <section className="card app-card h-100">
                  <div className="card-body d-flex flex-column gap-2">
                    <h2 className="h5">Actions</h2>
                    <button type="button" className="btn btn-outline-primary" onClick={() => data.schema && openCreator({ kind: 'screener', id: data.id, title: data.name, schema: data.schema, reload })}>
                      Edit questions
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(true)}>
                      Edit details
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        researchRepository
                          .duplicateScreener(data.id)
                          .then((copy) => {
                            showToast(`${copy.name} was created as a draft.`);
                            navigate(`/screeners/${copy.id}`);
                          })
                          .catch((err) => showToast(errorMessage(err)))
                          .finally(() => setBusy(false));
                      }}
                    >
                      Duplicate
                    </button>
                    <button type="button" className="btn btn-outline-danger" onClick={() => { setConfirmError(''); setConfirm(true); }}>
                      Delete
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
          {editing ? (
            <SurveyDialog
              title="Screener details"
              id="screener-details-edit"
              schema={formRepository.getForm('screener-details')}
              data={data}
              onCustomize={() => openCreator({ kind: 'form', formId: 'screener-details' })}
              onClose={() => setEditing(false)}
              onSave={async (record) => {
                await researchRepository.updateScreener(data.id, record);
                showToast('Screener details saved.');
                reload();
              }}
            />
          ) : null}
          {preview && data.schema ? (
            <SurveyDialog
              title={`Preview: ${data.name}`}
              id={`screener-preview-${data.id}`}
              schema={data.schema}
              onClose={() => setPreview(false)}
              onSave={async (record) => previewScreenerResult(data, record)}
            />
          ) : null}
          {rules ? (
            <RulesDialog
              screener={data}
              canEdit={designing}
              onClose={() => setRules(false)}
              onSaved={() => {
                showToast('Qualification rules saved.');
                setRules(false);
                reload();
              }}
            />
          ) : null}
          {sending ? (
            <SendScreenerDialog
              screenerId={data.id}
              onClose={() => setSending(false)}
              onComplete={(message) => {
                showToast(message);
                reload();
              }}
            />
          ) : null}
          {confirm ? (
            <ConfirmDialog
              title="Delete screener"
              body={`Delete ${data.name}? Screening records for this screener are removed.`}
              confirmLabel="Delete"
              tone="danger"
              busy={busy}
              error={confirmError}
              onClose={() => { if (!busy) setConfirm(false); }}
              onConfirm={() => {
                setBusy(true);
                researchRepository
                  .deleteScreener(data.id)
                  .then(() => {
                    showToast(`${data.name} was deleted.`);
                    navigate('/screeners');
                  })
                  .catch((err) => setConfirmError(errorMessage(err)))
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
        </>
      ) : null}
    </PageState>
  );
}
