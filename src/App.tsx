import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { IncentivesPage } from './pages/IncentivesPage';
import { LoginPage } from './pages/LoginPage';
import { ParticipantProfilePage } from './pages/ParticipantProfilePage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ScreenersPage } from './pages/ScreenersPage';
import { SurveysPage } from './pages/SurveysPage';
import { onUnauthorized } from './repositories/api';
import { authRepository } from './repositories/authRepository';
import { formRepository } from './repositories/formRepository';
import { researchRepository } from './repositories/researchRepository';
import { CreatorDialog } from './survey/CreatorDialog';
import { CreatorState } from './types/creator';
import { AuthUser } from './types/auth';

export default function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authRepository.current());
  const [creator, setCreator] = useState<CreatorState | null>(null);
  const [toast, setToast] = useState({ message: '', visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3600);
  };

  useEffect(() => onUnauthorized(() => setCurrentUser(null)), []);

  const handleLogout = () => {
    void authRepository.logout();
    setCurrentUser(null);
    navigate('/login');
  };

  const pageProps = { user: currentUser!, openCreator: setCreator, showToast };

  return (
    <AppShell user={currentUser} onLogout={currentUser ? handleLogout : undefined}>
      {!currentUser ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={(session, remember) => { authRepository.store(session, remember); setCurrentUser(session); navigate('/projects', { replace: true }); }} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/projects" element={<ProjectsPage {...pageProps} />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage {...pageProps} />} />
          <Route path="/participants" element={<ParticipantsPage {...pageProps} />} />
          <Route path="/participants/:participantId" element={<ParticipantProfilePage {...pageProps} />} />
          <Route path="/surveys" element={<SurveysPage {...pageProps} />} />
          <Route path="/screeners" element={<ScreenersPage {...pageProps} />} />
          <Route path="/incentives" element={<IncentivesPage {...pageProps} />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      )}
      {creator ? (
        <CreatorDialog
          title={creator.kind === 'form' ? `Form builder: ${formRepository.getMetadata(creator.formId).title}` : `Form builder: ${creator.title}`}
          description="This saves the form definition. It does not create a participant, project, or response. Survey Creator shows a license banner until SURVEYJS_KEY is set."
          schema={creator.kind === 'form' ? formRepository.getForm(creator.formId) : creator.schema}
          defaultSchema={creator.kind === 'form' ? formRepository.getMetadata(creator.formId).defaultSchema : undefined}
          onClose={() => setCreator(null)}
          onSave={async (schema) => {
            if (creator.kind === 'form') {
              await formRepository.saveForm(creator.formId, schema);
              showToast('Form saved.');
              return;
            }
            if (creator.kind === 'survey') await researchRepository.saveSurveySchema(creator.id, schema);
            else await researchRepository.saveScreenerSchema(creator.id, schema);
            creator.reload();
            showToast('Questionnaire saved.');
          }}
        />
      ) : null}
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite">
          <div className="toast-body">{toast.message}</div>
        </div>
      </div>
    </AppShell>
  );
}
