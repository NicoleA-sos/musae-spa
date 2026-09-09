import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface PendingPaymentReservation {
  id: string;
  startsAt: string;
  endsAt: string;
  totalAmount: number;
  currency: string;
  status: ReservationStatus;
}

export interface PaymentReservation extends PendingPaymentReservation {
  items: Array<{
    id: string;
    serviceName: string;
    durationMinutes: number;
    unitPrice: number;
  }>;
}

interface ReservationRow {
  id: string;
  starts_at: string;
  ends_at: string;
  total_amount: number | string;
  currency: string;
  status: ReservationStatus;
  reservation_items?: Array<{
    id: string;
    service_name_snapshot: string;
    duration_minutes_snapshot: number;
    unit_price_snapshot: number | string;
  }> | null;
}

function mapReservation(row: ReservationRow): PendingPaymentReservation {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    status: row.status,
  };
}

export async function fetchPendingPaymentReservations(): Promise<PendingPaymentReservation[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('reservations')
    .select('id, starts_at, ends_at, total_amount, currency, status')
    .eq('status', 'pending')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at');

  if (error) {
    throw new AppError('No pudimos cargar las reservas pendientes de pago.');
  }

  return ((data ?? []) as ReservationRow[]).map(mapReservation);
}

export async function fetchPaymentReservation(reservationId: string): Promise<PaymentReservation> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('reservations')
    .select(
      'id, starts_at, ends_at, total_amount, currency, status, reservation_items(id, service_name_snapshot, duration_minutes_snapshot, unit_price_snapshot)',
    )
    .eq('id', reservationId)
    .single();

  if (error || !data) {
    throw new AppError('No encontramos esta reserva o no tienes permiso para verla.');
  }

  const row = data as ReservationRow;

  return {
    ...mapReservation(row),
    items: (row.reservation_items ?? []).map((item) => ({
      id: item.id,
      serviceName: item.service_name_snapshot,
      durationMinutes: Number(item.duration_minutes_snapshot),
      unitPrice: Number(item.unit_price_snapshot),
    })),
  };
}
