'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { CreateAssetDto, UpdateAssetDto } from '../../../../hooks/assets/assets';
import { useCategoriesQuery } from '../../../../hooks/categories/use-categories';
import { useCostCentersQuery } from '../../../../hooks/cost-centers/use-cost-centers';
import { usePeopleQuery } from '../../../../hooks/people/use-people';
import { useSuppliersQuery } from '../../../../hooks/suppliers/use-suppliers';
import styles from '../assets.module.css';

export type AssetFormValues = {
  name: string;
  description: string;
  categoryId: string;
  quantity: string;
  responsiblePersonId: string;
  location: string;
  costCenterId: string;
  acquisitionDate: string;
  unitValue: string;
  supplierId: string;
  invoiceNumber: string;
  purchaseOrder: string;
  warrantyEndDate: string;
  warrantyMonths: string;
  depreciationType: string;
  depreciationRate: string;
  depreciationMonths: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: string;
  condition: string;
};

export interface AssetFormProps {
  initialValues?: Partial<AssetFormValues>;
  submitLabel: string;
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
  onCancelHref: string;
  isSubmitting?: boolean;
  error?: string | null;
  showStatusFields?: boolean;
  draftCode?: string;
}

export interface AssetLike {
  code?: string;
  name?: string;
  description?: string | null;
  categoryId?: number | null;
  quantity?: number | null;
  responsiblePersonId?: number | null;
  location?: string | null;
  costCenterId?: number | null;
  acquisitionDate?: string | Date | null;
  unitValue?: number | null;
  supplierId?: number | null;
  invoiceNumber?: string | null;
  purchaseOrder?: string | null;
  warrantyEndDate?: string | Date | null;
  warrantyMonths?: number | null;
  depreciationType?: string | null;
  depreciationRate?: number | null;
  depreciationMonths?: number | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  status?: string | null;
  condition?: string | null;
}

const emptyValues: AssetFormValues = {
  name: '',
  description: '',
  categoryId: '',
  quantity: '1',
  responsiblePersonId: '',
  location: '',
  costCenterId: '',
  acquisitionDate: '',
  unitValue: '',
  supplierId: '',
  invoiceNumber: '',
  purchaseOrder: '',
  warrantyEndDate: '',
  warrantyMonths: '',
  depreciationType: '',
  depreciationRate: '',
  depreciationMonths: '',
  serialNumber: '',
  manufacturer: '',
  model: '',
  status: '',
  condition: '',
};

const statusOptions = [
  { value: '', label: 'Sin definir' },
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'OBSOLETO', label: 'Obsoleto' },
  { value: 'MAL_ESTADO', label: 'Mal estado' },
  { value: 'DESUSO', label: 'En desuso' },
  { value: 'REPARACION', label: 'En reparación' },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error('Valor numérico inválido');
  }

  return parsed;
}

