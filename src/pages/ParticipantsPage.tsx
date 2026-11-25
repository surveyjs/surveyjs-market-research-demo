import React, { useRef, useState } from 'react';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { RecordGrid } from '../survey/RecordGrid';
import { configureParticipantSearch } from '../survey/searchLayout';
import { SurveyDialog } from '../survey/SurveyDialog';
import { SurveyRenderer } from '../survey/SurveyRenderer';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { EmptyState, PageHeader, PageState, statusBadgeHtml, useAsync, useDocumentTitle } from '../ui/components';

const PREFILL = {
  firstName: 'Jordan',
  lastName: 'Blake',
  dateOfBirth: '1992-03-14',
  email: 'jordan.blake@example.com',
  phone: '+44 7700 900321',
  city: 'Leeds',
  occupation: 'Product Designer',
  preferredDevice: 'Laptop',
  shoppingFrequency: 'Weekly',
  recruitmentSource: 'Website signup',
  consentStatus: 'Consented',
  status: 'Active',
  segment: 'Frequent Online Shopper',
  researchNotes: 'Prefers lunchtime sessions.',
};

export function ParticipantsPage({
  user,
  openCreator,
  showToast,
}: {
  user: AuthUser;
  openCreator: (state: CreatorState) => void;
  showToast: (message: string) => void;
}) {
  useDocumentTitle('Participants');
  const [filter, setFilter] = useState({ surname: '', participantId: '', email: '' });
  const [creating, setCreating] = useState(false);
  const handlers = useRef({ openCreator, setFilter, designing: canDesign(user.role) });
  handlers.current = { openCreator, setFilter, designing: canDesign(user.role) };
  const { data, error, loading, reload } = useAsync(() => researchRepository.participants(filter), [filter.surname, filter.participantId, filter.email]);
  const writing = canWrite(user.role);
  const designing = canDesign(user.role);

  return (
    <>
      <PageHeader
        title="Participants"
        description="Search by surname, participant ID, or email. An empty search lists the directory."
        actions={
          writing ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Add participant
            </button>
          ) : null
        }
      />
      <section className="card app-card mb-3">
        <SurveyRenderer
          id="participant-search"
          schema={formRepository.getForm('participant-search')}
          showNavigation={false}
          configure={(model) =>
            configureParticipantSearch(model, {
              canCustomize: handlers.current.designing,
              onCustomize: () => handlers.current.openCreator({ kind: 'form', formId: 'participant-search' }),
              onChange: (record) =>
                handlers.current.setFilter({
                  surname: String(record.surname ?? ''),
                  participantId: String(record.participantId ?? ''),
                  email: String(record.email ?? ''),
                }),
            })
          }
        />
      </section>
      <PageState loading={loading} error={error}>
        {data && data.length === 0 ? (
          <EmptyState>No participants match this search.</EmptyState>
        ) : (
          <div className="card app-card">
            <RecordGrid
              columns={[
                { name: 'name', title: 'Name', kind: 'link', minWidth: '10rem' },
                { name: 'code', title: 'Participant ID', minWidth: '8rem' },
                { name: 'status', title: 'Status', kind: 'html', minWidth: '7rem' },
                { name: 'segment', title: 'Segment', minWidth: '10rem' },
                { name: 'city', title: 'City', minWidth: '7rem' },
                { name: 'lastStudy', title: 'Last study', minWidth: '10rem' },
                { name: 'open', title: ' ', kind: 'link', minWidth: '5rem' },
              ]}
              rows={(data ?? []).map((person) => ({
                id: person.id,
                name: person.fullName,
                nameHref: `/participants/${person.id}`,
                code: person.participantCode,
                status: statusBadgeHtml(person.status),
                segment: person.segment || '—',
                city: person.city || '—',
                lastStudy: person.lastStudy || '—',
                open: 'Open',
                openHref: `/participants/${person.id}`,
              }))}
            />
          </div>
        )}
      </PageState>
      {creating ? (
        <SurveyDialog
          title="Add participant"
          id="participant-create"
          schema={formRepository.getForm('participant')}
          prefill={PREFILL}
          onCustomize={designing ? () => openCreator({ kind: 'form', formId: 'participant' }) : undefined}
          onClose={() => setCreating(false)}
          onSave={async (record) => {
            const saved = await researchRepository.createParticipant(record);
            showToast(`${saved.participant.fullName} was added.`);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
