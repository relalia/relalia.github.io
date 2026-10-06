'use client';

import type { Attachment } from '@/lib/types';

export default function Downloads({ files }: { files: Attachment[] }) {
  return <section className="downloads" aria-label="Documentos da rodada">
    {files.map(file => <div className="download-card" key={file.path}>
      <div><strong>{file.label}</strong><small>{file.origin === 'original' ? 'Arquivo original · bytes preservados' : 'Documento gerado a partir desta ficha'}</small></div>
      <div className="download-actions"><a className="action" href={file.path} target="_blank" rel="noreferrer">Abrir</a><a className="action primary" href={file.path} download={file.originalName}>↓ Baixar</a></div>
      {file.sha256 && <details className="integrity"><summary>Conferir SHA-256</summary><code>{file.sha256}</code></details>}
    </div>)}
    <button type="button" className="action print-action" onClick={() => window.print()}>Imprimir esta ficha</button>
  </section>;
}
