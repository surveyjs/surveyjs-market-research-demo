import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import { demoTools } from '../theme/demoTools';

export type RecordColumn = {
  name: string;
  title: string;
  kind?: 'text' | 'html' | 'link' | 'action';
  actionVariant?: 'primary' | 'secondary';
  minWidth?: string;
};

export type RecordRow = Record<string, string>;

const PAGE_SIZE = 10;

export function RecordGrid({
  columns,
  rows,
  pageSize = PAGE_SIZE,
  onAction,
}: {
  columns: RecordColumn[];
  rows: RecordRow[];
  pageSize?: number;
  onAction?: (column: string, row: RecordRow) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const onActionRef = useRef(onAction);
  const rowsRef = useRef(rows);
  onActionRef.current = onAction;
  rowsRef.current = rows;

  const signature = JSON.stringify({ columns, rows, pageSize });
  const model = useMemo(() => {
    const kinds = new Map(columns.map((column) => [column.name, column.kind ?? 'text']));
    const variants = new Map(columns.map((column) => [column.name, column.actionVariant ?? 'primary']));
    const hidden = columns
      .filter((column) => column.kind === 'link')
      .map((column) => ({ name: `${column.name}Href`, visible: false }));
    const survey = new Model({
      showQuestionNumbers: 'off',
      showNavigationButtons: false,
      showTitle: false,
      showCompletePage: false,
      widthMode: 'responsive',
      readOnly: true,
      readOnlyMode: 'view',
      pages: [
        {
          name: 'grid',
          elements: [
            {
              type: 'matrixdynamic',
              name: 'rows',
              titleLocation: 'hidden',
              cellType: 'text',
              displayMode: 'table',
              allowAddRows: false,
              allowRemoveRows: false,
              allowRowsDragAndDrop: false,
              rowCount: 0,
              pageSize,
              columns: [
                { name: 'id', visible: false },
                ...columns.map((column) => ({
                  name: column.name,
                  title: column.title,
                  minWidth: column.minWidth ?? '6rem',
                })),
                ...hidden,
              ],
            },
          ],
        },
      ],
    });
    const matrix = survey.getQuestionByName('rows');
    if (matrix) matrix.value = rows;
    survey.onAfterRenderMatrixCell.add((_sender, options) => {
      const column = options.column;
      const columnName = column && 'name' in column ? column.name : undefined;
      const kind = columnName ? kinds.get(columnName) : undefined;
      if (!columnName || !kind || kind === 'text') return;
      const rowValue = (options.row?.value ?? {}) as Record<string, unknown>;
      const host = options.htmlElement;
      host.replaceChildren();
      if (kind === 'html') {
        const block = document.createElement('div');
        block.innerHTML = String(rowValue[columnName] ?? '');
        host.append(block);
        return;
      }
      if (kind === 'link') {
        const href = String(rowValue[`${columnName}Href`] ?? '');
        const label = String(rowValue[columnName] || '—');
        if (!href) {
          host.textContent = label;
          return;
        }
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.textContent = label;
        host.append(anchor);
        return;
      }
      const label = String(rowValue[columnName] ?? '');
      if (!label) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn btn-sm btn-outline-${variants.get(columnName) ?? 'primary'}`;
      button.textContent = label;
      button.dataset.gridAction = columnName;
      button.dataset.rowId = String(rowValue.id ?? '');
      host.append(button);
    });
    return survey;
    // The grid model is rebuilt only when the rows or columns change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (hostRef.current) demoTools.mark(hostRef.current);
  }, []);

  const openRow = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-grid-action]');
    if (button instanceof HTMLButtonElement) {
      event.preventDefault();
      const row = rowsRef.current.find((item) => item.id === button.dataset.rowId);
      if (row && button.dataset.gridAction) onActionRef.current?.(button.dataset.gridAction, row);
      return;
    }
    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('/')) return;
    event.preventDefault();
    navigate(href);
  };

  return (
    <div ref={hostRef} className="survey-host record-grid" onClick={openRow}>
      <Survey model={model} />
    </div>
  );
}
