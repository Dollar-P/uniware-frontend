import { useEffect, useState } from 'react';
import EquipmentDetails from '../components/equipment/EquipmentDetails';
import { EquipmentError, getEquipment } from '../services/equipmentApi';
import type { Equipment } from '../types/equipment';
import './EquipmentDetailPage.css';

export default function EquipmentDetailPage({ equipmentId }: { equipmentId: string }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getEquipment(equipmentId)
      .then(result => {
        if (active) setEquipment(result);
      })
      .catch(cause => {
        if (!active) return;
        setEquipment(null);
        setError(cause instanceof EquipmentError && cause.status === 404
          ? 'This equipment could not be found.'
          : cause instanceof Error ? cause.message : 'Unable to load this equipment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [equipmentId]);

  return (
    <main className="equipment-detail-page">
      <a className="equipment-back-link" href="#account">← Back to account</a>
      <section className="equipment-detail-content" aria-live="polite">
        {loading ? <p role="status">Loading equipment...</p> : error ? (
          <p className="form-message form-message-error" role="alert">{error}</p>
        ) : equipment ? <EquipmentDetails equipment={equipment} /> : null}
      </section>
    </main>
  );
}
