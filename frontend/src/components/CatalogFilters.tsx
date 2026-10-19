import { useEffect, useState } from 'react';
import { listCategories, listLocations } from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Category, Location } from '../types/equipment';
import { CATALOG_AVAILABILITIES, isCatalogAvailability } from '../types/catalogFilters';
import type { CatalogFilters as Filters } from '../types/catalogFilters';
import './CatalogFilters.css';

export default function CatalogFilters({ onApply }: { onApply: (filters: Filters) => void }) {
  const [references, setReferences] = useState<{ categories: Category[]; locations: Location[] } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([listCategories(), listLocations()]).then(([categories, locations]) => {
      if (active) setReferences({ categories, locations });
    }).catch(cause => {
      if (!active) return;
      if (cause instanceof EquipmentError && cause.status === 401) {
        window.location.hash = 'login';
        return;
      }
      setLoadError(cause instanceof Error ? cause.message : 'Unable to load filter choices.');
    });
    return () => { active = false; };
  }, [attempt]);

  function apply() {
    if (!references) return;
    if ((category && !references.categories.some(item => item.id === category)) ||
        (location && !references.locations.some(item => item.id === location)) ||
        (status && !isCatalogAvailability(status))) {
      setFormError('Choose supported filter values, or clear your filters.');
      return;
    }
    setFormError('');
    onApply({
      ...(category ? { category } : {}),
      ...(location ? { location } : {}),
      ...(isCatalogAvailability(status) ? { availability: status } : {}),
    });
  }

  function clear() {
    setCategory('');
    setLocation('');
    setStatus('');
    setFormError('');
    onApply({});
  }

  return (
    <form className="catalog-filters" aria-label="Filter equipment" onSubmit={event => { event.preventDefault(); apply(); }}>
      <fieldset disabled={!references} aria-describedby="catalog-filters-help">
        <legend>Filter equipment</legend>
        <p id="catalog-filters-help" className="catalog-filters-help">Choose one or more filters. Results must match every selection.</p>
        <div className="catalog-filter-fields">
          <div className="form-field">
            <label htmlFor="catalog-category">Category</label>
            <select id="catalog-category" value={category} onChange={event => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {references?.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="catalog-location">Location</label>
            <select id="catalog-location" value={location} onChange={event => setLocation(event.target.value)}>
              <option value="">All locations</option>
              {references?.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="catalog-availability">Availability</label>
            <select id="catalog-availability" value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">All availability</option>
              {CATALOG_AVAILABILITIES.map(value => <option key={value} value={value}>{value === 'available' ? 'Available' : 'Unavailable'}</option>)}
            </select>
          </div>
        </div>
      </fieldset>
      {!references && !loadError && <p className="catalog-filters-help" role="status">Loading filter choices...</p>}
      {loadError && <div className="form-message form-message-error" role="alert">
        <p>{loadError} You can still browse the catalog.</p>
        <button type="button" className="register-button button-secondary" onClick={() => {
          setLoadError(''); setAttempt(value => value + 1);
        }}>Retry filter choices</button>
      </div>}
      {formError && <p className="form-message form-message-error" role="alert">{formError}</p>}
      <div className="catalog-filter-actions">
        <button type="submit" className="register-button" disabled={!references}>Apply filters</button>
        <button type="button" className="register-button button-secondary" onClick={clear}>Clear filters</button>
      </div>
    </form>
  );
}
