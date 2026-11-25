import React, { useRef } from 'react';
import { SurveyError } from 'survey-core';
import { authRepository } from '../repositories/authRepository';
import { formRepository } from '../repositories/formRepository';
import { SurveyRenderer } from '../survey/SurveyRenderer';
import { Session } from '../types/auth';
import { PageHeader, useDocumentTitle } from '../ui/components';

export function LoginPage({ onLogin }: { onLogin: (session: Session, remember: boolean) => void }) {
  useDocumentTitle('Sign in');
  const pending = useRef(false);
  return (
    <div className="row justify-content-center">
      <div className="col-sm-10 col-lg-6 col-xl-5">
        <PageHeader
          title="Sign in"
          description="Choose a demo account. Every password is demo1234. Maya Collins is the administrator."
        />
        <section className="card app-card">
          <div className="card-body">
            <SurveyRenderer
              id="login-form"
              schema={formRepository.getForm('login')}
              hideTitle
              onSave={(data, model) => {
                if (pending.current) return;
                pending.current = true;
                authRepository
                  .login(String(data.username ?? ''), String(data.password ?? ''))
                  .then((user) => onLogin(user, Boolean(data.remember_me)))
                  .catch(() => model.getQuestionByName('password')?.addError(new SurveyError('Invalid username or password.')))
                  .finally(() => {
                    pending.current = false;
                  });
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
