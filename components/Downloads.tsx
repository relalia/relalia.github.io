'use client';

import type { Attachment } from '@/lib/types';

export default function Downloads({ files }: { files: Attachment[] }) {
  return <div className="actions">
    {files.map((file, index) => <a className={`action ${index === 0 ? 'primary' : ''}`} href={file.path} download key={file.path}>↓ {file.label}</a>)}
    <button type="button" className="action" onClick={() => window.print()}>⎙ Imprimir esta ficha</button>
  </div>;
}
