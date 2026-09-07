import { useEffect, useState } from 'react';
import RegisterPage from './pages/RegisterPage';
import { currentUser } from './services/sessionApi';
import type { RegisterResponse } from './types/auth';
import uniwareLogo from './assets/brand/uniware-logo.svg';

function readRoute(): 'signup' | 'login' | 'account' {
  return window.location.hash === '#login' ? 'login' : window.location.hash === '#account' ? 'account' : 'signup';
}
function App() {
  const [route, setRoute] = useState(readRoute);
  const [user, setUser] = useState<RegisterResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const navigate = () => setRoute(readRoute());
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    let active = true;
    async function check() {
      setChecking(true);
      setError('');
      try {
        const account = await currentUser();
        if (!active) return;
        setUser(account);
        if (account && route !== 'account') window.location.hash = 'account';
        if (!account && route === 'account') window.location.hash = 'login';
      } catch {
        if (active) {
          setUser(null);
          setError('We could not check your session. Please try again.');
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    window.addEventListener('focus', check);
    return () => { active = false; window.removeEventListener('focus', check); };
  }, [route, attempt]);
  useEffect(() => {
    document.title = `${route === 'login' ? 'Sign in' : route === 'account' ? 'Your account' : 'Sign up'} · UniWare`;
  }, [route]);
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
            </>
          ) : <p role="status">Opening sign in...</p>}
        </section>
      </main>
    );
  }
  return <RegisterPage key={route} mode={route} onLogin={account => {
    setUser(account);
    window.location.hash = 'account';
  }} />;
}
export default App;
