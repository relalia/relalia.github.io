'use client';

import { useState } from 'react';
import { evidenceById } from '@/lib/reports';

export default function EvidenceGallery({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!ids.length) return null;
  const selected = open ? evidenceById.get(open) : null;
  return <>
    <div className="evidence-gallery">
      {ids.map(id => {
        const item = evidenceById.get(id);
        if (!item) return null;
        return <div className="evidence-card" key={id}>
          <strong>{id}</strong><p>{item.description}</p>
          {item.image ? <button type="button" onClick={() => setOpen(id)} aria-label={`Ampliar ${id}`}><img src={item.image} alt={`Evidência revisada ${id}`} loading="lazy" /></button> : <span className="omitted">Imagem omitida na versão pública</span>}
        </div>;
      })}
    </div>
    {selected?.image && <div className="lightbox-backdrop" role="presentation" onClick={() => setOpen(null)}>
      <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Evidência ${selected.id}`} onClick={event => event.stopPropagation()}>
        <div className="lightbox-bar"><strong>{selected.id}</strong><button type="button" onClick={() => setOpen(null)}>Fechar ×</button></div>
        <img src={selected.image} alt={selected.description} />
      </div>
    </div>}
  </>;
}
