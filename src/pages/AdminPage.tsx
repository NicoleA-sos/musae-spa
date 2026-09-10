import { useEffect, useRef, useState } from 'react';

import { executeAdminAction, type AdminAction } from '../features/admin/adminApi';
import {
  fetchAdminDashboard,
  type AdminBusinessHour,
  type AdminCategory,
  type AdminReservation,
  type AdminService,
} from '../features/admin/adminRepository';
import { getUserFacingError } from '../lib/errors';
import { formatDateTimeInLima, formatPen } from '../lib/formatters';
import type { ReservationStatus } from '../types/domain';

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function paymentStatusLabel(status: AdminReservation['paymentStatus']): string {
  if (status === 'approved') return 'Pago aprobado';
  if (status === 'failed') return 'Último intento rechazado';
  if (status === 'refunded') return 'Pago reembolsado';
  return 'Pago pendiente';
}

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value : '';
}

interface EditorProps {
  isSaving: boolean;
  onAction: (action: AdminAction, actionKey: string) => void;
}

function ServiceEditor({ categories, isSaving, onAction, service }: EditorProps & { categories: AdminCategory[]; service: AdminService }) {
  return (
    <form
      className="grid gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm lg:grid-cols-[1.1fr_1fr_8rem_8rem_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onAction({
          action: 'update-service', serviceId: service.id, categoryId: getString(formData, 'categoryId'), name: getString(formData, 'name'), description: getString(formData, 'description'), durationMinutes: Number(formData.get('durationMinutes')), price: Number(formData.get('price')), isActive: formData.get('isActive') === 'on',
        }, 'service:' + service.id);
      }}
    >
      <label className="text-sm font-semibold text-slate-700">Servicio<input name="name" defaultValue={service.name} required maxLength={120} className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700">Categoría<select name="categoryId" defaultValue={service.categoryId} className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Minutos<input name="durationMinutes" type="number" min="15" max="480" step="15" defaultValue={service.durationMinutes} required className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700">Precio (S/)<input name="price" type="number" min="0" max="10000" step="0.01" defaultValue={service.price} required className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 font-normal" /></label>
      <div className="flex items-end gap-3"><label className="mb-2 flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked={service.isActive} /> Activo</label><button disabled={isSaving} className="h-10 rounded-lg bg-[#2d1937] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Guardando…' : 'Guardar'}</button></div>
      <label className="text-sm font-semibold text-slate-700 lg:col-span-5">Descripción<input name="description" defaultValue={service.description ?? ''} maxLength={800} className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 font-normal" /></label>
    </form>
  );
}

function NewServiceForm({ categories, isSaving, onAction }: EditorProps & { categories: AdminCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl border border-dashed border-[#d65678] bg-rose-50 p-4 lg:grid-cols-[1.1fr_1fr_8rem_8rem_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onAction({
          action: 'create-service', categoryId: getString(formData, 'categoryId'), name: getString(formData, 'name'), description: getString(formData, 'description'), durationMinutes: Number(formData.get('durationMinutes')), price: Number(formData.get('price')), isActive: formData.get('isActive') === 'on',
        }, 'service:new');
      }}
    >
      <label className="text-sm font-semibold text-slate-700">Nuevo servicio<input name="name" placeholder="Ej. Corte express" required maxLength={120} className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700">Categoría<select name="categoryId" defaultValue={categories[0].id} className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Minutos<input name="durationMinutes" type="number" min="15" max="480" step="15" defaultValue="45" required className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700">Precio (S/)<input name="price" type="number" min="0" max="10000" step="0.01" defaultValue="0" required className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal" /></label>
      <div className="flex items-end gap-3"><label className="mb-2 flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> Activo</label><button disabled={isSaving} className="h-10 rounded-lg bg-[#d65678] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Creando…' : 'Crear'}</button></div>
      <label className="text-sm font-semibold text-slate-700 lg:col-span-5">Descripción<input name="description" placeholder="Descripción opcional" maxLength={800} className="mt-1 h-10 w-full rounded-lg border border-rose-200 bg-white px-2 font-normal" /></label>
    </form>
  );
}

