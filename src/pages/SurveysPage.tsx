import React, { useState } from 'react';
import { formatDate } from '../domain/format';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { SurveyRecord, SurveyResponseRecord } from '../types/research';
import { canDesign } from '../ui/access';
import { EmptyState, Modal, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

export function SurveysPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Surveys');
  const { data, error, loading, reload } = useAsync(() => researchRepository.surveys(), []);
  const [creating, setCreating] = useState(false);
  const [details, setDetails] = useState<SurveyRecord | null>(null);
  const [preview, setPreview] = useState<SurveyRecord | null>(null);
  const [responses, setResponses] = useState<SurveyResponseRecord[] | null>(null);
  const [responseView, setResponseView] = useState<SurveyResponseRecord | null>(null);
  const designing = canDesign(user.role);
  const canAnswer = user.role !== 'readonly';

  const setStatus = (survey: SurveyRecord, status: string) => {
    const label = status === 'Archived' ? `Archive ${survey.name}?` : '';
    if (label && !window.confirm(label)) return;
    researchRepository
      .setSurveyStatus(survey.id, status)
      .then(() => {
        showToast(`${survey.name} is now ${status}.`);
        reload();
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  const openPreview = (id: string) => {
    researchRepository.survey(id).then(setPreview).catch((err) => showToast(errorMessage(err)));
  };

  const openEditor = (id: string) => {
    researchRepository
      .survey(id)
      .then((survey) => {
        if (survey.schema) openCreator({ kind: 'survey', id: survey.id, title: survey.name, schema: survey.schema, reload });
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  const openResponses = (id: string) => {
    researchRepository.surveyResponses(id).then(setResponses).catch((err) => showToast(errorMessage(err)));
  };

  return (
    <>
      <PageHeader
        title="Surveys"
        description="Questionnaires for research projects. Test responses are marked and stored separately from a live submission."
        actions={
          designing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create new questionnaire
            </button>
          ) : null
        }
      />
      <PageState loading={loading} error={error}>
        {data && data.length === 0 ? (
          <EmptyState>No surveys yet.</EmptyState>
        ) : (
          <div className="row g-3">
            {data?.map((survey) => (
              <div className="col-md-6 col-xl-4" key={survey.id}>
                <article className="card app-card h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                      <h2 className="h5 mb-0">{survey.name}</h2>
                      <StatusBadge value={survey.status} />
                    </div>
                    <p className="text-secondary small mb-2">{survey.projectName || 'No project'}</p>
                    <p className="mb-2">{survey.description || 'No description.'}</p>
                    <p className="small text-secondary">
                      {survey.estimatedDuration} min · {survey.questionCount} questions · Updated {formatDate(survey.updatedAt)}
                    </p>
                    <p className="small">{survey.responseCount} responses</p>
                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      {designing ? (
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditor(survey.id)}>
                          Edit survey
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openPreview(survey.id)}>
                        Preview
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openResponses(survey.id)}>
                        Responses
                      </button>
                      {designing && survey.status !== 'Active' && survey.status !== 'Archived' ? (
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setStatus(survey, 'Active')}>
                          Publish
                        </button>
                      ) : null}
                      {designing && survey.status === 'Active' ? (
                        <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setStatus(survey, 'Paused')}>
                          Pause
                        </button>
                      ) : null}
                      {designing && survey.status !== 'Archived' ? (
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setStatus(survey, 'Archived')}>
                          Archive
                        </button>
                      ) : null}
                      {designing && survey.status === 'Archived' ? (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setStatus(survey, 'Draft')}>
                          Restore
                        </button>
                      ) : null}
                      {designing ? (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetails(survey)}>
                          Details
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Create new questionnaire"
          id="survey-create"
          schema={formRepository.getForm('survey-details')}
          data={{ status: 'Draft', estimatedDuration: 10 }}
          onCustomize={() => openCreator({ kind: 'form', formId: 'survey-details' })}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createSurvey(record);
            showToast('Survey created. The builder is open.');
            reload();
            if (saved.schema) openCreator({ kind: 'survey', id: saved.id, title: saved.name, schema: saved.schema, reload });
          }}
        />
      ) : null}
      {details ? (
        <SurveyDialog
          title="Survey details"
          id="survey-details"
          schema={formRepository.getForm('survey-details')}
          data={details}
          onCustomize={() => openCreator({ kind: 'form', formId: 'survey-details' })}
          onClose={() => setDetails(null)}
          onSave={async (record) => {
            await researchRepository.updateSurvey(details.id, record);
            showToast('Survey details saved.');
            reload();
          }}
        />
      ) : null}
      {preview?.schema ? (
        <SurveyDialog
          title={`Preview: ${preview.name}`}
          id={`preview-${preview.id}`}
          schema={preview.schema}
          readOnly={!canAnswer}
          onClose={() => setPreview(null)}
          onSave={
            canAnswer
              ? async (record) => {
                  await researchRepository.addSurveyResponse(preview.id, record, true);
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
    </>
  );
}
