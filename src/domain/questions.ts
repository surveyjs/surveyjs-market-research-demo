const CONTAINERS = new Set(['panel', 'paneldynamic']);

export function visitElements(schema: unknown, visit: (element: Record<string, unknown>) => void): void {
  const root = (schema ?? {}) as { pages?: { elements?: unknown[] }[]; elements?: unknown[] };
  const walk = (elements?: unknown[]) => {
    elements?.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const element = item as Record<string, unknown>;
      visit(element);
      if (Array.isArray(element.elements)) walk(element.elements);
      if (Array.isArray(element.templateElements)) walk(element.templateElements);
    });
  };
  if (Array.isArray(root.pages)) root.pages.forEach((page) => walk(page.elements));
  else walk(root.elements);
}

export function questionNames(schema: unknown): string[] {
  const names: string[] = [];
  visitElements(schema, (element) => {
    const type = String(element.type ?? '');
    if (typeof element.name !== 'string' || !element.name) return;
    if (CONTAINERS.has(type) || type === 'html' || type === 'image') return;
    if (Array.isArray(element.elements) || Array.isArray(element.templateElements)) return;
    names.push(element.name);
  });
  return names;
}

export function questionCount(schema: unknown): number {
  return questionNames(schema).length;
}
