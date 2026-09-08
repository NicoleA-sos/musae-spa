import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <>
      <section className="overflow-hidden bg-[#2d1937] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-200">Tu momento, bien cuidado</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Reserva tu próxima cita de belleza sin complicaciones.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-rose-100 sm:text-lg">
              Elige tus servicios, revisa horarios reales y gestiona tus reservas desde un solo lugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/reservar"
                className="rounded-xl bg-[#f2b6c5] px-5 py-3 text-center text-sm font-bold text-[#45152e] transition hover:bg-white"
              >
                Reservar una cita
              </Link>
              <Link
                to="/servicios"
                className="rounded-xl border border-rose-200/60 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver servicios
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-rose-200/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold text-rose-100">Así funcionará tu reserva</p>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-rose-50">
              <li><span className="mr-3 font-display text-xl text-[#f2b6c5]">01</span>Elige uno o más servicios.</li>
              <li><span className="mr-3 font-display text-xl text-[#f2b6c5]">02</span>Consulta horarios disponibles en tiempo real.</li>
              <li><span className="mr-3 font-display text-xl text-[#f2b6c5]">03</span>Confirma y gestiona tu cita desde tu perfil.</li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
        {[
          ['Horarios claros', 'La disponibilidad se validará antes de confirmar cada reserva.'],
          ['Precios transparentes', 'El total se calculará con precios vigentes y quedará guardado en tu cita.'],
          ['Control de tu cita', 'Podrás revisar próximas reservas, historial y opciones de cancelación.'],
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-rose-100 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-[#3b1d43]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </section>
    </>
  );
}
