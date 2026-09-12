import { useEffect, useState } from 'react';
import EquipmentDetails from '../components/equipment/EquipmentDetails';
import { getEquipment } from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment } from '../types/equipment';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './MyEquipmentPage.css';
import './EquipmentDetailPage.css';

export default function EquipmentDetailPage({ equipmentId }: { equipmentId: string }) {
  const [attempt, setAttempt] = useState(0);
  // Keyed request content prevents stale details being shown after ID changes or retries.
  return (
    <main className="equipment-page">
      <header className="equipment-page-header">
        <a href="#account" aria-label="Your account"><img className="uniware-logo" src={uniwareLogo} alt="UniWare" /></a>
        <a className="equipment-back-link" href="#catalog">Back to catalog</a>
      </header>
      <section className="equipment-detail-content" aria-live="polite">
        <DetailContent key={`${equipmentId}:${attempt}`} equipmentId={equipmentId} retry={() => setAttempt(value => value + 1)} />
      </section>
    </main>
  );
}

function DetailContent({ equipmentId, retry }: { equipmentId: string; retry: () => void }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(!equipmentId);
  const [loading, setLoading] = useState(Boolean(equipmentId));
  useEffect(() => {
    if (!equipmentId) return;
    let active = true;
    void getEquipment(equipmentId)
      .then(result => { if (active) setEquipment(result); })
      .catch(cause => {
        if (!active) return;
        if (cause instanceof EquipmentError && cause.status === 401) {
          window.location.hash = 'login';
          return;
        }
        setNotFound(cause instanceof EquipmentError && cause.status === 404);
        setError(cause instanceof Error ? cause.message : 'Unable to load this equipment.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [equipmentId]);
  if (loading) return <p role="status">Loading equipment...</p>;
  if (notFound) return <div className="equipment-empty"><h1>Equipment not found</h1><p>This item does not exist or is no longer visible in the catalog.</p></div>;
  if (error) return <div className="equipment-error"><p className="form-message form-message-error" role="alert">{error}</p><button className="register-button" onClick={retry}>Try again</button></div>;
  return equipment ? <EquipmentDetails equipment={equipment} /> : null;
}
