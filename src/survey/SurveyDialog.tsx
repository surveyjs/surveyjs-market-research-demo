import React, { useState } from 'react';
import { errorMessage } from '../repositories/api';
import { Modal } from '../ui/components';
import { SurveyRenderer } from './SurveyRenderer';

export function SurveyDialog({
  title,
  id,
  schema,
  data,
  prefill,
  readOnly = false,
  completeText,
  customizeLabel,
  onCustomize,
  onClose,
  onSave,
  configure,
}: {
  title: string;
  id: string;
  schema: object;
  data?: object;
  prefill?: Record<string, unknown>;
  readOnly?: boolean;
  completeText?: string;
  customizeLabel?: string;
  onCustomize?: () => void;
  onClose: () => void;
  onSave?: (data: Record<string, unknown>) => Promise<string | void>;
  configure?: (model: import('survey-core').Model) => void;
}) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Modal title={title} onClose={onClose} size="lg">
      {onCustomize ? (
        <div className="d-flex justify-content-end mb-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCustomize}>
            {customizeLabel ?? 'Customize form'}
          </button>
        </div>
      ) : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      <SurveyRenderer
        id={id}
        schema={schema}
        data={data}
        prefill={prefill}
        readOnly={readOnly || saving}
        completeText={completeText}
        showNavigation={!readOnly}
        configure={configure}
        onSave={(value) => {
          if (!onSave || saving) return;
          setSaving(true);
          setError('');
          onSave(value)
            .then((message) => {
              if (message) setNotice(message);
              else onClose();
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
        }}
      />
    </Modal>
  );
}
