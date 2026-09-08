import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function BookingPage() {
  return (
    <PagePlaceholder
      eyebrow="Reservar"
      title="La reserva se validará desde el backend"
      description="El calendario mostrará horarios disponibles y una Edge Function comprobará duración, bloqueos, cruces y precios antes de crear la cita."
      nextPhase="Disponible en la fase 4, con las reglas de disponibilidad activas."
    />
  );
}
