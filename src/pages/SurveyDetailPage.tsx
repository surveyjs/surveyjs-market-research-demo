import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SURVEY_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { SurveyResponseRecord } from '../types/research';
import { canDesign } from '../ui/access';
import { ConfirmDialog, Modal, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

export function SurveyDetailPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  const { surveyId = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => researchRepository.survey(surveyId), [surveyId]);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [responses, setResponses] = useState<SurveyResponseRecord[] | null>(null);
  const [responseView, setResponseView] = useState<SurveyResponseRecord | null>(null);
  const [confirm, setConfirm] = useState<'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const designing = canDesign(user.role);
  const canAnswer = user.role !== 'readonly';
  useDocumentTitle(data?.name ?? 'Survey');

  const setStatus = (status: string) => {
    if (!data) return;
    researchRepository
      .setSurveyStatus(data.id, status)
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
                <Link to="/surveys">Surveys</Link>
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
                    <select className="form-select form-select-sm w-auto" aria-label="Survey status" value={data.status} onChange={(event) => setStatus(event.target.value)}>
                      {SURVEY_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPreview(true)}>
                  Preview
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => researchRepository.surveyResponses(data.id).then(setResponses).catch((err) => showToast(errorMessage(err)))}>
                  Responses
                </button>
                {designing ? (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => data.schema && openCreator({ kind: 'survey', id: data.id, title: data.name, schema: data.schema, reload })}>
                    Edit questionnaire
                  </button>
                ) : null}
              </>
            }
          />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <StatusBadge value={data.status} />
            <span className="text-secondary small">{data.responseCount} responses</span>
            <span className="text-secondary small">{data.questionCount} questions</span>
            <span className="text-secondary small">{data.estimatedDuration} min</span>
            <span className="text-secondary small">Updated {formatDate(data.updatedAt)}</span>
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
                    <dt className="col-sm-4">Created</dt>
                    <dd className="col-sm-8">{formatDate(data.createdAt)}</dd>
                    <dt className="col-sm-4">Responses</dt>
                    <dd className="col-sm-8">{data.responseCount}</dd>
                  </dl>
                </div>
              </section>
            </div>
            {designing ? (
              <div className="col-lg-4">
                <section className="card app-card h-100">
                  <div className="card-body d-flex flex-column gap-2">
                    <h2 className="h5">Actions</h2>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(true)}>
                      Edit details
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setBusy(true);
                        researchRepository
                          .duplicateSurvey(data.id)
                          .then((copy) => {
                            showToast(`${copy.name} was created as a draft.`);
                            navigate(`/surveys/${copy.id}`);
                          })
                          .catch((err) => showToast(errorMessage(err)))
                          .finally(() => setBusy(false));
                      }}
                      disabled={busy}
                    >
                      Duplicate
                    </button>
                    <button type="button" className="btn btn-outline-danger" onClick={() => { setConfirmError(''); setConfirm('delete'); }}>
                      Delete
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
          {editing ? (
            <SurveyDialog
              title="Survey details"
              id="survey-details"
              schema={formRepository.getForm('survey-details')}
              data={data}
              onCustomize={() => openCreator({ kind: 'form', formId: 'survey-details' })}
              onClose={() => setEditing(false)}
              onSave={async (record) => {
                await researchRepository.updateSurvey(data.id, record);
                showToast('Survey details saved.');
                reload();
              }}
            />
          ) : null}
          {preview && data.schema ? (
            <SurveyDialog
              title={`Preview: ${data.name}`}
              id={`preview-${data.id}`}
              schema={data.schema}
              readOnly={!canAnswer}
              onClose={() => setPreview(false)}
              onSave={
                canAnswer
                  ? async (record) => {
                      await researchRepository.addSurveyResponse(data.id, record, true);
                      showToast('Test response saved.');
                      reload();
                    }
                  : undefined
              }
            />
          ) : null}
          {responses ? (
            <Modal title="Responses" onClose={() => setResponses(null)}>
              {responses.length === 0 ? (
                <p className="text-secondary mb-0">No responses yet.</p>
              ) : (
                <ul className="list-group">
                  {responses.map((item) => (
                    <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                      <span>
                        {formatDate(item.submittedAt)} · {item.participantName || item.submittedBy || 'Unknown'}
                        {item.isTestResponse ? <span className="badge text-bg-warning ms-2">Test</span> : null}
                      </span>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setResponseView(item)}>
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Modal>
          ) : null}
          {responseView ? (
            <SurveyDialog
              title={responseView.isTestResponse ? 'Test response' : 'Survey response'}
              id={`response-${responseView.id}`}
              schema={responseView.schema}
              data={responseView.responseData}
              readOnly
              onClose={() => setResponseView(null)}
            />
          ) : null}
          {confirm ? (
            <ConfirmDialog
              title="Delete survey"
              body={`Delete ${data.name}? Responses for this survey are removed.`}
              confirmLabel="Delete"
              tone="danger"
              busy={busy}
              error={confirmError}
              onClose={() => { if (!busy) setConfirm(null); }}
              onConfirm={() => {
                setBusy(true);
                researchRepository
                  .deleteSurvey(data.id)
                  .then(() => {
                    showToast(`${data.name} was deleted.`);
                    navigate('/surveys');
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
