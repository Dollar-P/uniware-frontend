import { useCallback, useEffect, useState } from 'react';
import { listAdminEquipment, updateEquipmentSuspension } from '../services/equipmentApi';
import type { Equipment } from '../types/equipment';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './UserManagementPage.css';
import './AdminEquipmentPage.css';

export default function AdminEquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await listAdminEquipment(page, query);
      setItems(data.results); setNext(Boolean(data.next));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load equipment.'); }
    finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => {
    // Fetch changes when the search or page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setSuspension(item: Equipment, suspend: boolean) {
    if (suspend && !reason.trim()) { setError('Enter a reason before suspending equipment.'); return; }
    if (!suspend && !window.confirm(`Remove the equipment suspension on ${item.name}? Owner account suspension, if any, will remain in force.`)) return;
    setSaving(item.id); setError(''); setNotice('');
    try {
      const updated = await updateEquipmentSuspension(item.id, suspend, suspend ? reason.trim() : '');
      setItems(previous => previous.map(other => other.id === item.id ? updated : other));
      setNotice(suspend ? `${item.name} suspended.` : updated.is_suspended ? `Manual hold removed; ${item.name} remains suspended because its owner is suspended.` : `${item.name} reactivated.`);
      setReasonId(null); setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to change suspension.'); }
    finally { setSaving(''); }
  }
  return <main className="user-management-page">
    <header className="user-management-header"><img src={uniwareLogo} alt="UniWare" />
      <nav><a href="#account">Account</a><a href="#catalog">Catalog</a><a href="#user-management">User management</a></nav>
    </header>
    <section className="user-management-panel">
      <h1>Equipment suspension</h1>
      <p>Suspend or reactivate equipment without changing its physical availability or existing request statuses. Only administrators can change holds.</p>
      <form className="admin-equipment-search" onSubmit={event => {event.preventDefault(); setPage(1); setQuery(search); }}>
        <label htmlFor="admin-equipment-search">Search name, model or asset ID</label>
        <input id="admin-equipment-search" value={search} onChange={event => setSearch(event.target.value)} />
        <button className="register-button" type="submit">Search</button>
      </form>
      {error && <p role="alert" className="user-management-error">{error}</p>}
      {notice && <p role="status" className="user-management-notice">{notice}</p>}
      {loading ? <p role="status">Loading equipment…</p> : items.length === 0 ? <p>No equipment found.</p> : (
        <ul className="admin-equipment-list">{items.map(item => <li key={item.id}>
          <div><strong>{item.name}</strong> ({item.asset_id})<br />
            <small>Owner: {item.owner.name} ({item.owner.email})</small><br />
            <span>Inventory: {item.status} · {item.is_suspended ? 'SUSPENDED' : 'Not suspended'}</span>
            {item.is_suspended && <p className="equipment-suspension-notice">{item.suspension_reason}</p>}
          </div>
          <div className="admin-equipment-controls">
            {reasonId === item.id ? <div className="admin-equipment-reason">
              <label htmlFor={`reason-${item.id}`}>Suspension reason (required)</label>
              <textarea id={`reason-${item.id}`} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} />
              <button className="register-button" type="button" disabled={Boolean(saving)} onClick={() => void setSuspension(item, true)}>Confirm suspension</button>
              <button className="register-button button-secondary" type="button" onClick={() => {setReasonId(null);setReason('');}}>Cancel</button>
            </div> : item.admin_suspended ? <>
              <button className="register-button button-secondary" disabled={Boolean(saving)} type="button" onClick={() => void setSuspension(item, false)}>Remove manual hold</button>
              <small>Account suspension cannot be removed here.</small>
            </> : item.is_suspended ? <small>Automatically suspended because the owner account is suspended. Reactivate the owner account in User Management.</small> : <button className="register-button" disabled={Boolean(saving)} type="button" onClick={() => {setReasonId(item.id);setReason('');}}>Suspend</button>}
          </div>
        </li>)}</ul>
      )}
      <div className="admin-equipment-pages"><button disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</button>
        <span>Page {page}</span><button disabled={!next || loading} onClick={() => setPage(current => current + 1)}>Next</button></div>
    </section>
  </main>;
}
