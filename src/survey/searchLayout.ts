import { ActionContainer, Model } from 'survey-core';

const SEARCH_FIELDS = ['surname', 'participantId', 'email'] as const;

export function configureParticipantSearch(
  model: Model,
  options: {
    canCustomize: boolean;
    onCustomize: () => void;
    onChange: (data: Record<string, unknown>) => void;
  },
) {
  model.headerView = 'basic';
  model.showCompleteButton = false;
  model.showNavigationButtons = false;
  model.getAllQuestions().forEach((question) => {
    if (question.name !== 'surname') question.startWithNewLine = false;
    question.minWidth = '12rem';
  });
  model.onValueChanged.add((sender) => {
    options.onChange(structuredClone(sender.data));
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
    action: () => fill(model, { surname: 'Thompson', participantId: 'P-10481', email: '' }),
  });
  footer.addAction({
    id: 'clear-search',
    title: 'Clear',
    showTitle: true,
    innerCss: 'btn btn-sm btn-outline-secondary',
    action: () => fill(model, { surname: '', participantId: '', email: '' }),
  });
  model.addLayoutElement({
    id: 'search-footer-actions',
    component: 'sv-action-bar',
    container: 'footer',
    data: footer,
  });
}

function fill(model: Model, data: Record<(typeof SEARCH_FIELDS)[number], string>) {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  SEARCH_FIELDS.forEach((name) => model.setValue(name, data[name]));
}
