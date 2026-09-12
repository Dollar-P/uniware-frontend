import { useEffect, useRef, useState } from 'react';
import RegisterPage from './pages/RegisterPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import CatalogPage from './pages/CatalogPage';
import MyEquipmentPage from './pages/MyEquipmentPage';
import { currentUser, logout } from './services/sessionApi';
import type { RegisterResponse } from './types/auth';
import uniwareLogo from './assets/brand/uniware-logo.svg';

type Route = 'signup' | 'login' | 'account' | 'my-equipment' | 'catalog' | `equipment/${string}`;
function readRoute(): Route {
  if (window.location.hash === '#catalog') return 'catalog';
  if (window.location.hash.startsWith('#equipment/')) return window.location.hash.slice(1) as Route;
  if (window.location.hash === '#my-equipment') return 'my-equipment';
  return window.location.hash === '#login' ? 'login' : window.location.hash === '#account' ? 'account' : 'signup';
}
function App() {
  const [route, setRoute] = useState(readRoute);
  const [user, setUser] = useState<RegisterResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const sessionVersion = useRef(0);
  async function handleLogout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    sessionVersion.current += 1;
    setChecking(false);
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      setUser(null);
      setError('');
      window.history.replaceState(null, '', '#login');
      setRoute('login');
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : 'Unable to log out. Please try again.');
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  }
  useEffect(() => {
    const navigate = () => setRoute(readRoute());
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    let active = true;
    async function check() {
      if (logoutPending.current) return;
      const version = ++sessionVersion.current;
      setChecking(true);
      setError('');
      try {
        const account = await currentUser();
        if (!active || version !== sessionVersion.current) return;
        setUser(account);
        // 'my-equipment' is an authenticated route like 'account': a signed-in user
        // stays put, and a signed-out one is sent to login.
        const authenticatedRoute = route === 'account' || route === 'catalog' || route === 'my-equipment' || route.startsWith('equipment/');
        if (account && !authenticatedRoute) window.location.hash = 'account';
        if (!account && authenticatedRoute) window.location.hash = 'login';
      } catch {
        if (active && version === sessionVersion.current) {
          setUser(null);
          setError('We could not check your session. Please try again.');
        }
      } finally {
        if (active && version === sessionVersion.current) setChecking(false);
      }
    }
    void check();
    window.addEventListener('focus', check);
    return () => { active = false; window.removeEventListener('focus', check); };
  }, [route, attempt]);
  useEffect(() => {
    document.title = `${route === 'login' ? 'Sign in' : route === 'account' ? 'Your account' : route === 'catalog' ? 'Equipment catalog' : route === 'my-equipment' ? 'My equipment' : route.startsWith('equipment/') ? 'Equipment details' : 'Sign up'} · UniWare`;
  }, [route]);
  // EPIC2: the provider surfaces need a signed-in user, so they render only once the
  // session check has resolved.
  if (route === 'catalog' && !checking && user) {
    return <CatalogPage user={user} onLogout={handleLogout} loggingOut={loggingOut} logoutError={logoutError} />;
  }
  if (route.startsWith('equipment/') && !checking && user) {
    let id = '';
    try { id = decodeURIComponent(route.slice('equipment/'.length)); } catch { /* Invalid IDs show not found. */ }
    return <EquipmentDetailPage key={id} equipmentId={id} />;
  }
  if (route === 'my-equipment' && !checking && user) {
    return <MyEquipmentPage user={user} />;
  }
  if (checking || route === 'account' || route === 'catalog' || route === 'my-equipment' || route.startsWith('equipment/')) {
    return (
      <main className="account-page">
        <img className="uniware-logo" src={uniwareLogo} alt="UniWare" />
        <section className="account-content" aria-label="Your account">
          {checking ? <p role="status">Checking your session...</p> : error ? (
            <>
              <p className="form-message form-message-error" role="alert">{error}</p>
              <button className="register-button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
            </>
          ) : user ? (
            <>
              <h1>Welcome, {user.first_name}</h1>
              <p>You’re signed in to UniWare.</p>
              <dl className="account-details">
                <div><dt>University Email</dt><dd>{user.email}</dd></div>
                <div><dt>Name</dt><dd>{user.first_name} {user.last_name}</dd></div>
                <div><dt>Department</dt><dd>{user.department || 'Not specified'}</dd></div>
                <div><dt>Account permissions</dt><dd>{[
                  user.is_borrower && 'Borrower', user.is_provider && 'Provider', user.is_admin && 'Admin',
                ].filter(Boolean).join(', ') || 'No equipment permissions assigned'}</dd></div>
              </dl>
              <a className="register-button account-action-link" href="#catalog">Browse equipment</a>
              {user.is_provider && (
                <a className="register-button account-action-link" href="#my-equipment">Manage my equipment</a>
              )}
              {logoutError && <p className="form-message form-message-error" role="alert">{logoutError}</p>}
              <button className="register-button logout-button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </>
          ) : <p role="status">Opening sign in...</p>}
        </section>
      </main>
    );
  }
  return <RegisterPage key={route} mode={route === 'login' ? 'login' : 'signup'} onLogin={account => {
    setUser(account);
    window.location.hash = 'account';
  }} />;
}
export default App;
