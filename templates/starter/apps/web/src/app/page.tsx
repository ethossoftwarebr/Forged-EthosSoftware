import { redirect } from 'next/navigation';

/**
 * Root `/` — server component que redireciona para `/dashboard`.
 *
 * Fluxo final:
 *  - sem cookie → `(dashboard)/layout` detecta `!user` pós-hidratação e
 *    redireciona pra `/login`.
 *  - com cookie → renderiza o shell autenticado normalmente.
 */
export default function RootPage() {
  redirect('/dashboard');
}
