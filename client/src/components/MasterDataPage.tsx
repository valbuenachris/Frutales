import { useState, type FormEvent } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { EmptyState, ErrorState, LoadingState } from './Feedback';
import { PageHeader } from './Layout';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Input } from './ui/Input';

export interface CatalogFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface MasterDataPageProps<TItem extends { id: string }> {
  // Texts (all Spanish)
  title: string;
  subtitle: string;
  addButton: string;
  newTitle: string;
  editTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  // Field configuration for the modal form
  fields: CatalogFieldConfig[];
  // Data layer (TanStack Query hooks, provided by the page)
  query: UseQueryResult<TItem[], Error>;
  createMutation: UseMutationResult<TItem, Error, Record<string, string>>;
  updateMutation: UseMutationResult<TItem, Error, { id: string; input: Record<string, string> }>;
  deleteMutation: UseMutationResult<void, Error, string>;
  // Item rendering
  getPrimary: (item: TItem) => string;
  getSecondary?: (item: TItem) => string | null;
  toFormValues: (item: TItem) => Record<string, string>;
}

type ModalState<TItem> = { mode: 'new' } | { mode: 'edit'; item: TItem } | null;

/**
 * Mobile-first master data screen: list + bottom-sheet modal form.
 * Shared by the Products, Processes and Clients pages.
 */
export function MasterDataPage<TItem extends { id: string }>({
  title,
  subtitle,
  addButton,
  newTitle,
  editTitle,
  emptyTitle,
  emptyDescription,
  fields,
  query,
  createMutation,
  updateMutation,
  deleteMutation,
  getPrimary,
  getSecondary,
  toFormValues,
}: MasterDataPageProps<TItem>) {
  const [modal, setModal] = useState<ModalState<TItem>>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const resetMutations = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openNew = () => {
    resetMutations();
    setValues({});
    setFormError(null);
    setModal({ mode: 'new' });
  };

  const openEdit = (item: TItem) => {
    resetMutations();
    setValues(toFormValues(item));
    setFormError(null);
    setModal({ mode: 'edit', item });
  };

  const closeModal = () => {
    setModal(null);
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    for (const field of fields) {
      if (field.required && !(values[field.key] ?? '').trim()) {
        setFormError(`El campo «${field.label}» es obligatorio.`);
        return;
      }
    }
    setFormError(null);

    if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.item.id, input: values }, { onSuccess: closeModal });
    } else {
      createMutation.mutate(values, { onSuccess: closeModal });
    }
  };

  const handleDelete = (item: TItem) => {
    if (!window.confirm(`¿Eliminar "${getPrimary(item)}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    deleteMutation.mutate(item.id);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={<Button onClick={openNew}>{addButton}</Button>}
      />

      {query.isPending ? (
        <LoadingState label="Cargando…" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={<Button onClick={openNew}>{addButton}</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((item) => {
            const secondary = getSecondary?.(item) ?? null;
            return (
              <li
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">{getPrimary(item)}</p>
                    {secondary ? (
                      <p className="mt-0.5 truncate text-sm text-slate-500">{secondary}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => openEdit(item)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => handleDelete(item)}
                      disabled={deleteMutation.isPending}
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

      {/* Add/Edit modal (bottom sheet on mobile, centered card on desktop) */}
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
              {modal.mode === 'new' ? newTitle : editTitle}
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
              {fields.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={`catalog-${field.key}`}>
                  <Input
                    id={`catalog-${field.key}`}
                    value={values[field.key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    autoComplete="off"
                  />
                </Field>
              ))}

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
