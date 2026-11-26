import { ActionContainer, Model } from 'survey-core';

export const PARTICIPANT_SEARCH_FIELDS = ['surname', 'participantId', 'email'] as const;

export type ParticipantSearchField = (typeof PARTICIPANT_SEARCH_FIELDS)[number];
export type ParticipantSearchValues = Record<ParticipantSearchField, string>;

export const EMPTY_PARTICIPANT_SEARCH: ParticipantSearchValues = {
  surname: '',
  participantId: '',
  email: '',
};

const PREFILL: ParticipantSearchValues = { ...EMPTY_PARTICIPANT_SEARCH, surname: 'Thompson', participantId: 'P-10481' };

export function participantSearchValues(data: Record<string, unknown>): ParticipantSearchValues {
  const next = { ...EMPTY_PARTICIPANT_SEARCH };
  PARTICIPANT_SEARCH_FIELDS.forEach((name) => {
    const value = data[name];
    next[name] = typeof value === 'string' ? value : '';
  });
  return next;
}

export function configureParticipantSearch(
  model: Model,
  options: {
    canCustomize: boolean;
    onCustomize: () => void;
    onChange: (data: ParticipantSearchValues) => void;
  },
) {
  model.headerView = 'basic';
  model.showCompleteButton = false;
  model.showNavigationButtons = false;
  model.getAllQuestions().forEach((question) => {
    question.minWidth = '12rem';
  });
  model.onValueChanged.add((sender) => {
    options.onChange(participantSearchValues(sender.data));
  });

  if (options.canCustomize) {
    const header = new ActionContainer();
    header.containerCss = 'search-header-actions';
    header.locOwner = model;
    header.addAction({
      id: 'customize-search',
      title: 'Edit Search Form',
      showTitle: true,
      innerCss: 'btn btn-sm btn-outline-secondary',
      action: () => options.onCustomize(),
    });
    model.addLayoutElement({
      id: 'search-header-actions',
      component: 'sv-action-bar',
      container: 'header',
      data: header,
    });
  }

  const footer = new ActionContainer();
  footer.containerCss = 'search-footer-actions';
  footer.locOwner = model;
  footer.addAction({
    id: 'prefill-search',
    title: 'Prefill Demo Data',
    showTitle: true,
    innerCss: 'btn btn-sm btn-outline-secondary',
    action: () => fill(model, PREFILL),
  });
  footer.addAction({
    id: 'clear-search',
    title: 'Clear Filters',
    showTitle: true,
    innerCss: 'btn btn-sm btn-outline-secondary',
    action: () => fill(model, EMPTY_PARTICIPANT_SEARCH),
  });
  model.addLayoutElement({
    id: 'search-footer-actions',
    component: 'sv-action-bar',
    container: 'footer',
    data: footer,
  });
}

function fill(model: Model, data: ParticipantSearchValues) {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  PARTICIPANT_SEARCH_FIELDS.forEach((name) => {
    if (data[name]) model.setValue(name, data[name]);
    else model.clearValue(name);
  });
}
