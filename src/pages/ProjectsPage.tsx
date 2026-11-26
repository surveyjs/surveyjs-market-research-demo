import React, { useMemo, useState } from 'react';
import { PROJECT_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { Project } from '../types/research';
import { canDesign, canWrite } from '../ui/access';
import { EmptyState, PageHeader, PageState, useAsync, useDocumentTitle } from '../ui/components';

const PREFILL = {
  name: 'Checkout Friction Study',
  client: 'Northstar Retail',
  objective: 'Find where shoppers abandon the checkout.',
  description: 'A short remote interview wave.',
  targetAudience: 'Adults who bought online in the last month',
  startDate: '2026-12-01',
  endDate: '2026-12-20',
  recruitmentTarget: 16,
  status: 'Planned',
  allowRepeat: false,
};

const SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'client', label: 'Client' },
  { id: 'status', label: 'Status' },
  { id: 'start', label: 'Start date' },
  { id: 'updated', label: 'Updated' },
  { id: 'recruited', label: 'Recruited' },
] as const;

const PAGE_SIZE = 5;
type ProjectView = 'all' | 'archived' | (typeof PROJECT_STATUSES)[number];

export function ProjectsPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Research Projects');
  const { data, error, loading, reload } = useAsync(() => researchRepository.projects(), []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ProjectView>('all');
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('name');
  const [creating, setCreating] = useState(false);
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);
  const projects = data ?? [];
  const counts = useMemo(() => {
    const active = projects.filter((project) => !project.archived);
    return {
      all: active.length,
      archived: projects.filter((project) => project.archived).length,
      ...Object.fromEntries(PROJECT_STATUSES.map((status) => [status, active.filter((project) => project.status === status).length])),
    } as Record<ProjectView, number>;
  }, [projects]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = projects.filter((project) => {
      const inView = view === 'archived' ? project.archived : view === 'all' ? !project.archived : !project.archived && project.status === view;
      const haystack = `${project.name} ${project.client} ${project.objective} ${project.targetAudience}`.toLowerCase();
      return inView && (!needle || haystack.includes(needle));
    });
    const mapped = matched.map((project) => ({
      id: project.id,
      name: project.name,
      nameHref: `/projects/${project.id}`,
      client: project.client,
      status: project.archived ? 'Archived' : project.status,
      objective: project.objective,
      dates: dateRange(project),
      audience: project.targetAudience || '—',
      progress: `${project.recruited} / ${project.recruitmentTarget}`,
      start: project.startDate,
      updated: project.updatedAt,
      recruited: String(project.recruited).padStart(4, '0'),
    }));
    return mapped.sort((a, b) => a[sort].localeCompare(b[sort], undefined, { numeric: true, sensitivity: 'base' }));
  }, [projects, query, view, sort]);
  const views: { id: ProjectView; label: string }[] = [
    { id: 'all', label: 'All' },
    ...PROJECT_STATUSES.map((status) => ({ id: status, label: status })),
    { id: 'archived', label: 'Archived' },
  ];

  return (
    <>
      <PageHeader
        title="Research Projects"
        description="Search, filter, and open a project workspace."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create project
            </button>
          ) : null
        }
      />
      <div className="nav nav-pills project-status-nav flex-wrap gap-2 mb-3" role="tablist" aria-label="Project status">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link ${view === item.id ? 'active' : ''}`}
            aria-selected={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
            <span className="badge rounded-pill ms-2 text-bg-light">{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-7 col-lg-6">
          <label className="form-label" htmlFor="project-search">
            Search
          </label>
          <input
            id="project-search"
            className="form-control"
            value={query}
            placeholder="Name, client, objective, or audience"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="col-sm-6 col-md-3 col-lg-3">
          <label className="form-label" htmlFor="project-sort">
            Sort
          </label>
          <select id="project-sort" className="form-select" value={sort} onChange={(event) => setSort(event.target.value as (typeof SORTS)[number]['id'])}>
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {query ? (
          <div className="col-sm-6 col-md-2 col-lg-2">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : null}
      </div>
      <PageState loading={loading} error={error}>
        <p className="text-secondary mb-2">
          {rows.length} {rows.length === 1 ? 'project' : 'projects'}
        </p>
        {rows.length === 0 ? (
          <EmptyState>
            {projects.length === 0
              ? 'No research projects yet.'
              : view === 'archived'
                ? 'No archived projects.'
                : 'No projects match this search.'}
          </EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              pageSize={PAGE_SIZE}
              columns={[
                { name: 'name', title: 'Project', kind: 'link', minWidth: '12rem' },
                { name: 'client', title: 'Client', minWidth: '8rem' },
                { name: 'status', title: 'Status', minWidth: '8rem' },
                { name: 'objective', title: 'Objective', minWidth: '12rem' },
                { name: 'dates', title: 'Dates', minWidth: '10rem' },
                { name: 'audience', title: 'Target audience', minWidth: '10rem' },
                { name: 'progress', title: 'Recruited / required', minWidth: '8rem' },
              ]}
              rows={rows}
            />
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Create project"
          id="project-create"
          schema={formRepository.getForm('project')}
          prefill={PREFILL}
          onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'project' }) : undefined}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createProject(record);
            showToast(`${saved.project.name} was created.`);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

function dateRange(project: Project): string {
  const start = formatDate(project.startDate);
  const end = project.endDate ? formatDate(project.endDate) : 'Open';
  return `${start} – ${end}`;
}
