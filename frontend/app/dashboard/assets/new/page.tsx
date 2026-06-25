'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AssetForm, buildCreateAssetPayload } from '../_components/asset-form';
import styles from '../assets.module.css';
import { useCreateAssetMutation } from '../../../../hooks/assets/assets';

type CreatedAssetResponse = {
  id?: number;
  data?: {
    id?: number;
  };
};

function generateDraftCode() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ACT-${datePart}-${random}`;
}

export default function NewAssetPage() {
  const router = useRouter();
  const createAssetMutation = useCreateAssetMutation();
  const [error, setError] = useState<string | null>(null);
  const [draftCode] = useState(generateDraftCode);

  const handleSubmit = async (values: Parameters<typeof buildCreateAssetPayload>[0]) => {
    setError(null);

    try {
      const response = (await createAssetMutation.mutateAsync(
        buildCreateAssetPayload(values),
      )) as CreatedAssetResponse;

      const createdId = response.data?.id ?? response.id;
      if (createdId) {
        router.push(`/dashboard/assets/${createdId}`);
        return;
      }

      router.push('/dashboard/assets');
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'No se pudo crear el activo');
    }
  };

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">Activos</p>
          <h1>Registrar activo</h1>
          <p className={styles.leadText}>Completa los datos básicos, financieros y de control del bien.</p>
        </div>
      </div>

      <AssetForm
        submitLabel="Crear activo"
        onSubmit={handleSubmit}
        onCancelHref="/dashboard/assets"
        isSubmitting={createAssetMutation.isPending}
        error={error}
        draftCode={draftCode}
      />
    </main>
  );
}