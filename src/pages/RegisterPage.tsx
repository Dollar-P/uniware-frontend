import RegisterForm from '../components/auth/RegisterForm';
import LoginForm from '../components/auth/LoginForm';
import type { RegisterResponse } from '../types/auth';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import chulaLogo from '../assets/brand/chula-logo.svg';
import './RegisterPage.css';

function RegisterPage({ mode = 'signup', onLogin }: {
  mode?: 'signup' | 'login';
  onLogin?: (user: RegisterResponse) => void;
}) {
  return (
    <main className="register-page">
      <section className="register-intro" aria-label="About UniWare">
        <img className="uniware-logo" src={uniwareLogo} alt="UniWare" />
        <p className="intro-statement">
          <span>Searching</span>
          <span>Borrowing</span>
          <span>Providing</span>
          <span>Managing</span>
          <span className="intro-ending">University Equipments</span>
        </p>
      </section>
      <section className="register-panel" aria-labelledby="signup-title">
        <div className="register-card">
          <header className="register-header">
            <h1 id="signup-title">{mode === 'login' ? 'Sign in' : 'Sign up'}</h1>
            <p className="register-subtitle">
              Use your @chula.ac.th email or a university subdomain.
            </p>
          </header>
          {mode === 'login' ? <LoginForm onSuccess={user => onLogin?.(user)} /> : <RegisterForm />}
          <div className="auth-switch">
            <a className="register-button" href={mode === 'login' ? '#signup' : '#login'}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </a>
            <p className="register-subtitle">
              {mode === 'login' ? "if you don't have an account yet" : 'if you already have registered an account'}
            </p>
          </div>
          <footer className="register-footer">
            <img className="chula-logo" src={chulaLogo} alt="Chulalongkorn University" />
          </footer>
        </div>
      </section>
    </main>
  );
}
export default RegisterPage;
