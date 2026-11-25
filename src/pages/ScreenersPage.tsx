import React, { useState } from 'react';
import { previewScreenerResult, SendScreenerDialog } from '../components/screeners/SendScreenerDialog';
import { RULE_OPERATORS } from '../domain/constants';
import { formatDate } from '../domain/format';
import { questionNames } from '../domain/questions';
import { QualificationRule } from '../domain/qualify';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { ScreenerRecord } from '../types/research';
import { canDesign, canWrite } from '../ui/access';
import { Modal, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

const OPERATOR_LABEL: Record<string, string> = {
  eq: 'Equals',
  neq: 'Does not equal',
  in: 'Is one of',
  nin: 'Is not one of',
  empty: 'Is empty',
  notEmpty: 'Is not empty',
};

export function ScreenersPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Screeners');
  const { data, error, loading, reload } = useAsync(() => researchRepository.screeners(), []);
  const [creating, setCreating] = useState(false);
  const [details, setDetails] = useState<ScreenerRecord | null>(null);
  const [preview, setPreview] = useState<ScreenerRecord | null>(null);
  const [rulesFor, setRulesFor] = useState<ScreenerRecord | null>(null);
  const [sending, setSending] = useState<string>('');
  const designing = canDesign(user.role);
  const writing = canWrite(user.role);

  const setStatus = (screener: ScreenerRecord, status: string) => {
    if (status === 'Archived' && !window.confirm(`Archive ${screener.name}?`)) return;
    researchRepository
      .setScreenerStatus(screener.id, status)
      .then(() => {
        showToast(`${screener.name} is now ${status}.`);
        reload();
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  const openFull = (id: string, target: 'preview' | 'rules' | 'editor') => {
    researchRepository
      .screener(id)
      .then((screener) => {
        if (target === 'preview') setPreview(screener);
        if (target === 'rules') setRulesFor(screener);
        if (target === 'editor' && screener.schema) {
          openCreator({ kind: 'screener', id: screener.id, title: screener.name, schema: screener.schema, reload });
        }
      })
      .catch((err) => showToast(errorMessage(err)));
  };

  return (
    <>
      <PageHeader
        title="Screeners"
        description="Screening forms use the same builder as surveys. Qualification rules are stored separately from the form."
        actions={
          designing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create screener
            </button>
          ) : null
        }
      />
      <PageState loading={loading} error={error}>
        <div className="row g-3">
          {data?.map((screener) => (
            <div className="col-md-6 col-xl-4" key={screener.id}>
              <article className="card app-card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <h2 className="h5 mb-0">{screener.name}</h2>
                    <StatusBadge value={screener.status} />
                  </div>
                  <p className="text-secondary small mb-2">{screener.projectName || 'No project'}</p>
                  <p className="mb-2">{screener.description || 'No description.'}</p>
                  <p className="small text-secondary">
                    {screener.questionCount} questions · {screener.qualification.rules.length} rules · Updated {formatDate(screener.updatedAt)}
                  </p>
                  <p className="small">{screener.responseCount} responses</p>
                  <div className="d-flex flex-wrap gap-2 mt-auto">
                    {designing ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openFull(screener.id, 'editor')}>
                        Edit screener
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openFull(screener.id, 'preview')}>
                      Preview
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openFull(screener.id, 'rules')}>
                      Rules
                    </button>
                    {writing && screener.status !== 'Archived' ? (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSending(screener.id)}>
                        Send
                      </button>
                    ) : null}
                    {designing && screener.status === 'Draft' ? (
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setStatus(screener, 'Active')}>
                        Publish
                      </button>
                    ) : null}
                    {designing && screener.status !== 'Archived' ? (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setStatus(screener, 'Archived')}>
                        Archive
                      </button>
                    ) : null}
                    {designing && screener.status === 'Archived' ? (
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setStatus(screener, 'Draft')}>
                        Restore
                      </button>
                    ) : null}
                    {designing ? (
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetails(screener)}>
                        Details
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Create screener"
          id="screener-create"
          schema={formRepository.getForm('screener-details')}
          data={{ status: 'Draft' }}
          onCustomize={() => openCreator({ kind: 'form', formId: 'screener-details' })}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createScreener(record);
            showToast('Screener created. The builder is open.');
            reload();
            if (saved.schema) openCreator({ kind: 'screener', id: saved.id, title: saved.name, schema: saved.schema, reload });
          }}
        />
      ) : null}
      {details ? (
        <SurveyDialog
          title="Screener details"
          id="screener-details-edit"
          schema={formRepository.getForm('screener-details')}
          data={details}
          onCustomize={() => openCreator({ kind: 'form', formId: 'screener-details' })}
          onClose={() => setDetails(null)}
          onSave={async (record) => {
            await researchRepository.updateScreener(details.id, record);
            showToast('Screener details saved.');
            reload();
          }}
        />
      ) : null}
      {preview?.schema ? (
        <SurveyDialog
          title={`Preview: ${preview.name}`}
          id={`screener-preview-${preview.id}`}
          schema={preview.schema}
          onClose={() => setPreview(null)}
          onSave={async (record) => previewScreenerResult(preview, record)}
        />
      ) : null}
      {rulesFor ? (
        <RulesDialog
          screener={rulesFor}
          canEdit={designing}
          onClose={() => setRulesFor(null)}
          onSaved={() => {
            showToast('Qualification rules saved.');
            setRulesFor(null);
            reload();
          }}
        />
      ) : null}
      {sending ? (
        <SendScreenerDialog
          screenerId={sending}
          onClose={() => setSending('')}
          onComplete={(message) => {
            showToast(message);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

function RulesDialog({
  screener,
  canEdit,
  onClose,
  onSaved,
}: {
  screener: ScreenerRecord;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const names = questionNames(screener.schema ?? {});
  const [qualifiedReason, setQualifiedReason] = useState(screener.qualification.qualifiedReason ?? '');
  const [rules, setRules] = useState<QualificationRule[]>(screener.qualification.rules);
  const [error, setError] = useState('');
  const update = (index: number, patch: Partial<QualificationRule>) => {
    setRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
  };

  return (
    <Modal title={`Qualification rules: ${screener.name}`} onClose={onClose} size="xl">
      <p className="text-secondary">A response is qualified only when every rule matches. A failed rule records its own result.</p>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="mb-3">
        <label className="form-label" htmlFor="qualified-reason">
          Reason when the participant qualifies
        </label>
        <input id="qualified-reason" className="form-control" value={qualifiedReason} disabled={!canEdit} onChange={(event) => setQualifiedReason(event.target.value)} />
      </div>
      {rules.map((rule, index) => (
        <div className="border rounded-3 p-3 mb-3" key={rule.id}>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Question</label>
              <input className="form-control" list={`questions-${screener.id}`} value={rule.question} disabled={!canEdit} onChange={(event) => update(index, { question: event.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Operator</label>
              <select className="form-select" value={rule.operator} disabled={!canEdit} onChange={(event) => update(index, { operator: event.target.value as QualificationRule['operator'] })}>
                {RULE_OPERATORS.map((operator) => (
                  <option key={operator} value={operator}>
                    {OPERATOR_LABEL[operator]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Expected value</label>
              <input className="form-control" value={rule.expected} disabled={!canEdit || rule.operator === 'empty' || rule.operator === 'notEmpty'} onChange={(event) => update(index, { expected: event.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label">If it fails</label>
              <select className="form-select" value={rule.failStatus} disabled={!canEdit} onChange={(event) => update(index, { failStatus: event.target.value as QualificationRule['failStatus'] })}>
                <option>Disqualified</option>
                <option>Pending review</option>
              </select>
            </div>
            <div className="col-md-9">
              <label className="form-label">Reason</label>
              <input className="form-control" value={rule.reason} disabled={!canEdit} onChange={(event) => update(index, { reason: event.target.value })} />
            </div>
            {canEdit ? (
              <div className="col-md-3 d-flex align-items-end">
                <button type="button" className="btn btn-outline-danger w-100" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))}>
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <datalist id={`questions-${screener.id}`}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {rules.length === 0 ? <p className="text-secondary">No rules yet. A submission stays in pending review until a rule is saved.</p> : null}
      {canEdit ? (
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() =>
              setRules((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  question: names[0] ?? '',
                  operator: 'eq',
                  expected: '',
                  failStatus: 'Disqualified',
                  reason: '',
                },
              ])
            }
          >
            Add rule
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError('');
              researchRepository
                .saveScreenerRules(screener.id, { qualifiedReason, rules })
                .then(onSaved)
                .catch((err) => setError(errorMessage(err)));
            }}
          >
            Save rules
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
