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
  paymentStatus: 'approved';
  reservationStatus: 'confirmed';
  amount: number;
  currency: string;
}

export async function processSimulatedPayment(reservationId: string): Promise<SimulatedPaymentResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<SimulatedPaymentResult>('process-simulated-payment', {
    body: { reservationId },
  });

  if (error || !data) {
    throw new AppError(await getFunctionErrorMessage(error));
  }

  return data;
}
