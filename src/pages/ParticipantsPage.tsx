import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formRepository } from '../repositories/formRepository';
import { researchRepository } from '../repositories/researchRepository';
import { SurveyDialog } from '../survey/SurveyDialog';
import { SurveyRenderer } from '../survey/SurveyRenderer';
import { CreatorState } from '../types/creator';
import { AuthUser } from '../types/auth';
import { canDesign, canWrite } from '../ui/access';
import { EmptyState, PageHeader, PageState, StatusBadge, useAsync, useDocumentTitle } from '../ui/components';

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
  const [searchKey, setSearchKey] = useState(0);
  const [creating, setCreating] = useState(false);
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
      <section className="card app-card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Search</h2>
            {designing ? (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openCreator({ kind: 'form', formId: 'participant-search' })}>
                Customize search form
              </button>
            ) : null}
          </div>
          <SurveyRenderer
            key={searchKey}
            id="participant-search"
            schema={formRepository.getForm('participant-search')}
            hideTitle
            actions={[
              {
                id: 'clear-search',
                title: 'Clear',
                action: () => {
                  setFilter({ surname: '', participantId: '', email: '' });
                  setSearchKey((value) => value + 1);
                },
              },
            ]}
            onSave={(record) =>
              setFilter({
                surname: String(record.surname ?? ''),
                participantId: String(record.participantId ?? ''),
                email: String(record.email ?? ''),
              })
            }
          />
        </div>
      </section>
      <PageState loading={loading} error={error}>
        {data && data.length === 0 ? (
          <EmptyState>No participants match this search.</EmptyState>
        ) : (
          <div className="table-responsive card app-card">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Participant ID</th>
                  <th>Status</th>
                  <th className="d-none d-md-table-cell">Segment</th>
                  <th className="d-none d-lg-table-cell">City</th>
                  <th className="d-none d-lg-table-cell">Last study</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <Link to={`/participants/${person.id}`}>{person.fullName}</Link>
                    </td>
                    <td>{person.participantCode}</td>
                    <td>
                      <StatusBadge value={person.status} />
                    </td>
                    <td className="d-none d-md-table-cell">{person.segment || '—'}</td>
                    <td className="d-none d-lg-table-cell">{person.city || '—'}</td>
                    <td className="d-none d-lg-table-cell">{person.lastStudy || '—'}</td>
                    <td className="text-end">
                      <Link className="btn btn-sm btn-outline-primary" to={`/participants/${person.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
