import React, { useMemo, useState } from 'react';
import { SurveyCreator, SurveyCreatorComponent } from 'survey-creator-react';
import 'survey-creator-core/survey-creator-core.min.css';
import { errorMessage } from '../repositories/api';
import { Modal } from '../ui/components';
import { applyResearchCreatorTheme } from './creatorTheme';

export function CreatorDialog({
  title,
  description,
  schema,
  defaultSchema,
  onClose,
  onSave,
}: {
  title: string;
  description: string;
  schema: object;
  defaultSchema?: object;
  onClose: () => void;
  onSave: (schema: object) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const creator = useMemo(() => {
    const instance = new SurveyCreator({
      showLogicTab: true,
      showJSONEditorTab: true,
      showTranslationTab: false,
      autoSaveEnabled: false,
    });
    instance.JSON = structuredClone(schema);
    applyResearchCreatorTheme(instance);
    return instance;
  }, [schema]);

  return (
    <Modal title={title} size="fullscreen" onClose={onClose}>
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
        <p className="text-secondary mb-0">{description}</p>
        <div className="d-flex flex-wrap gap-2">
          {defaultSchema ? (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => (creator.JSON = structuredClone(defaultSchema))}>
              Reset to default
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              setError('');
              onSave(creator.JSON)
                .then(onClose)
                .catch((err) => setError(errorMessage(err, 'The form could not be saved.')))
                .finally(() => setSaving(false));
            }}
          >
            {saving ? 'Saving' : 'Save and apply'}
          </button>
        </div>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="creator-host">
        <SurveyCreatorComponent creator={creator} />
      </div>
    </Modal>
  );
}
