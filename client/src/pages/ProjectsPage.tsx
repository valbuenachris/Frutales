import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ErrorState, EmptyState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { ProjectCard } from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

/** Project list: every batch with net yield, profit and payment status. */
export function ProjectsPage() {
  const { data: projects, isPending, isError, error, refetch } = useProjects();

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
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
