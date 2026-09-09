import { createServiceClient, requireUser } from '../_shared/auth.ts';
import { jsonResponse } from '../_shared/cors.ts';
import { parseCreateReservationInput } from '../_shared/booking-validation.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonResponse(request, {}).headers });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Método no permitido.' }, 405);
  }

  try {
    const user = await requireUser(request);
    const { customerNotes, serviceIds, startsAt } = parseCreateReservationInput(await request.json());
    const admin = createServiceClient();
    const { data: reservationId, error } = await admin.rpc('create_reservation_from_services', {
      p_customer_id: user.id,
      p_starts_at: startsAt,
      p_service_ids: serviceIds,
      p_customer_notes: customerNotes,
      p_actor_id: user.id,
    });

    if (error) {
      if (error.code === '23P01') {
        return jsonResponse(
          request,
          { error: 'Ese horario acaba de ser ocupado. Elige otro horario disponible.' },
          409,
        );
      }

      const safeMessages = [
        'No se permiten reservas en fechas u horarios pasados',
        'Una reserva debe iniciar y terminar el mismo día',
        'La fecha seleccionada no está disponible',
        'El salón no atiende el día seleccionado',
        'El horario solicitado está fuera del horario de atención',
        'Uno o más servicios ya no están disponibles',
      ];

      const safeMessage = safeMessages.includes(error.message)
        ? error.message
        : 'No fue posible crear la reserva. Inténtalo con otro horario.';

      return jsonResponse(request, { error: safeMessage }, 422);
    }

    return jsonResponse(request, { reservationId }, 201);
  } catch (error) {
    if (error instanceof Response) return error;

    const message = error instanceof Error ? error.message : 'No fue posible crear la reserva.';
    return jsonResponse(request, { error: message }, 400);
  }
});

