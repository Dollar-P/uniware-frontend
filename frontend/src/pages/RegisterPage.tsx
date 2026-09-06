import RegisterForm from '../components/auth/RegisterForm';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import chulaLogo from '../assets/brand/chula-logo.svg';
import './RegisterPage.css';

function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-intro" aria-label="About UniWare">
        <img className="uniware-logo" src={uniwareLogo} alt="UniWare" />
        <p className="intro-statement">
          <span>Searching</span>
          <span>Reserving</span>
          <span>Borrowing</span>
          <span>Returning</span>
          <span className="intro-ending">and Managing University Equipments</span>
        </p>
      </section>
      <section className="register-panel" aria-labelledby="signup-title">
        <div className="register-card">
          <header className="register-header">
            <h1 id="signup-title">Sign up</h1>
            <p className="register-subtitle">
              Use your @chula.ac.th email or a university subdomain.
            </p>
          </header>
          <RegisterForm />
          <footer className="register-footer">
            <img className="chula-logo" src={chulaLogo} alt="Chulalongkorn University" />
          </footer>
        </div>
      </section>
    </main>
  );
}
export default RegisterPage;
