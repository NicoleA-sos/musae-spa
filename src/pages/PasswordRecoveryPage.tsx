import { useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthProvider';
import { getUserFacingError } from '../lib/errors';

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];

export function PasswordRecoveryPage() {
  const { isConfigured, isLoading, requestPasswordReset, updatePassword, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isResettingPassword = Boolean(user);

  async function handleEmailSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setNotice('Si el correo pertenece a una cuenta, recibirás un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam.');
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible enviar el correo de recuperación.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');

    if (password.length < 8) {
      setErrorMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      setPassword('');
      setPasswordConfirmation('');
      setNotice('Tu contraseña fue actualizada. Ya puedes seguir usando tu cuenta.');
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible actualizar la contraseña.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-9.5rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_28rem] lg:px-8">
      <div className="max-w-xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Recupera tu acceso</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937] sm:text-5xl">
          {isResettingPassword ? 'Crea una nueva contraseña.' : 'Te ayudamos a volver a tu cuenta.'}
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          {isResettingPassword
            ? 'El enlace fue validado por Supabase. Elige una contraseña nueva para terminar el proceso.'
            : 'Te enviaremos un enlace seguro a tu correo. No necesitas compartir tu contraseña actual.'}
        </p>
      </div>

      <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] sm:p-8">
        {!isConfigured ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
            Falta configurar la conexión con Supabase. Revisa el archivo <code>.env.local</code> y reinicia la aplicación.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-slate-600" aria-live="polite">Comprobando el enlace…</p>
        ) : isResettingPassword ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit} noValidate>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="new-password">Nueva contraseña</label>
              <input id="new-password" className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-[#d65678] focus:ring-4 focus:ring-rose-100" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <p className="mt-2 text-sm text-slate-500">Mínimo 8 caracteres.</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="password-confirmation">Repite la nueva contraseña</label>
              <input id="password-confirmation" className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-[#d65678] focus:ring-4 focus:ring-rose-100" type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
            </div>
            <RecoveryMessages errorMessage={errorMessage} notice={notice} />
            <button type="submit" className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2d1937] px-4 text-sm font-semibold text-white transition hover:bg-[#4a254f] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleEmailSubmit} noValidate>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="recovery-email">Correo electrónico</label>
              <input id="recovery-email" className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <RecoveryMessages errorMessage={errorMessage} notice={notice} />
            <button type="submit" className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2d1937] px-4 text-sm font-semibold text-white transition hover:bg-[#4a254f] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <Link className="mt-5 block text-center text-sm font-semibold text-[#8f244c] hover:underline" to="/iniciar-sesion">
          Volver a iniciar sesión
        </Link>
      </div>
    </section>
  );
}

function RecoveryMessages({ errorMessage, notice }: { errorMessage: string; notice: string }) {
  return (
    <>
      {errorMessage ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">{errorMessage}</p> : null}
      {notice ? <output className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{notice}</output> : null}
    </>
  );
}
