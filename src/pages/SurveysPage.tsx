import React, { useMemo, useState } from 'react';
import { SURVEY_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign } from '../ui/access';
import { EmptyState, PageHeader, PageState, useAsync, useDocumentTitle } from '../ui/components';

const PAGE_SIZE = 5;
type SurveyView = 'all' | (typeof SURVEY_STATUSES)[number];

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
  const [query, setQuery] = useState('');
  const [view, setView] = useState<SurveyView>('all');
  const [creating, setCreating] = useState(false);
  const designing = canDesign(user.role);
  const surveys = data ?? [];
  const counts = useMemo(() => {
    return {
      all: surveys.length,
      ...Object.fromEntries(SURVEY_STATUSES.map((status) => [status, surveys.filter((item) => item.status === status).length])),
    } as Record<SurveyView, number>;
  }, [surveys]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return surveys
      .filter((survey) => {
        const inView = view === 'all' || survey.status === view;
        const haystack = `${survey.name} ${survey.projectName} ${survey.description}`.toLowerCase();
        return inView && (!needle || haystack.includes(needle));
      })
      .map((survey) => ({
        id: survey.id,
        name: survey.name,
        nameHref: `/surveys/${survey.id}`,
        project: survey.projectName || '—',
        status: survey.status,
        responses: String(survey.responseCount),
        questions: String(survey.questionCount),
        updated: formatDate(survey.updatedAt),
      }));
  }, [surveys, query, view]);

  return (
    <>
      <PageHeader
        title="Surveys"
        description="Create, manage, and track research surveys."
        actions={
          designing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create survey
            </button>
          ) : null
        }
      />
      <div className="nav nav-pills project-status-nav flex-wrap gap-2 mb-3" role="tablist" aria-label="Survey status">
        {([{ id: 'all' as const, label: 'All' }, ...SURVEY_STATUSES.map((status) => ({ id: status, label: status }))]).map((item) => (
          <button key={item.id} type="button" className={`nav-link ${view === item.id ? 'active' : ''}`} aria-selected={view === item.id} onClick={() => setView(item.id)}>
            {item.label}
            <span className="badge rounded-pill ms-2 text-bg-light">{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-8 col-lg-6">
          <label className="form-label" htmlFor="survey-search">
            Search
          </label>
          <input
            id="survey-search"
            className="form-control"
            value={query}
            placeholder="Survey name, project, or description"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {query ? (
          <div className="col-sm-4 col-lg-2">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : null}
      </div>
      <PageState loading={loading} error={error}>
        <p className="text-secondary mb-2">
          {rows.length} {rows.length === 1 ? 'survey' : 'surveys'}
        </p>
        {rows.length === 0 ? (
          <EmptyState>
            {surveys.length === 0 ? 'No surveys yet.' : view === 'Archived' ? 'No archived surveys.' : 'No surveys match this search.'}
          </EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              pageSize={PAGE_SIZE}
              columns={[
                { name: 'name', title: 'Survey', kind: 'link', minWidth: '12rem' },
                { name: 'project', title: 'Project', minWidth: '10rem' },
                { name: 'status', title: 'Status', minWidth: '8rem' },
                { name: 'responses', title: 'Responses', minWidth: '6rem' },
                { name: 'questions', title: 'Questions', minWidth: '6rem' },
                { name: 'updated', title: 'Updated', minWidth: '8rem' },
              ]}
              rows={rows}
            />
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Create survey"
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
    </>
  );
}
