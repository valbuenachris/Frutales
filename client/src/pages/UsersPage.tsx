import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '../hooks/useUsers';
import { cn } from '../lib/format';
import type { User, UserRole } from '../types/auth';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
};

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

const EMPTY_FORM: FormValues = {
  name: '',
  email: '',
  password: '',
  role: 'usuario',
  active: true,
};

type ModalState = { mode: 'new' } | { mode: 'edit'; user: User } | null;

/** Administración de usuarios: solo accesible para el rol admin. */
export function UsersPage() {
  const { user: currentUser } = useAuth();
  const query = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [modal, setModal] = useState<ModalState>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const resetMutations = () => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  };

  const openNew = () => {
    resetMutations();
    setValues(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: 'new' });
  };

  const openEdit = (user: User) => {
    resetMutations();
    setValues({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setFormError(null);
    setModal({ mode: 'edit', user });
  };

  const closeModal = () => {
    setModal(null);
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!email || !email.includes('@')) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    if (modal?.mode === 'new' && values.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (values.password && values.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setFormError(null);

    if (modal?.mode === 'edit') {
      updateMutation.mutate(
        {
          id: modal.user.id,
          input: {
            name,
            email,
            role: values.role,
            active: values.active,
            ...(values.password ? { password: values.password } : {}),
          },
        },
        { onSuccess: closeModal },
      );
    } else {
      createMutation.mutate(
        { name, email, password: values.password, role: values.role, active: values.active },
        { onSuccess: closeModal },
      );
    }
  };

  const handleDelete = (user: User) => {
    if (!window.confirm(`¿Eliminar el usuario "${user.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    deleteMutation.mutate(user.id);
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Administra quién puede acceder a Frutales y con qué rol."
        action={<Button onClick={openNew}>Nuevo usuario</Button>}
      />

      {query.isPending ? (
        <LoadingState label="Cargando usuarios…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Aún no hay usuarios"
          description="Crea el primer usuario para que pueda iniciar sesión."
          action={<Button onClick={openNew}>Nuevo usuario</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((user) => {
            const isSelf = currentUser?.id === user.id;
            return (
              <li key={user.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-ink">{user.name}</p>
                      {isSelf ? (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          Tú
                        </span>
                      ) : null}
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {ROLE_LABEL[user.role]}
                      </span>
                      {!user.active ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                          Inactivo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => openEdit(user)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => handleDelete(user)}
                      disabled={isSelf || deleteMutation.isPending}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deleteMutation.error ? (
        <p className="mt-4 text-center text-sm text-rose-600">{deleteMutation.error.message}</p>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={closeModal}
            className="absolute inset-0 cursor-default bg-slate-900/40"
          />
          <div className="relative w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            <h2 className="text-lg font-bold text-ink">
              {modal.mode === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
              <Field label="Nombre completo" htmlFor="user-name">
                <Input
                  id="user-name"
                  value={values.name}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ej.: Ana Pérez"
                  autoComplete="off"
                />
              </Field>

              <Field label="Correo electrónico" htmlFor="user-email">
                <Input
                  id="user-email"
                  type="email"
                  inputMode="email"
                  value={values.email}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="correo@ejemplo.com"
                  autoComplete="off"
                />
              </Field>

              <Field
                label={modal.mode === 'new' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                htmlFor="user-password"
                hint={
                  modal.mode === 'new'
                    ? 'Mínimo 8 caracteres.'
                    : 'Déjala vacía para conservar la contraseña actual.'
                }
              >
                <Input
                  id="user-password"
                  type="password"
                  value={values.password}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Rol" htmlFor="user-role">
                <Select
                  id="user-role"
                  value={values.role}
                  disabled={modal.mode === 'edit' && modal.user.id === currentUser?.id}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      role: event.target.value as UserRole,
                    }))
                  }
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </Select>
              </Field>

              <label
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 px-4',
                  modal.mode === 'edit' && modal.user.id === currentUser?.id
                    ? 'bg-stone-50 text-slate-400'
                    : 'bg-white text-ink',
                )}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-teal-700"
                  checked={values.active}
                  disabled={modal.mode === 'edit' && modal.user.id === currentUser?.id}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                <span className="text-sm font-medium">Usuario activo</span>
              </label>

              {formError || mutationError ? (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {formError ?? mutationError?.message}
                </p>
              ) : null}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" fullWidth onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" fullWidth disabled={isSaving}>
                  {isSaving ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
