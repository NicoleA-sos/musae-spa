import { Link } from 'react-router-dom';

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  nextPhase: string;
}

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  nextPhase,
}: PagePlaceholderProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl border border-rose-100 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b53662]">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2d1937] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-[#6a315d]">{nextPhase}</p>
        <Link
          to="/"
          className="mt-7 inline-flex rounded-xl bg-[#2d1937] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a254f]"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
