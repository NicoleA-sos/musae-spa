import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';
import type { ReservationStatus } from '../../types/domain';

interface FunctionErrorPayload {
  error?: unknown;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      const payload = (await context.clone().json().catch(() => null)) as FunctionErrorPayload | null;
      if (typeof payload?.error === 'string') return payload.error;
    }
  }

  return 'No fue posible guardar el cambio. Inténtalo nuevamente.';
}

export type AdminAction =
  | { action: 'create-service'; categoryId: string; name: string; description: string; durationMinutes: number; price: number; isActive: boolean }
  | { action: 'update-service'; serviceId: string; categoryId: string; name: string; description: string; durationMinutes: number; price: number; isActive: boolean }
  | { action: 'update-business-hours'; businessHourId: string; opensAt: string; closesAt: string; isActive: boolean }
  | { action: 'create-blocked-date'; date: string; reason: string }
  | { action: 'update-blocked-date'; blockedDateId: string; isActive: boolean }
  | { action: 'update-reservation-status'; reservationId: string; status: ReservationStatus; cancellationReason: string };

export async function executeAdminAction(action: AdminAction): Promise<string> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<{ message?: string }>('admin-manage', { body: action });

  if (error || !data) throw new AppError(await getFunctionErrorMessage(error));

  return data.message || 'Cambio guardado correctamente.';
}
