import { MasterDataPage } from '../components/MasterDataPage';
import { processHooks } from '../hooks/useCatalog';

/** Catálogo de tipos de proceso. */
export function ProcessesPage() {
  const query = processHooks.useList();
  const createMutation = processHooks.useCreate();
  const updateMutation = processHooks.useUpdate();
  const deleteMutation = processHooks.useDelete();

  return (
    <MasterDataPage
      title="Procesos"
      subtitle="Tipos de proceso que aplicas a tus productos."
      addButton="Nuevo proceso"
      newTitle="Nuevo proceso"
      editTitle="Editar proceso"
      emptyTitle="Aún no hay procesos"
      emptyDescription="Agrega tu primer proceso para empezar el catálogo."
      fields={[
        {
          key: 'name',
          label: 'Nombre del proceso',
          placeholder: 'Ej.: Deshidratada',
          required: true,
        },
      ]}
      query={query}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
      getPrimary={(item) => item.name}
      toFormValues={(item) => ({ name: item.name })}
    />
  );
}
