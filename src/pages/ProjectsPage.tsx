import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { fieldworkLabel, recruitmentLabel } from '../domain/format';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

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
  const [creating, setCreating] = useState(false);
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);

  return (
    <>
      <PageHeader
        title="Research Projects"
        description="Studies, fieldwork dates, and recruitment progress."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create project
            </button>
          ) : null
        }
      />
      <PageState loading={loading} error={error}>
        <div className="row g-3">
          {data?.map((project) => (
            <div className="col-md-6 col-xl-4" key={project.id}>
              <article className="card app-card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <h2 className="h5 mb-0">
                      <Link to={`/projects/${project.id}`}>{project.name}</Link>
                    </h2>
                    <StatusBadge value={project.status} />
                  </div>
                  <p className="text-secondary mb-2">{project.client}</p>
                  <p className="mb-2">{project.objective}</p>
                  <p className="small text-secondary mb-3">{fieldworkLabel(project)}</p>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    <strong>{recruitmentLabel(project.recruited, project.recruitmentTarget, project.status)}</strong>
                    <Link className="btn btn-sm btn-outline-primary" to={`/projects/${project.id}`}>
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
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
