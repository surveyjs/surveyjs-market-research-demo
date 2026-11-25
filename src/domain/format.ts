export function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

export function fieldworkLabel(project: { startDate: string; endDate: string; datesConfirmed: boolean; status: string }): string {
  if (!project.datesConfirmed && project.startDate) {
    const date = new Date(`${project.startDate}T00:00:00`);
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
    return `Planned for ${month}`;
  }
  if (project.startDate && project.endDate) return `${formatDate(project.startDate)} – ${formatDate(project.endDate)}`;
  return formatDate(project.startDate);
}

export function recruitmentLabel(filled: number, target: number, status: string): string {
  if (filled === 0 && (status === 'Draft' || status === 'Planned')) return 'Not started';
  return `${filled} of ${target}`;
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
