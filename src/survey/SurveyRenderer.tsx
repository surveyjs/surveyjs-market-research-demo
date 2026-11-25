import React, { useEffect, useMemo, useRef } from 'react';
import { IAction, Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import { demoTools } from '../theme/demoTools';

export type SurveyAction = Partial<IAction> & { id: string };

export function SurveyRenderer({
  id,
  schema,
  data,
  onSave,
  actions = [],
  prefill,
  readOnly = false,
  hideTitle = false,
  showNavigation = true,
  completeText,
  configure,
}: {
  id: string;
  schema: object;
  data?: object;
  onSave?: (data: Record<string, unknown>, model: Model) => void;
  actions?: SurveyAction[];
  prefill?: Record<string, unknown>;
  readOnly?: boolean;
  hideTitle?: boolean;
  showNavigation?: boolean;
  completeText?: string;
  configure?: (model: Model) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onSave, actions });
  handlers.current = { onSave, actions };

  const model = useMemo(() => {
    const next = new Model({
      ...structuredClone(schema),
      questionErrorLocation: 'bottom',
      showQuestionNumbers: 'off',
      showCompletePage: false,
      widthMode: 'responsive',
      showTitle: !hideTitle,
      showNavigationButtons: showNavigation,
      mode: readOnly ? 'display' : 'edit',
    });
    next.elementIdPrefix = `${id}-`;
    next.focusFirstQuestionAutomatic = false;
    // Commit text while the field is focused. The default onBlur mode drops a
    // Search click: blur writes the value, the survey re-renders, and the click is lost.
    next.textUpdateMode = 'onTyping';
    if (completeText) next.completeText = completeText;
    if (data) next.data = structuredClone(data) as Record<string, unknown>;
    next.onCompleting.add((sender, options) => {
      options.allow = false;
      handlers.current.onSave?.(structuredClone(sender.data), sender);
    });
    if (prefill) {
      const sample = prefill;
      next.addNavigationItem({
        id: 'prefill-demo-data',
        title: 'Prefill Demo Data',
        visibleIndex: 40,
        showTitle: true,
        action: () => {
          const active = document.activeElement;
          if (active instanceof HTMLElement) active.blur();
          Object.entries(sample).forEach(([name, value]) => {
            const question = next.getQuestionByName(name);
            if (!question?.readOnly) next.setValue(name, value);
          });
          next.clearErrors();
        },
      });
    }
    actions.forEach((action, index) => {
      next.addNavigationItem({
        visibleIndex: 60 + index * 10,
        ...action,
        action: () => handlers.current.actions.find((item) => item.id === action.id)?.action?.(),
      });
    });
    configure?.(next);
    return next;
    // The model is created once for this schema and mode. Callers pass a key to rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, schema, readOnly, hideTitle, showNavigation, completeText]);

  useEffect(() => {
    if (hostRef.current) demoTools.mark(hostRef.current);
  }, []);

  return (
    <div id={id} ref={hostRef} className="survey-host">
      <Survey model={model} />
    </div>
  );
}
