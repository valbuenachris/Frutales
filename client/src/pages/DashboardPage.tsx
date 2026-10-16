import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ErrorState, EmptyState, LoadingState } from '../components/Feedback';
import { Layout, PageHeader } from '../components/Layout';
import { ProjectCard } from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

/** Dashboard: clean list of every project with net yield and profit. */
export function DashboardPage() {
  const { data: projects, isPending, isError, error, refetch } = useProjects();

  return (
    <Layout>
      <PageHeader
        title="Frutales"
        subtitle="Controla costos, rendimiento y ganancia de tus lotes de fruta procesada."
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
    </Layout>
  );
}
