import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

export interface AvailableSlot {
  startsAt: string;
  label: string;
}

export interface AvailabilityQuote {
  slots: AvailableSlot[];
  totalDurationMinutes: number;
  totalAmount: number;
}

interface FunctionErrorPayload {
  error?: unknown;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      const payload = (await context.clone().json().catch(() => null)) as FunctionErrorPayload | null;

      if (typeof payload?.error === 'string') {
        return payload.error;
      }
    }
  }

  return 'No fue posible completar la solicitud. Inténtalo nuevamente.';
}

export async function fetchAvailableSlots(input: {
  date: string;
  serviceIds: string[];
}): Promise<AvailabilityQuote> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<AvailabilityQuote>('get-available-slots', {
    body: input,
  });

  if (error || !data) {
    throw new AppError(await getFunctionErrorMessage(error));
  }

  return data;
}

export async function createReservation(input: {
  startsAt: string;
  serviceIds: string[];
  customerNotes: string | null;
}): Promise<{ reservationId: string }> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<{ reservationId: string }>('create-reservation', {
    body: input,
  });

  if (error || !data) {
    throw new AppError(await getFunctionErrorMessage(error));
  }

  return data;
}

