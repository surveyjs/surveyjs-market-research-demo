import React, { useEffect, useState } from 'react';
import { evaluateQualification } from '../../domain/qualify';
import { errorMessage } from '../../repositories/api';
import { researchRepository } from '../../repositories/researchRepository';
import { SurveyRenderer } from '../../survey/SurveyRenderer';
import { Choice, ScreenerRecord } from '../../types/research';
import { Modal } from '../../ui/components';

export function SendScreenerDialog({
  participantId = '',
  screenerId = '',
  onClose,
  onComplete,
}: {
  participantId?: string;
  screenerId?: string;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const [choices, setChoices] = useState<Choice[]>([]);
  const [screeners, setScreeners] = useState<ScreenerRecord[]>([]);
  const [participant, setParticipant] = useState(participantId);
  const [screener, setScreener] = useState(screenerId);
  const [form, setForm] = useState<ScreenerRecord | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([researchRepository.participantChoices(), researchRepository.screeners()])
      .then(([people, forms]) => {
        setChoices(people);
        setScreeners(forms.filter((item) => item.status !== 'Archived'));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const openForm = async (nextParticipant: string, nextScreener: string) => {
    if (!nextParticipant || !nextScreener) {
      setError('Choose a participant and a screener.');
      return;
    }
    setError('');
    try {
      const loaded = await researchRepository.screener(nextScreener);
      if (loaded.status === 'Archived') {
        setError('This screener is archived.');
        return;
      }
      setForm(loaded);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const code = choices.find((item) => item.value === participant)?.code ?? '';

  return (
    <Modal title="Send screener" onClose={onClose} size="lg">
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {loading ? (
        <div className="text-secondary">Loading</div>
      ) : !form ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void openForm(participant, screener);
          }}
        >
          <div className="mb-3">
            <label className="form-label" htmlFor="screener-participant">
              Participant
            </label>
            <select id="screener-participant" className="form-select" value={participant} onChange={(event) => setParticipant(event.target.value)}>
              <option value="">Select a participant</option>
              {choices.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.text}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="screener-form">
              Screener
            </label>
            <select id="screener-form" className="form-select" value={screener} onChange={(event) => setScreener(event.target.value)}>
              <option value="">Select a screener</option>
              {screeners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.status === 'Draft' ? ' (Draft)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Open screener
          </button>
        </form>
      ) : (
        <SurveyRenderer
          id={`send-${form.id}`}
          schema={form.schema ?? {}}
          data={{ participantCode: code }}
          onSave={(data) => {
            researchRepository
              .submitScreener(participant, form.id, data)
              .then((saved) => {
                const message = `${saved.qualificationStatus}. ${saved.reason}`;
                setNotice(message);
                onComplete(message);
              })
              .catch((err) => setError(errorMessage(err)));
          }}
        />
      )}
    </Modal>
  );
}

export function previewScreenerResult(screener: ScreenerRecord, data: Record<string, unknown>): string {
  const result = evaluateQualification(screener.qualification, data);
  return `Preview only. This result was not saved. ${result.qualificationStatus}. ${result.reason}`;
}