function toRequiredNumber(value: string, label: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} es requerido`);
  }

  return parsed;
}

export function createAssetFormValues(initialValues?: Partial<AssetFormValues>): AssetFormValues {
  return {
    ...emptyValues,
    ...initialValues,
  };
}

export function assetToFormValues(asset: AssetLike): AssetFormValues {
  return createAssetFormValues({
    name: asset.name ?? '',
    description: asset.description ?? '',
    categoryId: asset.categoryId?.toString() ?? '',
    quantity: asset.quantity?.toString() ?? '1',
    responsiblePersonId: asset.responsiblePersonId?.toString() ?? '',
    location: asset.location ?? '',
    costCenterId: asset.costCenterId?.toString() ?? '',
    acquisitionDate: toDateInputValue(asset.acquisitionDate),
    unitValue: asset.unitValue?.toString() ?? '',
    supplierId: asset.supplierId?.toString() ?? '',
    invoiceNumber: asset.invoiceNumber ?? '',
    purchaseOrder: asset.purchaseOrder ?? '',
    warrantyEndDate: toDateInputValue(asset.warrantyEndDate),
    warrantyMonths: asset.warrantyMonths?.toString() ?? '',
    depreciationType: asset.depreciationType ?? '',
    depreciationRate: asset.depreciationRate?.toString() ?? '',
    depreciationMonths: asset.depreciationMonths?.toString() ?? '',
    serialNumber: asset.serialNumber ?? '',
    manufacturer: asset.manufacturer ?? '',
    model: asset.model ?? '',
    status: asset.status ?? '',
    condition: asset.condition ?? '',
  });
}

export function buildCreateAssetPayload(values: AssetFormValues): CreateAssetDto {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    categoryId: Number(values.categoryId),
    quantity: values.quantity ? toRequiredNumber(values.quantity, 'Cantidad') : 1,
    responsiblePersonId: Number(values.responsiblePersonId),
    location: values.location.trim(),
    costCenterId: values.costCenterId.trim() ? Number(values.costCenterId) : undefined,
    acquisitionDate: values.acquisitionDate || undefined,
    unitValue: toRequiredNumber(values.unitValue, 'Valor unitario'),
    supplierId: values.supplierId.trim() ? Number(values.supplierId) : undefined,
    invoiceNumber: values.invoiceNumber.trim() || undefined,
    purchaseOrder: values.purchaseOrder.trim() || undefined,
    warrantyEndDate: values.warrantyEndDate || undefined,
    warrantyMonths: toOptionalNumber(values.warrantyMonths),
    depreciationType: values.depreciationType || undefined,
    depreciationRate: toOptionalNumber(values.depreciationRate),
    depreciationMonths: toOptionalNumber(values.depreciationMonths),
    serialNumber: values.serialNumber.trim() || undefined,
    manufacturer: values.manufacturer.trim() || undefined,
    model: values.model.trim() || undefined,
  };
}

export function buildUpdateAssetPayload(values: AssetFormValues): UpdateAssetDto {
  return {
    name: values.name.trim() || undefined,
    description: values.description.trim() || undefined,
    categoryId: values.categoryId.trim() ? Number(values.categoryId) : undefined,
    responsiblePersonId: values.responsiblePersonId.trim() ? Number(values.responsiblePersonId) : undefined,
    location: values.location.trim() || undefined,
    costCenterId: values.costCenterId.trim() ? Number(values.costCenterId) : undefined,
    acquisitionDate: values.acquisitionDate || undefined,
    unitValue: values.unitValue ? toRequiredNumber(values.unitValue, 'Valor unitario') : undefined,
    supplierId: values.supplierId.trim() ? Number(values.supplierId) : undefined,
    invoiceNumber: values.invoiceNumber.trim() || undefined,
    purchaseOrder: values.purchaseOrder.trim() || undefined,
    warrantyEndDate: values.warrantyEndDate || undefined,
    warrantyMonths: toOptionalNumber(values.warrantyMonths),
    depreciationType: values.depreciationType || undefined,
    depreciationRate: toOptionalNumber(values.depreciationRate),
    depreciationMonths: toOptionalNumber(values.depreciationMonths),
    serialNumber: values.serialNumber.trim() || undefined,
    manufacturer: values.manufacturer.trim() || undefined,
    model: values.model.trim() || undefined,
    status: values.status || undefined,
    condition: values.condition.trim() || undefined,
  };
}

export function AssetForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancelHref,
  isSubmitting,
  error,
  showStatusFields = false,
  draftCode,
}: AssetFormProps) {
  const categoriesQuery = useCategoriesQuery(true);
  const costCentersQuery = useCostCentersQuery(true);
  const peopleQuery = usePeopleQuery(true);
  const suppliersQuery = useSuppliersQuery(true);
  const [values, setValues] = useState<AssetFormValues>(() =>
    createAssetFormValues(initialValues),
  );

  useEffect(() => {
    setValues(createAssetFormValues(initialValues));
  }, [initialValues]);

  const handleChange =
    (field: keyof AssetFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Código del activo</h2>
        <div className={styles.codeCard}>
          <p className={styles.codeLabel}>Se genera automáticamente al crear el activo.</p>
          <strong className={styles.codeValue}>{draftCode ?? 'Se generará al guardar'}</strong>
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Información general</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Nombre *</span>
            <input className="input" value={values.name} onChange={handleChange('name')} required />
          </label>

          <label className={styles.field}>
            <span>Categoría *</span>
            <select className="input" value={values.categoryId} onChange={handleChange('categoryId')} required>
              <option value="">Selecciona una categoría</option>
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Ubicación *</span>
            <input className="input" value={values.location} onChange={handleChange('location')} required />
          </label>

          <label className={styles.field}>
            <span>Responsable *</span>
            <select className="input" value={values.responsiblePersonId} onChange={handleChange('responsiblePersonId')} required>
              <option value="">Selecciona una persona</option>
              {peopleQuery.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Cantidad *</span>
            <input
              type="number"
              className="input"
              min="1"
              step="1"
              value={values.quantity}
              onChange={handleChange('quantity')}
              required
              disabled={showStatusFields}
            />
            {showStatusFields && (
              <small className={styles.note}>
                La cantidad se modifica mediante entradas y salidas desde el detalle del activo.
              </small>
            )}
          </label>

          <label className={styles.field}>
            <span>Proveedor</span>
            <select className="input" value={values.supplierId} onChange={handleChange('supplierId')}>
              <option value="">Sin proveedor</option>
              {suppliersQuery.data?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span>Descripción</span>
          <textarea className="textarea" rows={4} value={values.description} onChange={handleChange('description')} />
        </label>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Ficha técnica</h2>
        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Número de serie</span>
            <input className="input" value={values.serialNumber} onChange={handleChange('serialNumber')} />
          </label>

          <label className={styles.field}>
            <span>Fabricante</span>
            <input className="input" value={values.manufacturer} onChange={handleChange('manufacturer')} />
          </label>

          <label className={styles.field}>
            <span>Modelo</span>
            <input className="input" value={values.model} onChange={handleChange('model')} />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Información financiera</h2>
        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Fecha de adquisición o compra</span>
            <input type="date" className="input" value={values.acquisitionDate} onChange={handleChange('acquisitionDate')} />
          </label>

          <label className={styles.field}>
            <span>Centro de costo</span>
            <select className="input" value={values.costCenterId} onChange={handleChange('costCenterId')}>
              <option value="">Sin centro de costo</option>
              {costCentersQuery.data?.map((costCenter) => (
                <option key={costCenter.id} value={costCenter.id}>
                  {costCenter.code} - {costCenter.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Valor unitario *</span>
            <input type="number" className="input" min="0" step="0.01" value={values.unitValue} onChange={handleChange('unitValue')} required />
          </label>
        </div>

        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Factura</span>
            <input className="input" value={values.invoiceNumber} onChange={handleChange('invoiceNumber')} />
          </label>

          <label className={styles.field}>
            <span>Orden de compra</span>
            <input className="input" value={values.purchaseOrder} onChange={handleChange('purchaseOrder')} />
          </label>

          <label className={styles.field}>
            <span>Fin de garantía</span>
            <input type="date" className="input" value={values.warrantyEndDate} onChange={handleChange('warrantyEndDate')} />
          </label>

          <label className={styles.field}>
            <span>Meses de garantía</span>
            <input type="number" className="input" min="0" step="1" value={values.warrantyMonths} onChange={handleChange('warrantyMonths')} />
          </label>
        </div>
      </section>

      {showStatusFields ? (
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Estado del activo</h2>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Estado</span>
              <select className="input" value={values.status} onChange={handleChange('status')}>
                {statusOptions.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Condición</span>
              <input className="input" value={values.condition} onChange={handleChange('condition')} />
            </label>
          </div>
        </section>
      ) : null}

      <div className={styles.actions}>
        <Link href={onCancelHref} className="button button--ghost">
          Cancelar
        </Link>

        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
      </div>

      <p className={styles.note}>Los campos marcados con * son obligatorios.</p>
    </form>
  );
}
