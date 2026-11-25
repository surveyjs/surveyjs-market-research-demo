import React, { useState } from 'react';
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
import { EmptyState, PageHeader, PageState, linkHtml, statusBadgeHtml, useAsync, useDocumentTitle } from '../ui/components';

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
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Incentive | null>(null);
  const projects = useAsync(() => researchRepository.projects(), []);
  const { data, error, loading, reload } = useAsync(() => researchRepository.incentives({ status, projectId }), [status, projectId]);
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);

  return (
    <>
      <PageHeader
        title="Incentives"
        description="Vouchers, cash, and gift cards linked to participants and projects."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Add incentive
            </button>
          ) : null
        }
      />
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="incentive-status">
            Status
          </label>
          <select id="incentive-status" className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {INCENTIVE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
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
        {data && data.length === 0 ? (
          <EmptyState>No incentives match these filters.</EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              columns={[
                { name: 'participant', title: 'Participant', kind: 'html', minWidth: '10rem' },
                { name: 'project', title: 'Project', kind: 'html', minWidth: '12rem' },
                { name: 'type', title: 'Type', minWidth: '7rem' },
                { name: 'amount', title: 'Amount', minWidth: '6rem' },
                { name: 'status', title: 'Status', kind: 'html', minWidth: '7rem' },
                { name: 'updated', title: 'Updated', minWidth: '8rem' },
                ...(writing ? [{ name: 'edit', title: ' ', kind: 'action' as const, minWidth: '5rem' }] : []),
              ]}
              rows={(data ?? []).map((item) => ({
                id: item.id,
                participant: linkHtml(`/participants/${item.participantId}`, item.participantName, item.participantCode),
                project: linkHtml(`/projects/${item.projectId}`, item.projectName, item.description),
                type: item.incentiveType,
                amount: formatMoney(item.amount),
                status: statusBadgeHtml(item.status),
                updated: formatDate(item.updatedAt),
                edit: writing ? 'Edit' : '',
              }))}
              onAction={(_column, row) => {
                const item = data?.find((entry) => entry.id === row.id);
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
          data={{ status: 'Pending', incentiveType: 'Voucher' }}
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
