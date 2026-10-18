import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';

/** Pantalla de inicio de sesión (mobile-first). */
export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;
  const destination = from && !from.startsWith('/login') ? from : '/';

  if (user) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white shadow-sm">
            F
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">Frutales</h1>
          <p className="mt-1 text-sm text-slate-500">Control de lotes, ventas y ganancias</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <h2 className="text-lg font-bold text-ink">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Ingresa con tu correo y contraseña.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <Field label="Correo electrónico" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </Field>

            <Field label="Contraseña" htmlFor="login-password">
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  className="pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex w-20 items-center justify-center text-sm font-medium text-brand"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </Field>

            {error ? (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
            ) : null}

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tienes acceso? Pide a un administrador que cree tu cuenta.
        </p>
      </div>
    </div>
  );
}
