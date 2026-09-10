import { useState, type PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/AuthProvider';
import { ConnectionStatus } from '../system/ConnectionStatus';

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/reservar', label: 'Reservar' },
];

export function AppShell({ children }: PropsWithChildren) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isLoading, profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setIsMenuOpen(false);
  const userNavigation = user
    ? [
        ...navigation,
        { to: '/mis-reservas', label: 'Mis reservas' },
        ...(profile?.role === 'admin' ? [{ to: '/administracion', label: 'Administración' }] : []),
      ]
    : navigation;

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      closeMenu();
      void navigate('/');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-rose-100 bg-rose-50/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-[#2d1937]"
            onClick={closeMenu}
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#d65678] text-sm text-white" aria-hidden="true">
              M
            </span>
            Musaé Spa
          </NavLink>

          <button
            type="button"
            className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-[#4a254f] md:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            {isMenuOpen ? 'Cerrar' : 'Menú'}
          </button>

          <nav
            id="primary-navigation"
            className={`${isMenuOpen ? 'flex' : 'hidden'} absolute inset-x-4 top-[4.5rem] flex-col gap-1 rounded-2xl border border-rose-100 bg-white p-3 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
            aria-label="Navegación principal"
          >
            {userNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-rose-200/70 text-[#5c1741]'
                      : 'text-slate-600 hover:bg-rose-100 hover:text-[#5c1741]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!isLoading && user ? (
              <>
                <NavLink
                  to="/perfil"
                  onClick={closeMenu}
                  className="mt-1 rounded-lg bg-[#2d1937] px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-[#4a254f] md:ml-2 md:mt-0"
                >
                  {profile?.fullName?.split(' ')[0] || 'Mi cuenta'}
                </NavLink>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-rose-100 hover:text-[#5c1741] disabled:opacity-60"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Saliendo…' : 'Salir'}
                </button>
              </>
            ) : !isLoading ? (
              <NavLink
                to="/iniciar-sesion"
                onClick={closeMenu}
                className="mt-1 rounded-lg bg-[#2d1937] px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-[#4a254f] md:ml-2 md:mt-0"
              >
                Ingresar
              </NavLink>
            ) : null}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Musaé Spa. Reservas de belleza en Perú.</p>
          <ConnectionStatus />
        </div>
      </footer>
    </div>
  );
}
