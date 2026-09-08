import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function MyReservationsPage() {
  return (
    <PagePlaceholder
      eyebrow="Mis reservas"
      title="Tus próximas citas e historial aparecerán aquí"
      description="Esta vista estará protegida para que cada cliente acceda solo a sus propias reservas, pagos y acciones permitidas."
      nextPhase="Disponible en la fase 6, tras implementar autenticación, reservas y pagos."
    />
  );
}
