import { useEffect, useState } from 'react';
import { listEquipment } from '../services/equipmentApi';
import { EquipmentError, STATUS_LABELS } from '../types/equipment';
import type { Equipment, Paginated } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';
import type { CatalogFilters as Filters } from '../types/catalogFilters';
import CatalogFilters from '../components/CatalogFilters';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './MyEquipmentPage.css';
import './CatalogPage.css';

export default function CatalogPage({ user, onLogout, loggingOut, logoutError }: {
  user: RegisterResponse; onLogout: () => void; loggingOut: boolean; logoutError: string;
}) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <a href="#account" aria-label="Your account"><img className="uniware-logo" src={uniwareLogo} alt="UniWare" /></a>
        <nav className="catalog-nav" aria-label="Catalog navigation">
          <a href="#account">Account</a>
          {user.is_borrower && <a href="#my-requests">My requests</a>}
          {user.is_provider && <a href="#my-equipment">My equipment</a>}
          {user.is_provider && <a href="#provider-requests">Borrow requests</a>}
          <button className="register-button logout-button" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </nav>
      </header>
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <p className="catalog-kicker">University equipment</p>
        <h1 id="catalog-title">Find your next tool.</h1>
        <p className="catalog-description">Explore equipment across the university and check its current status.</p>
      </section>
      <CatalogFilters onApply={next => { setFilters(next); setPage(1); setAttempt(value => value + 1); }} />
      {logoutError && <p className="form-message form-message-error" role="alert">{logoutError}</p>}
      <CatalogResults key={JSON.stringify([page, attempt, filters])} page={page} filters={filters} setPage={setPage} retry={() => setAttempt(value => value + 1)} />
    </main>
  );
}

function CatalogResults({ page, filters, setPage, retry }: { page: number; filters: Filters; setPage: (page: number) => void; retry: () => void }) {
  const [data, setData] = useState<Paginated<Equipment> | null>(null);
  const [error, setError] = useState('');
  const filtered = Object.values(filters).some(Boolean);
  useEffect(() => {
    let active = true;
    void (filtered ? listEquipment(page, filters) : listEquipment(page)).then(result => { if (active) setData(result); }).catch(cause => {
      if (!active) return;
      if (cause instanceof EquipmentError && cause.status === 401) {
        window.location.hash = 'login';
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Unable to load the equipment catalog.');
    });
    return () => { active = false; };
  }, [page, filters, filtered]);
  if (error) return <div className="catalog-state" role="alert"><p>{error}</p><button className="register-button" onClick={retry}>Try again</button></div>;
  if (!data) return <p className="catalog-state" role="status">Loading catalog...</p>;
  return (
    <>
      <p className="catalog-count" role="status">{data.count} item{data.count === 1 ? '' : 's'} {filtered ? 'matching your filters' : 'in the catalog'}</p>
      {data.results.length === 0 ? (
        <div className="catalog-state"><h2>{filtered ? 'No equipment matches these filters' : 'No equipment to show'}</h2>
          <p>{filtered ? 'Try fewer filters, or clear your filters to browse all equipment.' : 'Check back soon for new items from providers.'}</p></div>
      ) : (
        <ul className="catalog-grid" aria-label="Equipment catalog">
          {data.results.map(item => (
            <li key={item.id}>
              <a className="catalog-card" href={`#equipment/${encodeURIComponent(item.id)}`} aria-label={`View ${item.name}`}>
                <div className="catalog-card-art" aria-hidden="true">{item.category.name.slice(0, 1)}</div>
                <div className="catalog-card-body">
                  <p className="catalog-card-category">{item.category.name}</p>
                  <h2>{item.name}</h2>
                  <p className="catalog-card-model">{item.model || 'Model not specified'}</p>
                  <p className="catalog-card-location">{item.location.name}</p>
                  <span className={`equipment-status equipment-status-${item.status.toLowerCase()}`}>{STATUS_LABELS[item.status]}</span>
                  <span className="catalog-card-arrow" aria-hidden="true">↗</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || data.next) && (
        <nav className="equipment-pagination" aria-label="Catalog pagination">
          <button className="register-button button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span aria-live="polite">Page {page}</span>
          <button className="register-button button-secondary" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </>
  );
}
