import { useEffect, useRef, useState } from 'react';
import RegisterPage from './pages/RegisterPage';
import CatalogPage from './pages/CatalogPage';
import { currentUser, logout } from './services/sessionApi';
import type { RegisterResponse } from './types/auth';
import uniwareLogo from './assets/brand/uniware-logo.svg';

function readRoute(): 'signup' | 'login' | 'account' | 'catalog' {
  return window.location.hash === '#login' ? 'login' : window.location.hash === '#account' ? 'account' : window.location.hash === '#catalog' ? 'catalog' : 'signup';
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
        if (account && route !== 'account' && route !== 'catalog') window.location.hash = 'account';
        if (!account && (route === 'account' || route === 'catalog')) window.location.hash = 'login';
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
    document.title = `${route === 'login' ? 'Sign in' : route === 'account' ? 'Your account' : route === 'catalog' ? 'Equipment catalog' : 'Sign up'} · UniWare`;
  }, [route]);
  if (!checking && route === 'catalog' && user) {
    return <CatalogPage userName={user.first_name} onLogout={handleLogout} />;
  }
  if (checking || route === 'account') {
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
              {logoutError && <p className="form-message form-message-error" role="alert">{logoutError}</p>}
              <button className="register-button logout-button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
              <a className="register-button catalog-button" href="#catalog">Browse equipment</a>
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
