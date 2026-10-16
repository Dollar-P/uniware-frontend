import { useCallback, useEffect, useState } from 'react';
import DisableListingDialog from '../components/equipment/DisableListingDialog';
import { disableEquipment, enableEquipment, listAdminEquipment } from '../services/equipmentApi';
import { EquipmentError, STATUS_LABELS } from '../types/equipment';
import type { AdminEquipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './MyEquipmentPage.css';
import './ProviderRequests.css';

/** US8-4: the admin moderation surface. It lists every listing, disabled ones included,
 *  so a record stays available for administration after it leaves the catalog. */
export default function AdminEquipmentPage({ user }: { user: RegisterResponse }) {
  const [equipment, setEquipment] = useState<AdminEquipment[]>([]);
  // A non-admin never triggers a load, so it must not start in the loading state.
  const [loading, setLoading] = useState(user.is_admin);
  const [error, setError] = useState('');
  const [deniedByServer, setDeniedByServer] = useState(false);
  const [notice, setNotice] = useState('');
  const [rowError, setRowError] = useState('');
  const [confirming, setConfirming] = useState<AdminEquipment | null>(null);
  const [busyId, setBusyId] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [count, setCount] = useState(0);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await listAdminEquipment(targetPage);
      setEquipment(data.results);
      setHasNext(Boolean(data.next));
      setCount(data.count);
      setDeniedByServer(false);
    } catch (cause) {
      // A user without admin capability gets the access-denied state, not a failure.
      if (cause instanceof EquipmentError && cause.status === 403) setDeniedByServer(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load the equipment listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user.is_admin) return;
    // Fetching on mount is the intended use of an effect here. The rule targets
    // render-derived state, which the loading/error/results triple is not.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [load, page, user.is_admin]);

  useEffect(() => {
    document.title = 'Equipment moderation · UniWare';
  }, []);

  function replaceRow(saved: AdminEquipment) {
    // Read the id before the updater runs: React calls the updater during render, so a
    // malformed response has to fail here, inside the caller's try, not mid-render.
    const { id } = saved;
    setEquipment(current => current.map(item => (item.id === id ? saved : item)));
  }

  async function handleDisable(reason: string) {
    if (!confirming) return;
    const target = confirming;
    setBusyId(target.id);
    setRowError('');
    try {
      replaceRow(await disableEquipment(target.id, reason));
      setConfirming(null);
      setNotice(`${target.name} is no longer visible to borrowers.`);
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Unable to disable this listing.');
    } finally {
      setBusyId('');
    }
  }

  async function handleEnable(target: AdminEquipment) {
    setBusyId(target.id);
    setRowError('');
    setNotice('');
    try {
      replaceRow(await enableEquipment(target.id));
      setNotice(`${target.name} is back in the catalog as available.`);
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Unable to re-enable this listing.');
    } finally {
      setBusyId('');
    }
  }

  if (!user.is_admin || deniedByServer) {
    return (
      <main className="equipment-page">
        <Header />
        <section className="equipment-empty" aria-label="Access denied">
          <h1>Admin access required</h1>
          <p>
            Your account does not have admin capability, so you cannot moderate equipment
            listings. Contact an administrator if you believe this is a mistake.
          </p>
          <a className="register-button" href="#account">Back to your account</a>
        </section>
      </main>
    );
  }

  return (
    <main className="equipment-page">
      <Header />
      <section className="equipment-list-panel" aria-labelledby="admin-equipment-title">
        <header className="equipment-list-header">
          <div>
            <h1 id="admin-equipment-title">Equipment moderation</h1>
            <p className="equipment-subtitle">
              {count === 0 ? 'No listings yet' : `${count} listing${count === 1 ? '' : 's'}, disabled ones included`}
            </p>
          </div>
        </header>

        {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
        {rowError && !confirming && <p className="form-message form-message-error" role="alert">{rowError}</p>}
        {error && (
          <div className="equipment-error">
            <p className="form-message form-message-error" role="alert">{error}</p>
            <button className="register-button" type="button" onClick={() => void load(page)}>Try again</button>
          </div>
        )}

        {loading ? (
          <p role="status">Loading equipment listings...</p>
        ) : equipment.length === 0 && !error ? (
          <div className="equipment-empty">
            <h2>No listings to moderate</h2>
            <p>Listings appear here as soon as providers add equipment.</p>
          </div>
        ) : (
          <>
            <ul className="equipment-list">
              {equipment.map(item => {
                const disabled = item.status === 'DISABLED';
                return (
                  <li className="equipment-card" key={item.id}>
                    <div className="equipment-card-main">
                      <h3 className="equipment-card-name">{item.name}</h3>
                      <p className="equipment-card-asset">{item.asset_id}</p>
                      {item.model && <p className="equipment-card-model">{item.model}</p>}
                      {disabled && item.disabled_reason && (
                        <p className="equipment-card-model">Disabled: {item.disabled_reason}</p>
                      )}
                    </div>
                    <dl className="equipment-card-meta">
                      <div><dt>Category</dt><dd>{item.category.name}</dd></div>
                      <div><dt>Location</dt><dd>{item.location.name}</dd></div>
                    </dl>
                    <div className="equipment-card-actions">
                      <span className={`equipment-status equipment-status-${item.status.toLowerCase()}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      {disabled ? (
                        <button className="register-button button-secondary" type="button"
                          aria-label={`Re-enable ${item.name}`} disabled={busyId === item.id}
                          onClick={() => void handleEnable(item)}>
                          {busyId === item.id ? 'Re-enabling...' : 'Re-enable listing'}
                        </button>
                      ) : (
                        <button className="register-button button-secondary" type="button"
                          aria-label={`Disable ${item.name}`} disabled={busyId === item.id}
                          onClick={() => { setNotice(''); setRowError(''); setConfirming(item); }}>
                          Disable listing
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {(page > 1 || hasNext) && (
              <nav className="equipment-pagination" aria-label="Pagination">
                <button className="register-button button-secondary" type="button"
                  disabled={page === 1} onClick={() => setPage(value => value - 1)}>
                  Previous
                </button>
                <span>Page {page}</span>
                <button className="register-button button-secondary" type="button"
                  disabled={!hasNext} onClick={() => setPage(value => value + 1)}>
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {confirming && (
        <DisableListingDialog
          equipment={confirming}
          busy={busyId === confirming.id}
          error={rowError}
          onCancel={() => { setConfirming(null); setRowError(''); }}
          onConfirm={reason => void handleDisable(reason)}
        />
      )}
    </main>
  );
}

function Header() {
  return (
    <header className="equipment-page-header">
      <img className="uniware-logo" src={uniwareLogo} alt="UniWare" />
      <a className="equipment-back-link" href="#account">Your account</a>
      <a className="equipment-back-link" href="#catalog">Browse equipment</a>
    </header>
  );
}
