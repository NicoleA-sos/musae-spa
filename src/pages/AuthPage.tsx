import { useState, type ComponentProps } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { getUserFacingError } from '../lib/errors';
import { useAuth } from '../features/auth/AuthProvider';

type AuthMode = 'sign-in' | 'sign-up';

interface AuthLocationState {
  from?: string;
}

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];

export function AuthPage() {
  const { isConfigured, isLoading, user, signIn, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = (location.state as AuthLocationState | null)?.from ?? '/perfil';
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={destination} replace />;
  }

  const isSignUp = mode === 'sign-up';

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage('');
    setNotice('');
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');

    if (isSignUp && !fullName.trim()) {
      setErrorMessage('Escribe tu nombre para crear la cuenta.');
      return;
    }

    if (isSignUp && password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });

        if (needsEmailConfirmation) {
          setNotice('Revisa tu correo y confirma la cuenta antes de iniciar sesión.');
        } else {
          void navigate(destination, { replace: true });
        }
      } else {
        await signIn({ email: email.trim(), password });
        void navigate(destination, { replace: true });
      }
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible procesar la solicitud.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-9.5rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_28rem] lg:px-8">
      <div className="max-w-xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Tu cuenta Musaé</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937] sm:text-5xl">
          Reserva con una cuenta segura y personal.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Tu información, citas y pagos estarán asociados únicamente a tu sesión.
        </p>
      </div>

      <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] sm:p-8">
        <div className="flex rounded-xl bg-rose-50 p-1" role="tablist" aria-label="Acceso a tu cuenta">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              !isSignUp ? 'bg-white text-[#5c1741] shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => changeMode('sign-in')}
          >
            Ingresar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              isSignUp ? 'bg-white text-[#5c1741] shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => changeMode('sign-up')}
          >
            Crear cuenta
          </button>
        </div>

        {!isConfigured ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
            Falta configurar la conexión con Supabase. Revisa el archivo <code>.env.local</code> y reinicia la aplicación.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            {isSignUp ? (
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="full-name">
                  Nombre completo
                </label>
                <input
                  id="full-name"
                  className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={isSignUp ? 8 : undefined}
                required
              />
              {isSignUp ? <p className="mt-2 text-sm text-slate-500">Mínimo 8 caracteres.</p> : null}
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {notice ? (
              <output className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                {notice}
              </output>
            ) : null}

            <button
              type="submit"
              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-[#2d1937] px-4 text-sm font-semibold text-white transition hover:bg-[#4a254f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Procesando…' : isSignUp ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
