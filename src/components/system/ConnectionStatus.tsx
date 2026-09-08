import { isSupabaseConfigured } from '../../lib/supabase';

export function ConnectionStatus() {
  return (
    <p className="text-xs">
      <span
        className={`mr-1.5 inline-block size-2 rounded-full ${
          isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
        aria-hidden="true"
      />
      {isSupabaseConfigured ? 'Supabase configurado' : 'Supabase pendiente de configurar'}
    </p>
  );
}
