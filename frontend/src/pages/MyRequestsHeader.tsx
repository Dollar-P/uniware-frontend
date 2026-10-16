import uniwareLogo from '../assets/brand/uniware-logo.svg';

export function MyRequestsHeader() {
  return <header className="provider-request-header">
    <img src={uniwareLogo} alt="UniWare" className="uniware-logo" />
    <nav aria-label="Borrower navigation"><a href="#account">Your account</a><a href="#catalog">Catalog</a><a href="#my-requests">My requests</a></nav>
  </header>;
}
