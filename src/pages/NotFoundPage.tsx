import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b53662]">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[#2d1937]">Esta página no existe.</h1>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-[#2d1937] px-4 py-2.5 text-sm font-semibold text-white">
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
