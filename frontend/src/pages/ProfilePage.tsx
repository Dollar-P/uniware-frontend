import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getProfile, updateProfile } from '../services/profileApi';
import { EDITABLE_PROFILE_FIELDS, ProfileError, validateProfile } from '../types/profile';
import type { Profile, ProfileErrors, ProfileUpdate } from '../types/profile';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './ProfilePage.css';

const labels = { first_name: 'First name', last_name: 'Last name', department: 'Department (optional)' };

export default function ProfilePage({ onSaved }: { onSaved: (profile: Profile) => void }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <main className="profile-page">
      <header className="profile-header">
        <a href="#account" aria-label="Your account"><img className="uniware-logo" src={uniwareLogo} alt="UniWare" /></a>
        <a href="#account">Back to account</a>
      </header>
      <section className="profile-content" aria-label="Your profile">
        <ProfileContent key={attempt} onSaved={onSaved} retry={() => setAttempt(value => value + 1)} />
      </section>
    </main>
  );
}

function ProfileContent({ onSaved, retry }: { onSaved: (profile: Profile) => void; retry: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileUpdate | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    void getProfile().then(result => { if (active) setProfile(result); }).catch(cause => {
      if (!active) return;
      if (cause instanceof ProfileError && cause.status === 401) window.location.hash = 'login';
      else setError(cause instanceof Error ? cause.message : 'Unable to load your profile.');
    });
    return () => { active = false; mounted.current = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    const validation = validateProfile(draft);
    setErrors(validation);
    setError('');
    setNotice('');
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const saved = await updateProfile(draft);
      if (!mounted.current) return;
      setProfile(saved);
      setDraft(null);
      onSaved(saved);
      setNotice('Your profile has been saved.');
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof ProfileError) {
        if (cause.status === 401) { window.location.hash = 'login'; return; }
        setErrors(cause.fields);
      }
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile. Please try again.');
    } finally { if (mounted.current) setSaving(false); }
  }

  if (!profile) return error ? <><p className="form-message form-message-error" role="alert">{error}</p><button className="register-button" onClick={retry}>Try again</button></> : <p role="status">Loading your profile...</p>;
  return (
    <>
      <h1>{draft ? 'Edit profile' : 'Your profile'}</h1>
      <p className="profile-subtitle">Keep your name and department up to date.</p>
      {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
      <dl className="account-details profile-restricted">
        <div><dt>University Email</dt><dd>{profile.email}</dd></div>
        <div><dt>Account permissions</dt><dd>{[profile.is_borrower && 'Borrower', profile.is_provider && 'Provider', profile.is_admin && 'Admin'].filter(Boolean).join(', ') || 'None assigned'}</dd></div>
        <div><dt>Account status</dt><dd>{profile.account_status === 'ACTIVE' ? 'Active' : 'Suspended'}</dd></div>
      </dl>
      <p className="form-help">Email, permissions, and account status are managed by an administrator.</p>
      {draft ? (
        <form className="register-form profile-form" onSubmit={save} noValidate aria-busy={saving}>
          {EDITABLE_PROFILE_FIELDS.map(field => (
            <div className="form-field" key={field}>
              <label htmlFor={`profile-${field}`}>{labels[field]}</label>
              <input id={`profile-${field}`} name={field} value={draft[field]} disabled={saving}
                required={field !== 'department'}
                autoComplete={field === 'first_name' ? 'given-name' : field === 'last_name' ? 'family-name' : 'organization'}
                aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
                onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
              {errors[field] && <p className="form-error" id={`${field}-error`}>{errors[field]}</p>}
            </div>
          ))}
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          <div className="profile-actions">
            <button className="register-button" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            <button className="register-button" type="button" disabled={saving} onClick={() => { setDraft(null); setErrors({}); setError(''); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <dl className="account-details">
            <div><dt>First name</dt><dd>{profile.first_name}</dd></div>
            <div><dt>Last name</dt><dd>{profile.last_name}</dd></div>
            <div><dt>Department</dt><dd>{profile.department || 'Not specified'}</dd></div>
          </dl>
          <button className="register-button" onClick={() => {
            setNotice(''); setError(''); setErrors({});
            setDraft({ first_name: profile.first_name, last_name: profile.last_name, department: profile.department });
          }}>Edit profile</button>
        </>
      )}
    </>
  );
}
