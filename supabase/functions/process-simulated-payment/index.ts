import { createServiceClient, requireUser } from '../_shared/auth.ts';
import { parsePaymentInput } from '../_shared/booking-validation.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface PaymentResult {
  payment_id: string;
  payment_status: 'approved';
  reservation_status: 'confirmed';
  amount: number | string;
  currency: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonResponse(request, {}).headers });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Método no permitido.' }, 405);
  }

  try {
    const user = await requireUser(request);
    const { reservationId } = parsePaymentInput(await request.json());
    const admin = createServiceClient();
    const { data, error } = await admin.rpc('process_simulated_payment', {
      p_reservation_id: reservationId,
      p_customer_id: user.id,
      p_actor_id: user.id,
    });

    if (error || !data?.[0]) {
      const safeMessages = [
        'La reserva no está disponible para pago',
        'La reserva ya está confirmada',
        'Solo se pueden pagar reservas pendientes',
        'No se puede procesar el pago de una reserva pasada',
        'La cuenta no está disponible para procesar pagos',
      ];
      const safeMessage = error && safeMessages.includes(error.message)
        ? error.message
        : 'No fue posible procesar el pago simulado.';

      return jsonResponse(request, { error: safeMessage }, 422);
    }

    const payment = data[0] as PaymentResult;

    return jsonResponse(request, {
      paymentId: payment.payment_id,
      paymentStatus: payment.payment_status,
      reservationStatus: payment.reservation_status,
      amount: Number(payment.amount),
      currency: payment.currency,
    }, 201);
  } catch (error) {
    if (error instanceof Response) return error;

    const message = error instanceof Error ? error.message : 'No fue posible procesar el pago simulado.';
    return jsonResponse(request, { error: message }, 400);
  }
});
