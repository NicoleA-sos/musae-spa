import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

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

  return 'No fue posible procesar el pago simulado. Inténtalo nuevamente.';
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
