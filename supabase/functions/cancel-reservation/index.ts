import { createServiceClient, requireUser } from '../_shared/auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface CancelReservationResult {
  reservation_status: 'cancelled';
  payment_status: 'refunded' | null;
}

function parseCancellationInput(value: unknown): { reservationId: string; reason: string } {
  if (!value || typeof value !== 'object') throw new Error('La solicitud de cancelación no es válida.');

  const input = value as Record<string, unknown>;
  const reservationId = typeof input.reservationId === 'string' ? input.reservationId.trim() : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(reservationId)) throw new Error('La reserva no es válida.');
  if (reason.length > 500) throw new Error('El motivo de cancelación es demasiado extenso.');

  return { reservationId, reason };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: jsonResponse(request, {}).headers });
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Método no permitido.' }, 405);

  try {
    const user = await requireUser(request);
    const { reservationId, reason } = parseCancellationInput(await request.json());
    const admin = createServiceClient();
    const { data, error } = await admin.rpc('cancel_customer_reservation', {
      p_reservation_id: reservationId,
      p_customer_id: user.id,
      p_actor_id: user.id,
      p_cancellation_reason: reason || null,
    });

    if (error || !data?.[0]) {
      const safeMessages = [
        'No tienes permiso para cancelar esta reserva',
        'La cuenta no está disponible para cancelar reservas',
        'No encontramos la reserva que deseas cancelar',
        'Esta reserva ya no se puede cancelar',
        'Una reserva confirmada solo puede cancelarse con 12 horas de anticipación',
        'No encontramos el pago aprobado de esta reserva',
      ];
      const safeMessage = error && safeMessages.includes(error.message)
        ? error.message
        : 'No fue posible cancelar la reserva.';

      return jsonResponse(request, { error: safeMessage }, 422);
    }

    const result = data[0] as CancelReservationResult;
    return jsonResponse(request, {
      reservationStatus: result.reservation_status,
      paymentStatus: result.payment_status,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    const message = error instanceof Error ? error.message : 'No fue posible cancelar la reserva.';
    return jsonResponse(request, { error: message }, 400);
  }
});
