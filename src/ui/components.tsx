import React, { useCallback, useEffect, useRef, useState } from 'react';

const TONES: Record<string, string> = {
  Active: 'text-bg-success',
  Recruiting: 'text-bg-primary',
  Fieldwork: 'text-bg-info',
  Draft: 'text-bg-secondary',
  Planned: 'text-bg-light border',
  Completed: 'text-bg-success',
  Paused: 'text-bg-warning',
  Cancelled: 'text-bg-danger',
  Archived: 'text-bg-dark',
  Qualified: 'text-bg-success',
  Disqualified: 'text-bg-danger',
  'Pending review': 'text-bg-warning',
  Invited: 'text-bg-primary',
  Scheduled: 'text-bg-info',
  Declined: 'text-bg-secondary',
  'No-show': 'text-bg-warning',
  Consented: 'text-bg-success',
  Pending: 'text-bg-warning',
  Withdrawn: 'text-bg-danger',
  Issued: 'text-bg-success',
  Approved: 'text-bg-info',
  Inactive: 'text-bg-secondary',
  'Do not contact': 'text-bg-dark',
};

export function StatusBadge({ value }: { value: string }) {
  if (!value) return <span className="text-secondary">—</span>;
  return <span className={`badge rounded-pill text-nowrap flex-shrink-0 ${TONES[value] ?? 'text-bg-secondary'}`}>{value}</span>;
}

export function PageHeader({
  title,
  description,
  actions,
  compact = false,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`d-flex flex-wrap justify-content-between align-items-start gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
      <div>
        <h1 className="page-title h3 mb-1">{title}</h1>
        {description ? <p className="text-secondary mb-0">{description}</p> : null}
      </div>
      {actions ? <div className="d-flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageState({ loading, error, children }: { loading: boolean; error: string; children: React.ReactNode }) {
  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary py-5" role="status">
        <span className="spinner-border spinner-border-sm" />
        Loading
      </div>
    );
  }
  if (error) return <div className="alert alert-danger">{error}</div>;
  return <>{children}</>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-3 bg-body-tertiary text-secondary p-4">{children}</div>;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Acme Research`;
  }, [title]);
}

export function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadRef.current());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'The request failed.');
    } finally {
      setLoading(false);
    }
    // deps control when a fresh load runs; loadRef always points at the latest loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function Modal({
  title,
  onClose,
  children,
  size = 'lg',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'lg' | 'xl' | 'fullscreen';
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dialogClass = size === 'fullscreen' ? 'modal-fullscreen' : `modal-${size} modal-dialog-centered survey-modal`;
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className={`modal-dialog modal-dialog-scrollable ${dialogClass}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5">{title}</h2>
              <button ref={closeRef} type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