function BusinessHourEditor({ hour, isSaving, onAction }: EditorProps & { hour: AdminBusinessHour }) {
  return (
    <form
      className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-3 rounded-xl border border-rose-100 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onAction({ action: 'update-business-hours', businessHourId: hour.id, opensAt: getString(formData, 'opensAt'), closesAt: getString(formData, 'closesAt'), isActive: formData.get('isActive') === 'on' }, 'hour:' + hour.id);
      }}
    >
      <label className="text-sm font-semibold text-[#2d1937]">{dayLabels[hour.dayOfWeek]}<span className="mt-1 block text-xs font-normal text-slate-500">Atención al público</span></label>
      <label className="text-xs font-semibold text-slate-600">Abre<input name="opensAt" type="time" defaultValue={hour.opensAt} required className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Cierra<input name="closesAt" type="time" defaultValue={hour.closesAt} required className="mt-1 h-10 w-full rounded-lg border border-rose-200 px-2 text-sm font-normal" /></label>
      <div className="flex flex-wrap items-center justify-end gap-3"><label className="flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked={hour.isActive} /> Activo</label><button disabled={isSaving} className="h-10 rounded-lg border border-[#2d1937] px-3 text-sm font-semibold text-[#2d1937] disabled:opacity-60">{isSaving ? '…' : 'Guardar'}</button></div>
    </form>
  );
}

function ReservationEditor({ isSaving, onAction, reservation }: EditorProps & { reservation: AdminReservation }) {
  const isClosed = ['cancelled', 'completed', 'no_show'].includes(reservation.status);

  return (
    <form
      className="grid gap-3 rounded-2xl border border-rose-100 bg-white p-4 sm:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onAction({ action: 'update-reservation-status', reservationId: reservation.id, status: getString(formData, 'status') as ReservationStatus, cancellationReason: getString(formData, 'cancellationReason') }, 'reservation:' + reservation.id);
      }}
    >
      <div>
        <p className="font-semibold text-[#2d1937]">{reservation.customerName || reservation.customerEmail}</p>
        <p className="mt-1 text-sm text-slate-600">{formatDateTimeInLima(reservation.startsAt)} · {reservation.serviceNames.join(' · ') || 'Sin servicios'}</p>
        <p className="mt-1 text-sm text-slate-600">{formatPen(reservation.totalAmount)} · {paymentStatusLabel(reservation.paymentStatus)}</p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <select name="status" defaultValue={reservation.status} disabled={isClosed} className="h-10 rounded-lg border border-rose-200 bg-white px-2 text-sm disabled:bg-slate-100"><option value="pending">Pendiente de pago</option><option value="confirmed">Confirmada</option><option value="completed">Atendida</option><option value="no_show">No asistió</option><option value="cancelled">Cancelada</option></select>
        <input name="cancellationReason" placeholder="Motivo de cancelación (opcional)" maxLength={500} disabled={isClosed} className="h-10 w-full rounded-lg border border-rose-200 px-2 text-sm sm:w-60 disabled:bg-slate-100" />
        <button disabled={isSaving || isClosed} className="h-10 rounded-lg bg-[#2d1937] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Guardando…' : isClosed ? 'Reserva cerrada' : 'Actualizar estado'}</button>
      </div>
    </form>
  );
}

