import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';
import type { ReservationStatus } from '../../types/domain';

export interface AdminCategory {
  id: string;
  name: string;
}

export interface AdminService {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface AdminBusinessHour {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isActive: boolean;
}

export interface AdminBlockedDate {
  id: string;
  date: string;
  reason: string | null;
  isActive: boolean;
}

export interface AdminReservation {
  id: string;
  customerName: string | null;
  customerEmail: string;
  startsAt: string;
  totalAmount: number;
  status: ReservationStatus;
  serviceNames: string[];
  paymentStatus: 'pending' | 'approved' | 'failed' | 'refunded' | null;
}

export interface AdminDashboardData {
  categories: AdminCategory[];
  services: AdminService[];
  businessHours: AdminBusinessHour[];
  blockedDates: AdminBlockedDate[];
  reservations: AdminReservation[];
}

interface ServiceRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string;
  is_active: boolean;
  service_categories: Array<{ name: string }> | null;
}

interface BusinessHourRow {
  id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
}

interface BlockedDateRow {
  id: string;
  blocked_date: string;
  reason: string | null;
  is_active: boolean;
}

interface ReservationRow {
  id: string;
  starts_at: string;
  total_amount: number | string;
  status: ReservationStatus;
  profiles: Array<{ full_name: string | null; email: string }> | null;
  reservation_items: Array<{ service_name_snapshot: string }> | null;
  payments: Array<{ status: 'pending' | 'approved' | 'failed' | 'refunded'; created_at: string }> | null;
}

function mapService(row: ServiceRow): AdminService {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.service_categories?.[0]?.name ?? 'Sin categoría',
    name: row.name,
    description: row.description,
    durationMinutes: Number(row.duration_minutes),
    price: Number(row.price),
    isActive: row.is_active,
  };
}

function mapReservation(row: ReservationRow): AdminReservation {
  const payment = [...(row.payments ?? [])].sort(
    (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
  )[0] ?? null;

  return {
    id: row.id,
    customerName: row.profiles?.[0]?.full_name ?? null,
    customerEmail: row.profiles?.[0]?.email ?? 'Cliente sin correo',
    startsAt: row.starts_at,
    totalAmount: Number(row.total_amount),
    status: row.status,
    serviceNames: (row.reservation_items ?? []).map((item) => item.service_name_snapshot),
    paymentStatus: payment?.status ?? null,
  };
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const client = requireSupabaseClient();
  const [categoriesResult, servicesResult, businessHoursResult, blockedDatesResult, reservationsResult] = await Promise.all([
    client.from('service_categories').select('id, name').order('display_order').order('name'),
    client
      .from('services')
      .select('id, category_id, name, description, duration_minutes, price, is_active, service_categories(name)')
      .order('name'),
    client.from('business_hours').select('id, day_of_week, opens_at, closes_at, is_active').order('day_of_week'),
    client.from('blocked_dates').select('id, blocked_date, reason, is_active').order('blocked_date', { ascending: false }),
    client
      .from('reservations')
      .select('id, starts_at, total_amount, status, profiles(full_name, email), reservation_items(service_name_snapshot), payments(status, created_at)')
      .order('starts_at', { ascending: false })
      .limit(30),
  ]);

  const results = [categoriesResult, servicesResult, businessHoursResult, blockedDatesResult, reservationsResult];

  if (results.some((result) => result.error)) {
    throw new AppError('No pudimos cargar la información de administración.');
  }

  return {
    categories: (categoriesResult.data ?? []) as AdminCategory[],
    services: ((servicesResult.data ?? []) as ServiceRow[]).map(mapService),
    businessHours: ((businessHoursResult.data ?? []) as BusinessHourRow[]).map((row) => ({
      id: row.id,
      dayOfWeek: Number(row.day_of_week),
      opensAt: row.opens_at.slice(0, 5),
      closesAt: row.closes_at.slice(0, 5),
      isActive: row.is_active,
    })),
    blockedDates: ((blockedDatesResult.data ?? []) as BlockedDateRow[]).map((row) => ({
      id: row.id,
      date: row.blocked_date,
      reason: row.reason,
      isActive: row.is_active,
    })),
    reservations: ((reservationsResult.data ?? []) as ReservationRow[]).map(mapReservation),
  };
}
