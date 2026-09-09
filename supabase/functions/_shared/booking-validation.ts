const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export interface AvailabilityInput {
  date: string;
  serviceIds: string[];
}

export interface CreateReservationInput {
  startsAt: string;
  serviceIds: string[];
  customerNotes: string | null;
}

function assertServiceIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 10 ||
    value.some((item) => typeof item !== 'string' || !uuidPattern.test(item))
  ) {
    throw new Error('Selecciona entre uno y diez servicios válidos.');
  }

  const ids = value as string[];

  if (new Set(ids).size !== ids.length) {
    throw new Error('No puedes seleccionar el mismo servicio más de una vez.');
  }

  return ids;
}

export function parseAvailabilityInput(value: unknown): AvailabilityInput {
  if (!value || typeof value !== 'object') {
    throw new Error('La solicitud no tiene un formato válido.');
  }

  const body = value as Record<string, unknown>;

  if (typeof body.date !== 'string' || !datePattern.test(body.date)) {
    throw new Error('Selecciona una fecha válida.');
  }

  const dateAtNoon = new Date(body.date + 'T12:00:00-05:00');

  if (Number.isNaN(dateAtNoon.getTime())) {
    throw new Error('Selecciona una fecha válida.');
  }

  return { date: body.date, serviceIds: assertServiceIds(body.serviceIds) };
}

export function parseCreateReservationInput(value: unknown): CreateReservationInput {
  if (!value || typeof value !== 'object') {
    throw new Error('La solicitud no tiene un formato válido.');
  }

  const body = value as Record<string, unknown>;
  const startsAt = typeof body.startsAt === 'string' ? body.startsAt : '';
  const startDate = new Date(startsAt);

  if (!startsAt || Number.isNaN(startDate.getTime())) {
    throw new Error('Selecciona un horario válido.');
  }

  if (body.customerNotes !== undefined && typeof body.customerNotes !== 'string') {
    throw new Error('Las notas de la reserva no son válidas.');
  }

  const customerNotes = typeof body.customerNotes === 'string' ? body.customerNotes.trim() : null;

  if (customerNotes && customerNotes.length > 500) {
    throw new Error('Las notas no pueden superar los 500 caracteres.');
  }

  return {
    startsAt: startDate.toISOString(),
    serviceIds: assertServiceIds(body.serviceIds),
    customerNotes: customerNotes || null,
  };
}

