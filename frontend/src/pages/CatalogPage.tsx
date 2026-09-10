import { useEffect, useState } from 'react';
import { listEquipment } from '../services/equipmentApi';
import type { Equipment } from '../types/equipment';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './CatalogPage.css';

const statusLabels: Record<Equipment['status'], string> = {
  AVAILABLE: 'Available now',
  RESERVED: 'Reserved',
  CHECKED_OUT: 'Checked out',
  MAINTENANCE: 'In maintenance',
};

function CatalogPage({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEquipment() {
    setLoading(true);
    setError('');
    try {
      const response = await listEquipment();
      setEquipment(response.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the equipment catalog.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEquipment(); }, []);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [selected]);

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <a className="catalog-brand" href="#account" aria-label="Back to your account">
          <img src={uniwareLogo} alt="UniWare" />
        </a>
        <nav className="catalog-nav" aria-label="Catalog navigation">
          <span className="catalog-greeting">Hi, {userName}</span>
          <a className="catalog-nav-link" href="#account">Account</a>
          <button className="catalog-logout" type="button" onClick={onLogout}>Log out</button>
        </nav>
      </header>

      <section className="catalog-intro" aria-labelledby="catalog-title">
        <div>
          <p className="catalog-kicker">Borrowing desk / live inventory</p>
          <h1 id="catalog-title">Find your next tool.</h1>
          <p className="catalog-description">Browse equipment currently available across the university.</p>
        </div>
        <div className="catalog-count" aria-label={`${equipment.length} items shown`}>
          <strong>{equipment.length}</strong>
          <span>items shown</span>
        </div>
      </section>

      {loading ? <div className="catalog-state" role="status"><span className="catalog-loader" />Loading catalog...</div> : error ? (
        <div className="catalog-state catalog-state-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void loadEquipment()}>Try again</button>
        </div>
      ) : equipment.length === 0 ? (
        <div className="catalog-state"><span className="empty-mark">—</span><h2>No equipment is available yet.</h2><p>Check back soon for new items from providers.</p></div>
      ) : (
        <section className="equipment-grid" aria-label="Borrowable equipment">
          {equipment.map((item, index) => (
            <button className="equipment-card" type="button" key={item.id} onClick={() => setSelected(item)} style={{ '--card-index': index } as React.CSSProperties}>
              <span className={`equipment-art equipment-art-${index % 4}`} aria-hidden="true"><span>{item.category.name.slice(0, 1)}</span></span>
              <span className="equipment-card-body">
                <span className="equipment-card-top"><span>{item.category.name}</span><span className={`status-dot status-${item.status.toLowerCase()}`} /></span>
                <strong>{item.name}</strong>
                <span className="equipment-model">{item.model || 'Model not specified'}</span>
                <span className="equipment-location">{item.location.name}</span>
              </span>
              <span className="equipment-card-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </section>
      )}

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setSelected(null); }}>
        <section className="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-detail-title">
          <button className="modal-close" type="button" aria-label="Close equipment details" onClick={() => setSelected(null)}>×</button>
          <span className="modal-art" aria-hidden="true"><span>{selected.category.name.slice(0, 1)}</span></span>
          <p className="catalog-kicker">{selected.category.name} / {selected.asset_id}</p>
          <h2 id="equipment-detail-title">{selected.name}</h2>
          <p className="modal-model">{selected.model || 'Model not specified'}</p>
          <p className="modal-description">{selected.description || 'No description has been added for this equipment yet.'}</p>
          <dl className="modal-details">
            <div><dt>Location</dt><dd>{selected.location.name}</dd></div>
            <div><dt>Status</dt><dd><span className={`status-dot status-${selected.status.toLowerCase()}`} />{statusLabels[selected.status]}</dd></div>
            <div><dt>Asset ID</dt><dd>{selected.asset_id}</dd></div>
          </dl>
          <button className="modal-action" type="button" disabled={selected.status !== 'AVAILABLE'}>{selected.status === 'AVAILABLE' ? 'Request to borrow' : 'Currently unavailable'}</button>
        </section>
      </div>}
    </main>
  );
}

export default CatalogPage;