import RegisterForm from '../components/auth/RegisterForm';
import './RegisterPage.css';

function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-card">

        <div className="register-header">
          <div className="brand">
            <span className="brand-mark">U</span>
            <span className="brand-name">UniWare</span>
          </div>

          <h1>Create your account</h1>

          <p className="register-subtitle">
            Use your @chula.ac.th email or a university subdomain to get started.
          </p>
        </div>

        <RegisterForm />

        <p className="register-footer">
          Already have an account?{' '}
          <span className="login-placeholder">
            Sign in
          </span>
        </p>

      </section>
    </main>
  );
}

export default RegisterPage;
