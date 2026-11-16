import { photoUrl } from '../../services/equipmentApi';
import { useEffect, useState } from 'react';
import type { EquipmentPhoto } from '../../types/equipment';
import './EquipmentGallery.css';

export default function EquipmentGallery({ photos = [], name }: { photos?: EquipmentPhoto[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  const photo = photos[selected];
  if (!photo) return <div className="equipment-photo-placeholder">No photo available</div>;
  const missing = failed.includes(photo.slot);
  return <section className="equipment-gallery" aria-label={`${name} photos`}>
    <div className="equipment-gallery-main">
      {missing ? <div className="equipment-photo-placeholder">Photo unavailable</div> : <>
        <img src={photoUrl(photo.preview_url)} alt={`${name}, photo ${selected + 1}`} onError={() => setFailed(current => [...current, photo.slot])} />
        <button type="button" className="equipment-gallery-zoom" aria-label="View full-size photo" onClick={() => { setOriginalFailed(false); setOpen(true); }}>⌕</button>
      </>}
    </div>
    {photos.length > 1 && <div className="equipment-gallery-thumbnails">{photos.map((item, index) => <button key={item.slot} type="button" aria-label={`Show photo ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
      {failed.includes(item.slot) ? 'Unavailable' : <img src={photoUrl(item.preview_url)} alt="" onError={() => setFailed(current => [...current, item.slot])} />}
    </button>)}</div>}
    {open && <div className="equipment-gallery-overlay" role="dialog" aria-modal="true" aria-label="Full-size photo" onClick={() => setOpen(false)}>
      <button type="button" aria-label="Close full-size photo" onClick={() => setOpen(false)}>×</button>
      <img src={photoUrl(photo.original_url)} alt={`${name}, full-size photo`} onClick={event => event.stopPropagation()} onError={() => setOriginalFailed(true)} style={originalFailed ? { display: 'none' } : undefined} />
      <p>{originalFailed ? 'Unable to load the full-size photo.' : 'Full-size photo'}</p>
    </div>}
  </section>;
}
