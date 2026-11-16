import { useEffect, useState } from 'react';
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

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'User management · UniWare';
    // Fetching the table is an intentional effect when this page first mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function toggleRole(target: RegisterResponse, key: RoleKey) {
    const next = !target[key];
    if (target.id === user.id && key === 'is_admin' && !next) {
      setError('You cannot remove your own admin role.');
      return;
    }
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
        {error && <p role="alert" className="user-management-error">{error}</p>}
        {notice && <p role="status" className="user-management-notice">{notice}</p>}
        {loading ? <p role="status">Loading users…</p> : (
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
            {users.length === 0 && <p>No user accounts found.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
