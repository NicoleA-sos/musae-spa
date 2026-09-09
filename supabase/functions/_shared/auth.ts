import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

import { jsonResponse } from './cors.ts';

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error('Falta la configuración segura del servidor.');
  }

  return value;
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw jsonResponse(request, { error: 'Debes iniciar sesión para continuar.' }, 401);
  }

  const client = createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw jsonResponse(request, { error: 'La sesión no es válida. Inicia sesión nuevamente.' }, 401);
  }

  return user;
}

