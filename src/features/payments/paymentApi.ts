import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

interface FunctionErrorPayload {
  error?: unknown;
}

async function getFunctionErrorMessage(
  error: unknown,
  fallback = 'No fue posible procesar el pago simulado. Inténtalo nuevamente.',
): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      const payload = (await context.clone().json().catch(() => null)) as FunctionErrorPayload | null;

      if (typeof payload?.error === 'string') {
        return payload.error;
      }
    }
  }

  return fallback;
}

export interface SimulatedPaymentResult {
  paymentId: string;
  paymentStatus: 'approved' | 'rejected';
  reservationStatus: 'pending' | 'confirmed';
  amount: number;
  currency: string;
  method: SimulatedPaymentMethod;
  operationCode: string | null;
}

export type SimulatedPaymentMethod = 'card' | 'yape' | 'plin';
export type SimulatedPaymentOutcome = 'approved' | 'rejected';

export interface CancelReservationResult {
  reservationStatus: 'cancelled';
  paymentStatus: 'refunded' | null;
}

export async function processSimulatedPayment(
  reservationId: string,
  method: SimulatedPaymentMethod,
  outcome: SimulatedPaymentOutcome,
): Promise<SimulatedPaymentResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<SimulatedPaymentResult>('process-simulated-payment', {
    body: { reservationId, method, outcome },
  });

  if (error || !data) {
    throw new AppError(await getFunctionErrorMessage(error));
  }

  return data;
}

export async function cancelCustomerReservation(
  reservationId: string,
  reason: string,
): Promise<CancelReservationResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<CancelReservationResult>('cancel-reservation', {
    body: { reservationId, reason },
  });

  if (error || !data) {
    throw new AppError(await getFunctionErrorMessage(error, 'No fue posible cancelar la reserva. Inténtalo nuevamente.'));
  }

  return data;
}
