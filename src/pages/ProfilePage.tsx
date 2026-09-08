import { useState, type ComponentProps } from 'react';

import { useAuth } from '../features/auth/AuthProvider';
import { getUserFacingError } from '../lib/errors';

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];

interface ProfileDetailsFormProps {
  email: string;
  initialFullName: string;
  initialPhone: string;
  isLoading: boolean;
}

function ProfileDetailsForm({
  email,
  initialFullName,
  initialPhone,
  isLoading,
}: ProfileDetailsFormProps) {
  const { updateProfile } = useAuth();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsSaving(true);

    try {
      await updateProfile({ fullName, phone });
      setNotice('Tus datos se guardaron correctamente.');
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No se pudo actualizar tu perfil.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="mt-8 rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="profile-email">
            Correo electrónico
          </label>
          <input
            id="profile-email"
            className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-500"
            value={email}
            disabled
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="profile-phone">
            Teléfono
          </label>
          <input
            id="profile-phone"
            className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
            type="tel"
            autoComplete="tel"
            placeholder="Ej. 999 999 999"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="profile-name">
          Nombre completo
        </label>
        <input
          id="profile-name"
          className="mt-2 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>

      {errorMessage ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {notice ? (
        <output className="mt-5 block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
          {notice}
        </output>
      ) : null}

      <button
        type="submit"
        className="mt-6 h-11 rounded-xl bg-[#2d1937] px-5 text-sm font-semibold text-white transition hover:bg-[#4a254f] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving || isLoading}
      >
        {isSaving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

export function ProfilePage() {
  const { isLoading, profile, user } = useAuth();
  const profileKey = (user?.id ?? 'profile') + (profile ? '-ready' : '-loading');

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Mi cuenta</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">
        Tus datos personales
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
        Solo tú puedes consultar y actualizar esta información.
      </p>

      <ProfileDetailsForm
        key={profileKey}
        email={user?.email ?? ''}
        initialFullName={profile?.fullName ?? ''}
        initialPhone={profile?.phone ?? ''}
        isLoading={isLoading}
      />
    </section>
  );
}
