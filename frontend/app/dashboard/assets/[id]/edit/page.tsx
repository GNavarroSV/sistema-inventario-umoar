'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AssetForm, assetToFormValues, buildUpdateAssetPayload } from '../../_components/asset-form';
import styles from '../../assets.module.css';
import { useAssetQuery, useUpdateAssetMutation } from '../../../../../hooks/assets/assets';

type UpdatedAssetResponse = {
  id?: string;
  data?: {
    id?: string;
  };
};

export default function EditAssetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = Number(params.id);
  const assetQuery = useAssetQuery(assetId);
  const updateAssetMutation = useUpdateAssetMutation();
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo(
    () => (assetQuery.data ? assetToFormValues(assetQuery.data as any) : undefined),
    [assetQuery.data],
  );

  if (assetQuery.isLoading) {
    return <p>Cargando formulario del activo...</p>;
  }

  if (assetQuery.isError) {
    return <p>No se pudo cargar el activo.</p>;
  }

  const handleSubmit = async (values: Parameters<typeof buildUpdateAssetPayload>[0]) => {
    setError(null);

    try {
      const response = (await updateAssetMutation.mutateAsync({
        id: assetId,
        data: buildUpdateAssetPayload(values),
      })) as UpdatedAssetResponse;

      const updatedId = response.data?.id ?? response.id ?? assetId;
      router.push(`/dashboard/assets/${updatedId}`);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'No se pudo actualizar el activo');
    }
  };

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Activos</p>
          <h1>Editar activo</h1>
          <p className={styles.leadText}>Ajusta la información general y el estado operativo del activo.</p>
        </div>

        <Link href={`/dashboard/assets/${assetId}`} className="button button--ghost">
          Volver al detalle
        </Link>
      </div>

      <AssetForm
        initialValues={initialValues}
        submitLabel="Guardar cambios"
        onSubmit={handleSubmit}
        onCancelHref={`/dashboard/assets/${assetId}`}
        isSubmitting={updateAssetMutation.isPending}
        error={error}
        showStatusFields
        draftCode={assetQuery.data?.code}
      />
    </main>
  );
}