import { useEffect, useState } from 'react';
import type { RegisterResponse } from '../types/auth';
import { listUsers, updateUserRoles } from '../services/userManagementApi';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './UserManagementPage.css';

type RoleKey = 'is_admin' | 'is_provider' | 'is_borrower';
const roles: { key: RoleKey; label: string }[] = [
  { key: 'is_admin', label: 'Admin' }, { key: 'is_provider', label: 'Provider' }, { key: 'is_borrower', label: 'Borrower' },
];
export default function UserManagementPage({ user }: { user: RegisterResponse }) {
  const [users, setUsers] = useState<RegisterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  async function refresh() { setLoading(true); setError(''); try { setUsers(await listUsers()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load users.'); } finally { setLoading(false); } }
  useEffect(() => { document.title = 'User management · UniWare'; void refresh(); }, []);
  async function toggle(target: RegisterResponse, key: RoleKey) {
    const next = !target[key];
    if (target.id === user.id && key === 'is_admin' && !next) { setError('You cannot remove your own admin role.'); return; }
    setSaving(target.id); setError(''); setNotice('');
    try { const updated = await updateUserRoles(target.id, { [key]: next }); setUsers(current => current.map(item => item.id === updated.id ? updated : item)); setNotice(`Updated roles for ${updated.email}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update roles.'); } finally { setSaving(null); }
  }
  return <main className="user-management-page"><header className="user-management-header"><img src={uniwareLogo} alt="UniWare" /><nav><a href="#account">Your account</a></nav></header><section className="user-management-panel"><h1>User management</h1><p>View all accounts and assign or remove roles. Changes are saved immediately.</p>{error && <p role="alert" className="user-management-error">{error}</p>}{notice && <p role="status" className="user-management-notice">{notice}</p>}{loading ? <p role="status">Loading users…</p> : <div className="user-table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Department</th><th>Roles</th><th>Joined</th></tr></thead><tbody>{users.map(account => <tr key={account.id}><td>{account.first_name} {account.last_name}</td><td>{account.email}</td><td>{account.department || '—'}</td><td><div className="user-role-controls">{roles.map(role => <label key={role.key}><input type="checkbox" checked={account[role.key]} disabled={saving === account.id || (account.id === user.id && role.key === 'is_admin')} onChange={() => void toggle(account, role.key)} />{role.label}</label>)}</div></td><td>{new Date(account.date_joined).toLocaleDateString()}</td></tr>)}</tbody></table>{users.length === 0 && <p>No user accounts found.</p>}</div>}</section></main>;
}