export function AdminPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [activeAction, setActiveAction] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);

  async function refreshDashboard() {
    const nextData = await fetchAdminDashboard();
    setData(nextData);
  }

  useEffect(() => {
    let isActive = true;
    void fetchAdminDashboard()
      .then((nextData) => { if (isActive) setData(nextData); })
      .catch((error) => { if (isActive) setErrorMessage(getUserFacingError(error, 'No pudimos cargar la administración.')); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (errorMessage || notice) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMessage, notice]);

  async function handleAction(action: AdminAction, actionKey: string) {
    setErrorMessage('');
    setNotice('');
    setActiveAction(actionKey);

    try {
      const message = await executeAdminAction(action);
      await refreshDashboard();
      setNotice(message);
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible guardar el cambio.'));
    } finally {
      setActiveAction('');
    }
  }

  if (isLoading) return <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-3xl bg-rose-100" /></section>;

  if (!data) {
    return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-red-200 bg-white p-8 text-center"><h1 className="font-display text-3xl font-semibold text-[#2d1937]">No pudimos abrir la administración</h1><p className="mt-3 text-slate-600">{errorMessage || 'Inténtalo nuevamente.'}</p></div></section>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Administración</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">Gestiona la operación del salón</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Los cambios se validan en el servidor y quedan asociados a la cuenta administradora.</p>
      {errorMessage || notice ? (
        <div ref={feedbackRef}>
          {errorMessage ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p> : null}
          {notice ? <output className="mt-6 block rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</output> : null}
        </div>
      ) : null}

      <div className="mt-10 space-y-12">
        <section aria-labelledby="admin-services">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="admin-services" className="font-display text-3xl font-semibold text-[#2d1937]">Servicios</h2><span className="text-sm text-slate-500">{data.services.length} registrados</span></div>
          <p className="mt-2 text-sm text-slate-600">Edita precios, duración, categoría o disponibilidad. Desactiva un servicio para ocultarlo al público sin borrar su historial.</p>
          <div className="mt-5 space-y-4">{data.services.map((service) => <ServiceEditor key={service.id} service={service} categories={data.categories} isSaving={activeAction === 'service:' + service.id} onAction={(action, actionKey) => void handleAction(action, actionKey)} />)}</div>
          <NewServiceForm categories={data.categories} isSaving={activeAction === 'service:new'} onAction={(action, actionKey) => void handleAction(action, actionKey)} />
        </section>

        <section aria-labelledby="admin-hours">
          <h2 id="admin-hours" className="font-display text-3xl font-semibold text-[#2d1937]">Horarios de atención</h2>
          <p className="mt-2 text-sm text-slate-600">Estos horarios definen cuándo pueden encontrar citas disponibles los clientes.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{data.businessHours.map((hour) => <BusinessHourEditor key={hour.id} hour={hour} isSaving={activeAction === 'hour:' + hour.id} onAction={(action, actionKey) => void handleAction(action, actionKey)} />)}</div>
        </section>

        <section aria-labelledby="admin-blocked-dates">
          <h2 id="admin-blocked-dates" className="font-display text-3xl font-semibold text-[#2d1937]">Fechas bloqueadas</h2>
          <p className="mt-2 text-sm text-slate-600">Bloquea días no laborables, feriados o fechas especiales. No se ofrecerán horarios para esas fechas.</p>
          <form className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-100 bg-white p-4 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); void handleAction({ action: 'create-blocked-date', date: getString(formData, 'date'), reason: getString(formData, 'reason') }, 'blocked:new'); }}>
            <label className="text-sm font-semibold text-slate-700">Fecha<input name="date" type="date" required className="mt-1 block h-10 rounded-lg border border-rose-200 px-2 font-normal" /></label><label className="flex-1 text-sm font-semibold text-slate-700">Motivo (opcional)<input name="reason" maxLength={300} placeholder="Ej. Feriado" className="mt-1 block h-10 w-full rounded-lg border border-rose-200 px-2 font-normal" /></label><button disabled={activeAction === 'blocked:new'} className="h-10 rounded-lg bg-[#2d1937] px-4 text-sm font-semibold text-white disabled:opacity-60">{activeAction === 'blocked:new' ? 'Bloqueando…' : 'Bloquear fecha'}</button>
          </form>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.blockedDates.filter((blockedDate) => blockedDate.isActive).map((blockedDate) => <article key={blockedDate.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white p-4"><div><p className="font-semibold text-[#2d1937]">{blockedDate.date}</p><p className="mt-1 text-sm text-slate-600">{blockedDate.reason || 'Sin motivo'}</p></div><button disabled={activeAction === 'blocked:' + blockedDate.id} onClick={() => void handleAction({ action: 'update-blocked-date', blockedDateId: blockedDate.id, isActive: false }, 'blocked:' + blockedDate.id)} className="text-sm font-semibold text-[#8f244c] disabled:opacity-60">Desbloquear</button></article>)}{data.blockedDates.filter((blockedDate) => blockedDate.isActive).length === 0 ? <p className="text-sm text-slate-600">No hay fechas bloqueadas activas.</p> : null}</div>
        </section>

        <section aria-labelledby="admin-reservations">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="admin-reservations" className="font-display text-3xl font-semibold text-[#2d1937]">Reservas recientes</h2><span className="text-sm text-slate-500">Últimas {data.reservations.length}</span></div>
          <p className="mt-2 text-sm text-slate-600">Una reserva solo puede confirmarse si tiene pago aprobado. Las confirmadas se pueden finalizar, marcar como no asistidas o cancelar con las reglas de tiempo establecidas.</p>
          <div className="mt-5 space-y-4">{data.reservations.map((reservation) => <ReservationEditor key={reservation.id} reservation={reservation} isSaving={activeAction === 'reservation:' + reservation.id} onAction={(action, actionKey) => void handleAction(action, actionKey)} />)}</div>
          {data.reservations.length === 0 ? <p className="mt-5 rounded-xl border border-rose-100 bg-white p-4 text-slate-600">Aún no hay reservas para administrar.</p> : null}
        </section>
      </div>
    </section>
  );
}
