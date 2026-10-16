import { MasterDataPage } from '../components/MasterDataPage';
import { clientHooks } from '../hooks/useCatalog';

/** Catálogo de clientes (compradores). */
export function ClientsPage() {
  const query = clientHooks.useList();
  const createMutation = clientHooks.useCreate();
  const updateMutation = clientHooks.useUpdate();
  const deleteMutation = clientHooks.useDelete();

  return (
    <MasterDataPage
      title="Clientes"
      subtitle="Compradores que registras en tus ventas."
      addButton="Nuevo cliente"
      newTitle="Nuevo cliente"
      editTitle="Editar cliente"
      emptyTitle="Aún no hay clientes"
      emptyDescription="Agrega tu primer cliente para empezar el catálogo."
      fields={[
        { key: 'name', label: 'Nombre del cliente', placeholder: 'Ej.: Mercado La Esquina', required: true },
        { key: 'contact', label: 'Contacto (opcional)', placeholder: 'Teléfono o correo' },
      ]}
      query={query}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
      getPrimary={(item) => item.name}
      getSecondary={(item) => item.contact}
      toFormValues={(item) => ({ name: item.name, contact: item.contact ?? '' })}
    />
  );
}
