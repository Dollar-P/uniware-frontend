import { useCallback, useEffect, useState } from 'react';
import EquipmentCard from '../components/equipment/EquipmentCard';
import EquipmentForm from '../components/equipment/EquipmentForm';
import { listMyEquipment } from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './MyEquipmentPage.css';

type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; equipment: Equipment };

/** US2-2 provider inventory, with US2-1 (add) and US2-3 (edit) opening in place. */
export default function MyEquipmentPage({ user }: { user: RegisterResponse }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  // A non-provider never triggers a load, so it must not start in the loading state.
  const [loading, setLoading] = useState(user.is_provider);
  const [error, setError] = useState('');
  const [deniedByServer, setDeniedByServer] = useState(false);
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [count, setCount] = useState(0);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await listMyEquipment(targetPage);
      setEquipment(data.results);
      setHasNext(Boolean(data.next));
      setCount(data.count);
      setDeniedByServer(false);
    } catch (cause) {
      // US2-2: a borrower without provider capability gets the access-denied state,
      // not a generic failure.
      if (cause instanceof EquipmentError && cause.status === 403) setDeniedByServer(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load your equipment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A user without provider capability never reaches the API; the denied state below
    // is derived from the capability itself.
    if (!user.is_provider) return;
    // Fetching on mount is the intended use of an effect here. The rule targets
    // render-derived state, which the loading/error/results triple is not.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [load, page, user.is_provider]);

  useEffect(() => {
    document.title = 'My equipment · UniWare';
  }, []);

  function handleSaved(saved: Equipment, wasEditing: boolean) {
    setMode({ kind: 'list' });
    setNotice(wasEditing ? `Saved changes to ${saved.name}.` : `${saved.name} was added to your inventory.`);
    if (wasEditing) {
      setEquipment(current => current.map(item => (item.id === saved.id ? saved : item)));
    } else if (page === 1) {
      void load(1);
    } else {
      setPage(1);
    }
  }

  const denied = !user.is_provider || deniedByServer;

  if (denied) {
    return (
      <main className="equipment-page">
        <Header />
        <section className="equipment-empty" aria-label="Access denied">
          <h1>Provider access required</h1>
          <p>
            Your account does not have provider capability, so you cannot manage equipment yet.
            Contact an administrator if you believe this is a mistake.
          </p>
          <a className="register-button" href="#account">Back to your account</a>
        </section>
      </main>
    );
  }

  if (mode.kind !== 'list') {
    const editing = mode.kind === 'edit';
    return (
      <main className="equipment-page">
        <Header />
        <section className="equipment-form-panel" aria-labelledby="equipment-form-title">
          <h1 id="equipment-form-title">{editing ? 'Edit equipment' : 'Add equipment'}</h1>
          <EquipmentForm
            equipment={mode.kind === 'edit' ? mode.equipment : undefined}
            onSaved={saved => handleSaved(saved, editing)}
            onCancel={() => setMode({ kind: 'list' })}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="equipment-page">
      <Header />
      <section className="equipment-list-panel" aria-labelledby="my-equipment-title">
        <header className="equipment-list-header">
          <div>
            <h1 id="my-equipment-title">My equipment</h1>
            <p className="equipment-subtitle">
              {count === 0 ? 'Nothing in your inventory yet' : `${count} item${count === 1 ? '' : 's'} in your inventory`}
            </p>
          </div>
          <button className="register-button" type="button" onClick={() => { setNotice(''); setMode({ kind: 'add' }); }}>
            Add equipment
          </button>
        </header>

        {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
        {error && (
          <div className="equipment-error">
            <p className="form-message form-message-error" role="alert">{error}</p>
            <button className="register-button" type="button" onClick={() => void load(page)}>Try again</button>
          </div>
        )}

        {loading ? (
          <p role="status">Loading your equipment...</p>
        ) : equipment.length === 0 && !error ? (
          <div className="equipment-empty">
            <h2>No equipment yet</h2>
            <p>Add your first item so borrowers can discover and request it.</p>
            <button className="register-button" type="button" onClick={() => setMode({ kind: 'add' })}>
              Add equipment
            </button>
          </div>
        ) : (
          <>
            <ul className="equipment-list">
              {equipment.map(item => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onEdit={target => { setNotice(''); setMode({ kind: 'edit', equipment: target }); }}
                />
              ))}
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
