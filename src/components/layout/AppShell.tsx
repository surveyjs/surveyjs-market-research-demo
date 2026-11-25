import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthUser } from '../../types/auth';
import { roleLabel } from '../../ui/access';

const LINKS = [
  ['/projects', 'Research Projects'],
  ['/participants', 'Participants'],
  ['/surveys', 'Surveys'],
  ['/screeners', 'Screeners'],
  ['/incentives', 'Incentives'],
] as const;

export function AppShell({ user, onLogout, children }: { user: AuthUser | null; onLogout?: () => void; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body border-bottom sticky-top" aria-label="Primary">
        <div className="container-xl">
          <Link className="navbar-brand d-flex align-items-center" to={user ? '/projects' : '/login'}>
            <i className="bi bi-clipboard-data me-2" aria-hidden="true" />
            Acme Research
          </Link>
          {user ? (
            <button
              className="navbar-toggler"
              type="button"
              aria-expanded={open}
              aria-label="Open navigation"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="navbar-toggler-icon" />
            </button>
          ) : null}
          <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
            {user ? (
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                {LINKS.map(([path, label]) => (
                  <li className="nav-item" key={path}>
                    <Link className={`nav-link ${active(path) ? 'active' : ''}`} to={path} aria-current={active(path) ? 'page' : undefined}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="navbar-text ms-lg-auto badge text-bg-light border">Local demo</span>
            )}
            {user ? (
              <div className="d-flex align-items-center gap-2 ms-lg-2">
                <span className="navbar-text small">
                  <strong className="text-body">{user.fullName}</strong>
                  <span className="text-secondary"> · {roleLabel(user.role)}</span>
                </span>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={onLogout}>
                  <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
      <main className="container-xl py-3">
        {children}
        <footer className="text-secondary small text-end mt-3">Acme Research demo · Changes are saved in the local database</footer>
      </main>
    </>
  );
}
