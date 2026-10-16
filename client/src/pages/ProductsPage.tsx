import { MasterDataPage } from '../components/MasterDataPage';
import { productHooks } from '../hooks/useCatalog';

/** Catálogo de productos. */
export function ProductsPage() {
  const query = productHooks.useList();
  const createMutation = productHooks.useCreate();
  const updateMutation = productHooks.useUpdate();
  const deleteMutation = productHooks.useDelete();

  return (
    <MasterDataPage
      title="Productos"
      subtitle="Catálogo de frutas o productos que procesas."
      addButton="Nuevo producto"
      newTitle="Nuevo producto"
      editTitle="Editar producto"
      emptyTitle="Aún no hay productos"
      emptyDescription="Agrega tu primer producto para empezar el catálogo."
      fields={[
        { key: 'name', label: 'Nombre del producto', placeholder: 'Ej.: Piña', required: true },
        {
          key: 'description',
          label: 'Descripción (opcional)',
          placeholder: 'Ej.: Piña gold extra dulce',
        },
      ]}
      query={query}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
      getPrimary={(item) => item.name}
      getSecondary={(item) => item.description}
      toFormValues={(item) => ({ name: item.name, description: item.description ?? '' })}
    />
  );
}
