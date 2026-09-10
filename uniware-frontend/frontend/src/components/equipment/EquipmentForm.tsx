import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createEquipment, listCategories, listLocations, updateEquipment } from '../../services/equipmentApi';
import { validateEquipment } from '../../utils/equipmentValidation';
import { EquipmentError, PROVIDER_SETTABLE_STATUSES, STATUS_LABELS } from '../../types/equipment';
import type { Category, Equipment, EquipmentFormErrors, EquipmentRequest, Location, ProviderSettableStatus } from '../../types/equipment';

/** US2-1 (create) and US2-3 (edit) share one form; `equipment` decides the mode. */
export default function EquipmentForm({ equipment, onSaved, onCancel }: {
  equipment?: Equipment;
  onSaved: (saved: Equipment) => void;
  onCancel?: () => void;
}) {
  const editing = Boolean(equipment);
  const [form, setForm] = useState<EquipmentRequest>({
    asset_id: equipment?.asset_id ?? '',
    name: equipment?.name ?? '',
    model: equipment?.model ?? '',
    description: equipment?.description ?? '',
    category_id: equipment?.category.id ?? '',
    location_id: equipment?.location.id ?? '',
    status: (equipment?.status as ProviderSettableStatus) ?? 'AVAILABLE',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [errors, setErrors] = useState<EquipmentFormErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // US2-5: the category and location pickers are driven by server reference data.
  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingOptions(true);
      try {
        const [nextCategories, nextLocations] = await Promise.all([listCategories(), listLocations()]);
        if (!active) return;
        setCategories(nextCategories);
        setLocations(nextLocations);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load form options.');
      } finally {
        if (active) setLoadingOptions(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function update<K extends keyof EquipmentRequest>(field: K, value: EquipmentRequest[K]) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validateEquipment(form);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const payload: EquipmentRequest = {
        ...form,
        asset_id: form.asset_id.trim(),
        name: form.name.trim(),
        model: form.model?.trim() ?? '',
        description: form.description?.trim() ?? '',
      };
      const saved = equipment
        ? await updateEquipment(equipment.id, payload)
        : await createEquipment(payload);
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof EquipmentError) {
        setErrors(cause.fields);
        setError(cause.message);
      } else {
        setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || loadingOptions;

  return (
    <form className="register-form equipment-form" onSubmit={submit} noValidate aria-busy={busy}>
      <div className="form-field">
        <label htmlFor="equipment-asset-id">Asset ID</label>
        <input id="equipment-asset-id" name="asset_id" required value={form.asset_id}
          onChange={event => update('asset_id', event.target.value)} disabled={disabled}
          aria-invalid={Boolean(errors.asset_id)}
          aria-describedby={errors.asset_id ? 'equipment-asset-id-error' : undefined} />
        {errors.asset_id && <p className="form-error" id="equipment-asset-id-error">{errors.asset_id}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-name">Equipment name</label>
        <input id="equipment-name" name="name" required value={form.name}
          onChange={event => update('name', event.target.value)} disabled={disabled}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'equipment-name-error' : undefined} />
        {errors.name && <p className="form-error" id="equipment-name-error">{errors.name}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-model">Model <span className="form-optional">(optional)</span></label>
        <input id="equipment-model" name="model" value={form.model}
          onChange={event => update('model', event.target.value)} disabled={disabled}
          aria-invalid={Boolean(errors.model)}
          aria-describedby={errors.model ? 'equipment-model-error' : undefined} />
        {errors.model && <p className="form-error" id="equipment-model-error">{errors.model}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-category">Category</label>
        <select id="equipment-category" name="category_id" required value={form.category_id}
          onChange={event => update('category_id', event.target.value)} disabled={disabled}
          aria-invalid={Boolean(errors.category_id)}
          aria-describedby={errors.category_id ? 'equipment-category-error' : undefined}>
          <option value="">{loadingOptions ? 'Loading...' : 'Select a category'}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        {errors.category_id && <p className="form-error" id="equipment-category-error">{errors.category_id}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-location">Location</label>
        <select id="equipment-location" name="location_id" required value={form.location_id}
          onChange={event => update('location_id', event.target.value)} disabled={disabled}
          aria-invalid={Boolean(errors.location_id)}
          aria-describedby={errors.location_id ? 'equipment-location-error' : undefined}>
          <option value="">{loadingOptions ? 'Loading...' : 'Select a location'}</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        {errors.location_id && <p className="form-error" id="equipment-location-error">{errors.location_id}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-status">Status</label>
        <select id="equipment-status" name="status" value={form.status}
          onChange={event => update('status', event.target.value as ProviderSettableStatus)} disabled={disabled}
          aria-invalid={Boolean(errors.status)}
          aria-describedby={errors.status ? 'equipment-status-error' : undefined}>
          {PROVIDER_SETTABLE_STATUSES.map(status => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
        {errors.status && <p className="form-error" id="equipment-status-error">{errors.status}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="equipment-description">Description <span className="form-optional">(optional)</span></label>
        <textarea id="equipment-description" name="description" rows={3} value={form.description}
          onChange={event => update('description', event.target.value)} disabled={disabled} />
      </div>

      {error && <p className="form-message form-message-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="register-button" type="submit" disabled={disabled}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Add equipment'}
        </button>
        {onCancel && (
          <button className="register-button button-secondary" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
