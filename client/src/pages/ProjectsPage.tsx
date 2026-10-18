import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { ErrorState, EmptyState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { ProjectCard } from '../components/ProjectCard';
import { useDeleteProject, useProjects } from '../hooks/useProjects';
import type { Project } from '../types/project';

/** Project list: every batch with net yield, profit and payment status. */
export function ProjectsPage() {
  const { data: projects, isPending, isError, error, refetch } = useProjects();
  const deleteMutation = useDeleteProject();
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const requestDelete = (project: Project) => {
    deleteMutation.reset();
    setPendingDelete(project);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    // Deletes the project row and everything attached to it (expenses
    // cascade; sale data and receipts are columns of the same row).
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <>
      <PageHeader
        title="Proyectos"
        subtitle="Todos tus lotes de procesamiento."
        action={
          <Link to="/projects/new">
            <Button>Nuevo</Button>
          </Link>
        }
      />

      {isPending ? (
        <LoadingState label="Cargando proyectos…" />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Aún no hay proyectos"
          description="Crea tu primer lote para empezar a controlar costos y ganancias."
          action={
            <Link to="/projects/new">
              <Button>Crear proyecto</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onDelete={requestDelete} />
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation before deleting a project with all of its data */}
      {pendingDelete ? (
        <ConfirmDialog
          title="Eliminar proyecto"
          message={`¿Estás seguro de eliminar "${pendingDelete.name}" con todos sus datos (venta, gastos y comprobantes)? Esta acción no se puede deshacer.`}
          isBusy={deleteMutation.isPending}
          errorMessage={deleteMutation.error?.message ?? null}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}
