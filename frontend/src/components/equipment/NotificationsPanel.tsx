import { useEffect, useState } from 'react';
import { listEquipmentNotices } from '../../services/equipmentApi';
import type { EquipmentNotice } from '../../services/equipmentApi';

export default function NotificationsPanel() {
  const [items, setItems] = useState<EquipmentNotice[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void listEquipmentNotices().then(data => { if (live) setItems(data); })
      .catch(() => { if (live) setError('Unable to load equipment notifications.'); });
    return () => { live = false; };
  }, []);
  if (!items.length && !error) return null;
  return <section className="equipment-notifications" aria-label="Equipment notifications">
    <h2>Equipment notifications</h2>
    {error && <p role="alert">{error}</p>}
    <ul>{items.map(item => <li key={item.id}>
      <a href={`#equipment/${encodeURIComponent(item.equipment_id)}`}>{item.message}</a>
      <small> {new Date(item.created_at).toLocaleString()}</small>
    </li>)}</ul>
  </section>;
}
