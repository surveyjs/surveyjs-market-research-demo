import React, { useMemo, useState } from 'react';
import { INCENTIVE_STATUSES } from '../domain/constants';
import { formatDate, formatMoney } from '../domain/format';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { Incentive, Project } from '../types/research';
import { canDesign, canWrite } from '../ui/access';
import { EmptyState, PageHeader, PageState, linkHtml, useAsync, useDocumentTitle } from '../ui/components';

export function IncentivesPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Incentives');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Incentive | null>(null);
  const projects = useAsync(() => researchRepository.projects(), []);
  const { data, error, loading, reload } = useAsync(() => researchRepository.incentives({}), []);
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);
  const incentives = data ?? [];
  const counts = useMemo(() => {
    return {
      all: incentives.length,
      ...Object.fromEntries(INCENTIVE_STATUSES.map((item) => [item, incentives.filter((entry) => entry.status === item).length])),
    } as Record<string, number>;
  }, [incentives]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return incentives.filter((item) => {
      const haystack = `${item.participantName} ${item.projectName} ${item.description} ${item.incentiveType}`.toLowerCase();
      return (!status || item.status === status) && (!projectId || item.projectId === projectId) && (!needle || haystack.includes(needle));
    });
  }, [incentives, query, status, projectId]);
  const budget = incentives.filter((item) => item.status !== 'Cancelled').reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <PageHeader
        title="Incentives"
        description="Manage participant compensation and incentive records."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create incentive
            </button>
          ) : null
        }
      />
      <div className="row g-3 mb-3">
        {[
          ['Records', String(incentives.length)],
          ['Pending', String(counts.Pending ?? 0)],
          ['Distributed', String(counts.Distributed ?? 0)],
          ['Budget', formatMoney(budget)],
        ].map(([label, value]) => (
          <div className="col-6 col-lg-3" key={label}>
            <section className="card app-card h-100">
              <div className="card-body">
                <p className="small text-secondary mb-1">{label}</p>
                <p className="h5 mb-0">{value}</p>
              </div>
            </section>
          </div>
        ))}
      </div>
      <div className="nav nav-pills project-status-nav flex-wrap gap-2 mb-3" role="tablist" aria-label="Incentive status">
        <button type="button" className={`nav-link ${status === '' ? 'active' : ''}`} aria-selected={status === ''} onClick={() => setStatus('')}>
          All
          <span className="badge rounded-pill ms-2 text-bg-light">{counts.all ?? 0}</span>
        </button>
        {INCENTIVE_STATUSES.map((item) => (
          <button key={item} type="button" className={`nav-link ${status === item ? 'active' : ''}`} aria-selected={status === item} onClick={() => setStatus(item)}>
            {item}
            <span className="badge rounded-pill ms-2 text-bg-light">{counts[item] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="incentive-search">
            Search
          </label>
          <input id="incentive-search" className="form-control" value={query} placeholder="Participant, project, or description" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="incentive-project">
            Project
          </label>
          <select id="incentive-project" className="form-select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.data?.map((project: Project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <PageState loading={loading} error={error}>
        {visible.length === 0 ? (
          <EmptyState>{incentives.length === 0 ? 'No incentives yet.' : 'No incentives match these filters.'}</EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              columns={[
                { name: 'participant', title: 'Participant', kind: 'html', minWidth: '10rem' },
                { name: 'project', title: 'Project', kind: 'html', minWidth: '12rem' },
                { name: 'type', title: 'Type', minWidth: '7rem' },
                { name: 'amount', title: 'Amount', minWidth: '6rem' },
                { name: 'status', title: 'Status', minWidth: '8rem' },
                { name: 'updated', title: 'Updated', minWidth: '8rem' },
                ...(writing ? [{ name: 'edit', title: ' ', kind: 'action' as const, minWidth: '5rem' }] : []),
              ]}
              rows={visible.map((item) => ({
                id: item.id,
                participant: linkHtml(`/participants/${item.participantId}`, item.participantName, item.participantCode),
                project: linkHtml(`/projects/${item.projectId}`, item.projectName, item.description),
                type: item.incentiveType,
                amount: formatMoney(item.amount),
                status: item.status,
                updated: formatDate(item.updatedAt),
                edit: writing ? 'Edit' : '',
              }))}
              onAction={(_column, row) => {
                const item = visible.find((entry) => entry.id === row.id);
                if (item) setEditing(item);
              }}
            />
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Add incentive"
          id="incentive-create"
          schema={formRepository.getForm('incentive')}
          data={{ status: 'Planned', incentiveType: 'Voucher' }}
          onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'incentive' }) : undefined}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createIncentive(record);
            showToast(`Incentive saved for ${saved.participantName}.`);
            reload();
          }}
        />
      ) : null}
      {editing ? (
        <SurveyDialog
          title="Edit incentive"
          id="incentive-edit"
          schema={formRepository.getForm('incentive')}
          data={editing}
          configure={(model) => {
            ['participantId', 'projectId'].forEach((name) => {
              const question = model.getQuestionByName(name);
              if (question) question.readOnly = true;
            });
          }}
          onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'incentive' }) : undefined}
          onClose={() => setEditing(null)}
          onSave={async (record) => {
            await researchRepository.updateIncentive(editing.id, record);
            showToast('Incentive updated.');
            reload();
          }}
        />
      ) : null}
    </>
  );
}
