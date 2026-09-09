import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface CustomerReservation {
  id: string;
  startsAt: string;
  endsAt: string;
  totalAmount: number;
  currency: string;
  status: ReservationStatus;
  items: Array<{
    id: string;
    serviceName: string;
    durationMinutes: number;
    unitPrice: number;
  }>;
  payment: {
    id: string;
    status: 'pending' | 'approved' | 'failed' | 'refunded';
    createdAt: string;
  } | null;
}

export type PaymentReservation = CustomerReservation;

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
  payments?: Array<{
    id: string;
    status: 'pending' | 'approved' | 'failed' | 'refunded';
    created_at: string;
  }> | null;
}

function mapReservation(row: ReservationRow): CustomerReservation {
  const latestPayment = [...(row.payments ?? [])].sort(
    (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
  )[0] ?? null;

  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    status: row.status,
    items: (row.reservation_items ?? []).map((item) => ({
      id: item.id,
      serviceName: item.service_name_snapshot,
      durationMinutes: Number(item.duration_minutes_snapshot),
      unitPrice: Number(item.unit_price_snapshot),
    })),
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          createdAt: latestPayment.created_at,
        }
      : null,
  };
}

export async function fetchCustomerReservations(): Promise<CustomerReservation[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('reservations')
    .select(
      'id, starts_at, ends_at, total_amount, currency, status, reservation_items(id, service_name_snapshot, duration_minutes_snapshot, unit_price_snapshot), payments(id, status, created_at)',
    )
    .order('starts_at', { ascending: false });

  if (error) {
    throw new AppError('No pudimos cargar tus reservas.');
  }

  return ((data ?? []) as ReservationRow[]).map(mapReservation);
}

export async function fetchPaymentReservation(reservationId: string): Promise<PaymentReservation> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('reservations')
    .select(
      'id, starts_at, ends_at, total_amount, currency, status, reservation_items(id, service_name_snapshot, duration_minutes_snapshot, unit_price_snapshot), payments(id, status, created_at)',
    )
    .eq('id', reservationId)
    .single();

  if (error || !data) {
    throw new AppError('No encontramos esta reserva o no tienes permiso para verla.');
  }

  const row = data as ReservationRow;

  return mapReservation(row);
}
