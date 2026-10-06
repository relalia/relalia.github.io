'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { evidenceById } from '@/lib/reports';

export default function EvidenceGallery({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const selected = open ? evidenceById.get(open) : null;
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  if (!ids.length) return null;
  return <>
    <div className="evidence-gallery">
      {ids.map(id => {
        const item = evidenceById.get(id);
        if (!item) return null;
        return <figure className={`evidence-card ${item.kind === 'video' ? 'video-card' : ''}`} key={id}>
          <figcaption><strong>{id}</strong><p>{item.description}</p></figcaption>
          {item.kind === 'image' && item.path && <button className="image-trigger" type="button" onClick={() => setOpen(id)} aria-label={`Ampliar ${id}`}><img src={item.path} alt={item.description} loading="lazy" /><span>Ampliar captura ↗</span></button>}
          {item.kind === 'video' && item.path && <video controls playsInline preload="metadata" aria-label={`Vídeo ${id}`}><source src={item.path} type="video/mp4" />Seu navegador não reproduz este vídeo. Use o link de download.</video>}
          {item.kind === 'description' && <span className="description-only">Descrição sem imagem incorporada.</span>}
          {item.path && <a className="evidence-download" href={item.path} download={item.originalName}>↓ Baixar original{item.kind === 'video' ? ' · MP4' : ''}</a>}
          {item.originalName && <small className="filename">{item.originalName}</small>}
        </figure>;
      })}
    </div>
    <dialog className="lightbox" ref={dialog} onClose={() => setOpen(null)} onClick={event => {if (event.target === event.currentTarget) setOpen(null);}} aria-labelledby={titleId}>
      {selected?.path && <><div className="lightbox-bar"><strong id={titleId}>{selected.id}</strong><button type="button" onClick={() => setOpen(null)} autoFocus>Fechar ×</button></div><img src={selected.path} alt={selected.description} /><p>{selected.description}</p><a href={selected.path} download={selected.originalName}>Baixar original</a></>}
    </dialog>
  </>;
}
