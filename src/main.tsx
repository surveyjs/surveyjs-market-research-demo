import { settings, setLicenseKey } from 'survey-core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { formRepository } from './repositories/formRepository';
import { session } from './repositories/session';
import 'bootswatch/dist/zephyr/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'survey-core/survey-core.min.css';
import 'survey-core/themes/adapters/bootstrap-zephyr.css';
import './styles.css';

const licenseKey = import.meta.env.SURVEYJS_KEY?.trim();
if (licenseKey) setLicenseKey(licenseKey);

settings.web.cacheLoadedChoices = false;
settings.web.onBeforeRequestChoices = (_sender, options) => {
  const token = session.getToken();
  if (!token) return;
  options.request?.setRequestHeader('Authorization', `Bearer ${token}`);
  if (options.fetchOptions) {
    const headers = new Headers(options.fetchOptions.headers);
    headers.set('Authorization', `Bearer ${token}`);
    options.fetchOptions.headers = headers;
  }
};

formRepository.init().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
