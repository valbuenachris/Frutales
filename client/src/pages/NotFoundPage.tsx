import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Feedback';
import { Layout, PageHeader } from '../components/Layout';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <Layout>
      <PageHeader title="No encontrado" backTo="/" />
      <EmptyState
        title="Esta página no existe"
        description="El enlace puede estar roto o el proyecto fue eliminado."
        action={
          <Link to="/">
            <Button>Volver al inicio</Button>
          </Link>
        }
      />
    </Layout>
  );
}
