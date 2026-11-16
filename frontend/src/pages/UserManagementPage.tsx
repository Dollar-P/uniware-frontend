import { useCallback, useEffect, useRef, useState } from 'react';
import type { RegisterResponse } from '../types/auth';
import { listUsers, updateUserRoles, updateUserStatus } from '../services/userManagementApi';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './UserManagementPage.css';

type RoleKey = 'is_admin' | 'is_provider' | 'is_borrower';
const roles: { key: RoleKey; label: string }[] = [
  { key: 'is_admin', label: 'Admin' },
  { key: 'is_provider', label: 'Provider' },
  { key: 'is_borrower', label: 'Borrower' },
];

export default function UserManagementPage({ user }: { user: RegisterResponse }) {
  const [users, setUsers] = useState<RegisterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const result = await listUsers(page, query);
      if (version !== generation.current) return;
      setUsers(result.results); setCount(result.count); setHasNext(Boolean(result.next));
    } catch (e) {
      if (version !== generation.current) return;
      setLoadFailed(true);
      setError(e instanceof Error ? e.message : 'Unable to load users.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    document.title = 'User management · UniWare';
    // Fetching the table is an intentional effect when this page first mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);

  async function toggleRole(target: RegisterResponse, key: RoleKey) {
    const next = !target[key];
    if (target.id === user.id && key === 'is_admin' && !next) {
      setError('You cannot remove your own admin role.');
      return;
    }
    // US8-2: a role change takes effect at once, so ask before sending it.
    const label = roles.find(role => role.key === key)?.label ?? key;
    if (!window.confirm(`${next ? 'Grant' : 'Remove'} the ${label} role ${next ? 'to' : 'from'} ${target.first_name} ${target.last_name} (${target.email})?`)) return;
    setSaving(target.id);
    setError('');
    setNotice('');
    try {
      const updated = await updateUserRoles(target.id, { [key]: next });
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
      setNotice(`Updated roles for ${updated.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update roles.');
    } finally {
      setSaving(null);
    }
  }

  async function changeStatus(target: RegisterResponse) {
    const next = target.account_status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (next === 'SUSPENDED') {
      if (target.id === user.id) {
        setError('You cannot suspend your own account.');
        return;
      }
      if (!window.confirm(`Suspend ${target.first_name} ${target.last_name} (${target.email})? Their existing sessions will be revoked, all equipment they own will be suspended, and they will be unable to log in.`)) return;
    } else if (!window.confirm(`Reactivate ${target.first_name} ${target.last_name} (${target.email})? They will be able to log in again.`)) {
      return;
    }
    setSaving(target.id);
    setError('');
    setNotice('');
    try {
      const updated = await updateUserStatus(target.id, next);
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
      setNotice(`${updated.email} ${next === 'SUSPENDED' ? 'suspended; their equipment is now unavailable for new borrowing' : 'reactivated; their equipment is available again unless manually suspended'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update account status.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="user-management-page">
      <header className="user-management-header">
        <img src={uniwareLogo} alt="UniWare" />
        <nav><a href="#account">Your account</a><a href="#catalog">Browse equipment</a><a href="#admin-equipment">Equipment suspension</a></nav>
      </header>
      <section className="user-management-panel">
        <h1>User management</h1>
        <p>Manage roles and suspend or reactivate accounts. Changes are saved immediately.</p>
        <form className="user-search" role="search" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
          <label htmlFor="user-search">Search name or email</label>
          <input id="user-search" type="search" value={search} placeholder="Name or email"
            onChange={event => setSearch(event.target.value)} />
          <button className="register-button" type="submit">Search</button>
          <button className="register-button button-secondary" type="button" disabled={!search && !query}
            onClick={() => { setSearch(''); setQuery(''); setPage(1); }}>Clear search</button>
        </form>
        {error && <p role="alert" className="user-management-error">{error}</p>}
        {notice && <p role="status" className="user-management-notice">{notice}</p>}
        {loading ? <p role="status">Loading users…</p> : loadFailed ? (
          <button className="register-button" type="button" onClick={() => void refresh()}>Try again</button>
        ) : (
          <div className="user-table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Department</th><th>Roles</th><th>Status</th><th>Actions</th><th>Joined</th></tr></thead>
              <tbody>{users.map(account => (
                <tr key={account.id}>
                  <td>{account.first_name} {account.last_name}</td>
                  <td>{account.email}</td>
                  <td>{account.department || '—'}</td>
                  <td>
                    <div className="user-role-controls">{roles.map(role => (
                      <label key={role.key}>
                        <input type="checkbox" checked={account[role.key]}
                          disabled={saving !== null || (account.id === user.id && role.key === 'is_admin')}
                          onChange={() => void toggleRole(account, role.key)} />
                        {role.label}
                      </label>
                    ))}</div>
                  </td>
                  <td>
                    <span className={`user-account-status ${account.account_status === 'SUSPENDED' ? 'user-account-status-suspended' : ''}`}>
                      {account.account_status === 'SUSPENDED' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button type="button"
                      className={`user-account-action ${account.account_status === 'SUSPENDED' ? 'user-account-action-reactivate' : 'user-account-action-suspend'}`}
                      disabled={saving !== null || (account.id === user.id && account.account_status === 'ACTIVE')}
                      onClick={() => void changeStatus(account)}>{saving === account.id ? 'Saving…' : account.account_status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}</button>
                  </td>
                  <td>{new Date(account.date_joined).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
            {users.length === 0 && <p>{query ? `No users match "${query}".` : 'No user accounts found.'}</p>}
            <p>{count} accounts</p>
            <nav aria-label="User pages">
              <button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button>
              <span>Page {page}</span>
              <button disabled={!hasNext || loading} onClick={() => setPage(value => value + 1)}>Next</button>
            </nav>
          </div>
        )}
      </section>
    </main>
  );
}
