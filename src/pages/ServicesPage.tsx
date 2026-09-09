import { Link } from 'react-router-dom';

import { useServiceCatalog } from '../features/services/useServiceCatalog';
import { formatDuration, formatPen } from '../lib/formatters';

export function ServicesPage() {
  const { categories, errorMessage, isLoading } = useServiceCatalog();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Servicios</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937] sm:text-5xl">
          Elige el cuidado que quieres regalarte.
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Precios y duración obtenidos directamente desde Musaé Spa.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-3xl bg-rose-100" />
          ))}
          <span className="sr-only">Cargando servicios…</span>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
          <p className="font-semibold">No pudimos mostrar el catálogo.</p>
          <p className="mt-1 text-sm leading-6">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && categories.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-rose-100 bg-white p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-[#2d1937]">Aún no hay servicios disponibles.</h2>
          <p className="mt-3 text-slate-600">Vuelve a intentarlo pronto.</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage
        ? categories.map((category) => (
            <section key={category.id} className="mt-10 first:mt-10">
              <div className="flex flex-col justify-between gap-3 border-b border-rose-100 pb-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="font-display text-3xl font-semibold text-[#2d1937]">{category.name}</h2>
                  {category.description ? <p className="mt-1 text-slate-600">{category.description}</p> : null}
                </div>
                <p className="text-sm text-slate-500">{category.services.length} opciones</p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {category.services.map((service) => (
                  <article
                    key={service.id}
                    className="flex min-h-56 flex-col rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(82,24,57,0.5)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-2xl font-semibold text-[#3b1d43]">{service.name}</h3>
                      <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-[#8c294b]">
                        {formatDuration(service.durationMinutes)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {service.description || 'Un servicio pensado para que disfrutes tu momento.'}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                      <strong className="text-lg text-[#2d1937]">{formatPen(service.price)}</strong>
                      <Link
                        to="/reservar"
                        className="rounded-xl bg-[#2d1937] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a254f]"
                      >
                        Reservar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        : null}
    </section>
  );
}
