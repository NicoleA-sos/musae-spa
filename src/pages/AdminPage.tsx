import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function AdminPage() {
  return (
    <PagePlaceholder
      eyebrow="Administración"
      title="Panel reservado para el equipo del salón"
      description="Los administradores podrán gestionar catálogo, precios, horarios, bloqueos y reservas desde un área protegida por roles."
      nextPhase="Disponible en una fase posterior, con permisos administrativos verificados en Supabase."
    />
  );
}
