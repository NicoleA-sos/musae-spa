export function formatPen(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return String(minutes) + ' min';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? String(hours) + ' h ' + String(remainingMinutes) + ' min'
    : String(hours) + ' h';
}

export function formatDateTimeInLima(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}
