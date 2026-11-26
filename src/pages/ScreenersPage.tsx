import React, { useMemo, useState } from 'react';
import { RULE_OPERATORS, SCREENER_STATUSES } from '../domain/constants';
import { formatDate } from '../domain/format';
import { questionNames } from '../domain/questions';
import { QualificationRule } from '../domain/qualify';
import { errorMessage } from '../repositories/api';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { SurveyDialog } from '../survey/SurveyDialog';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { ScreenerRecord } from '../types/research';
import { canDesign } from '../ui/access';
import { EmptyState, Modal, PageHeader, PageState, useAsync, useDocumentTitle } from '../ui/components';

const PAGE_SIZE = 5;
type ScreenerView = 'all' | (typeof SCREENER_STATUSES)[number];

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
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ScreenerView>('all');
  const [creating, setCreating] = useState(false);
  const designing = canDesign(user.role);
  const screeners = data ?? [];
  const counts = useMemo(() => {
    return {
      all: screeners.length,
      ...Object.fromEntries(SCREENER_STATUSES.map((status) => [status, screeners.filter((item) => item.status === status).length])),
    } as Record<ScreenerView, number>;
  }, [screeners]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return screeners
      .filter((screener) => {
        const inView = view === 'all' || screener.status === view;
        const haystack = `${screener.name} ${screener.projectName} ${screener.description}`.toLowerCase();
        return inView && (!needle || haystack.includes(needle));
      })
      .map((screener) => {
        const rate = screener.responseCount ? Math.round((screener.eligibleCount / screener.responseCount) * 100) : 0;
        return {
          id: screener.id,
          name: screener.name,
          nameHref: `/screeners/${screener.id}`,
          project: screener.projectName || '—',
          status: screener.status,
          screened: String(screener.responseCount),
          eligible: String(screener.eligibleCount),
          disqualified: String(screener.disqualifiedCount),
          rate: screener.responseCount ? `${rate}%` : '—',
          updated: formatDate(screener.updatedAt),
        };
      });
  }, [screeners, query, view]);

  return (
    <>
      <PageHeader
        title="Screeners"
        description="Manage participant eligibility screening."
        actions={
          designing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create screener
            </button>
          ) : null
        }
      />
      <div className="nav nav-pills project-status-nav flex-wrap gap-2 mb-3" role="tablist" aria-label="Screener status">
        {([{ id: 'all' as const, label: 'All' }, ...SCREENER_STATUSES.map((status) => ({ id: status, label: status }))]).map((item) => (
          <button key={item.id} type="button" className={`nav-link ${view === item.id ? 'active' : ''}`} aria-selected={view === item.id} onClick={() => setView(item.id)}>
            {item.label}
            <span className="badge rounded-pill ms-2 text-bg-light">{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-8 col-lg-6">
          <label className="form-label" htmlFor="screener-search">
            Search
          </label>
          <input
            id="screener-search"
            className="form-control"
            value={query}
            placeholder="Screener name, project, or description"
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
          {rows.length} {rows.length === 1 ? 'screener' : 'screeners'}
        </p>
        {rows.length === 0 ? (
          <EmptyState>
            {screeners.length === 0 ? 'No screeners yet.' : view === 'Archived' ? 'No archived screeners.' : 'No screeners match this search.'}
          </EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              pageSize={PAGE_SIZE}
              columns={[
                { name: 'name', title: 'Screener', kind: 'link', minWidth: '12rem' },
                { name: 'project', title: 'Project', minWidth: '10rem' },
                { name: 'status', title: 'Status', minWidth: '8rem' },
                { name: 'screened', title: 'Screened', minWidth: '6rem' },
                { name: 'eligible', title: 'Eligible', minWidth: '6rem' },
                { name: 'disqualified', title: 'Disqualified', minWidth: '7rem' },
                { name: 'rate', title: 'Eligibility', minWidth: '6rem' },
                { name: 'updated', title: 'Updated', minWidth: '8rem' },
              ]}
              rows={rows}
            />
          </div>
        )}
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
    </>
  );
}

export function RulesDialog({
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
