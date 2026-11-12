const media = '/evidence/estrutura-2026-11-12';
const video = '/originals/evidence/estrutura-2026-11-12/comparacao-chat.mp4';

export default function StructureReport() {
  return <div className="structure-report">
    <p className="structure-lead">Proposta para aproveitar melhor a largura da tela nas duas páginas.</p>

    <section id="VC-EST-01" className="structure-section" aria-labelledby="structure-chat">
      <span className="structure-label">01 · Chat</span>
      <h3 id="structure-chat">Ampliar a área de conversa</h3>
      <p><strong>Alterar:</strong> retirar o limite de largura do contêiner, manter o histórico lateral e evitar rolagens concorrentes. O campo de mensagem deve permanecer acessível.</p>
      <div className="structure-comparison">
        <figure><figcaption><strong>Serviço na gravação</strong><span>00:06</span></figcaption><img src={`${media}/chat-servico.jpg`} alt="Chat do serviço com margens laterais e barra de rolagem interna." loading="lazy" /></figure>
        <figure><figcaption><strong>Cópia modificada</strong><span>00:03</span></figcaption><img src={`${media}/chat-proposta.jpg`} alt="Chat na cópia modificada, com histórico à esquerda e área de conversa ampliada." loading="lazy" /></figure>
      </div>
      <p className="structure-caption">Quadros recortados da gravação fornecida.</p>
      <details className="structure-detail"><summary>Testar cópia do Chat</summary>
        <p>Protótipo local; respostas simuladas.</p>
        <iframe title="Protótipo do Chat" src="/reports/prototipo-vadechat-estrutura-2026-11-12.html" sandbox="allow-scripts" loading="lazy" />
      </details>
      <details className="structure-detail"><summary>Ver vídeo da comparação · 21 s</summary>
        <video controls preload="metadata" playsInline src={video}>Seu navegador não suporta vídeo incorporado.</video>
        <p>Gravação original fornecida. <a href={video} download>Baixar vídeo</a></p>
      </details>
    </section>

    <section id="GIRO-EST-01" className="structure-section" aria-labelledby="structure-giro">
      <span className="structure-label">02 · GIRO</span>
      <h3 id="structure-giro">Ampliar a grade de cards</h3>
      <p><strong>Alterar:</strong> remover os limites de largura dos contêineres e usar uma grade responsiva, com largura mínima para cada card.</p>
      <div className="structure-comparison">
        <figure><figcaption><strong>Arquivo fornecido</strong><span>1440 px · 3 colunas</span></figcaption><img src={`${media}/giro-original.jpg`} alt="GIRO do arquivo fornecido em uma área central limitada, com três colunas de cards." loading="lazy" /></figure>
        <figure><figcaption><strong>Cópia modificada</strong><span>1440 px · 4 colunas</span></figcaption><img src={`${media}/giro-proposta.jpg`} alt="GIRO modificado ocupando a largura disponível, com quatro colunas de cards." loading="lazy" /></figure>
      </div>
      <p className="structure-caption">Recortes das duas telas em 1440 px. Não há vídeo do GIRO.</p>
      <details className="structure-detail"><summary>Testar cópia do GIRO</summary>
        <p>Busca e abrangência locais; links abrem as fontes.</p>
        <iframe title="Protótipo do GIRO" src="/reports/prototipo-giro-estrutura-2026-11-12.html" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" loading="lazy" />
      </details>
    </section>

    <section className="structure-verification" aria-labelledby="structure-verification">
      <h3 id="structure-verification">Antes de implementar</h3>
      <p>Testar em desktop e celular, com zoom, teclado e conteúdo longo. As duas telas são propostas; não houve reteste no produto.</p>
    </section>
    <details className="structure-detail structure-sources"><summary>Fontes e integridade</summary>
      <p>Chat — HTML otimizado fornecido: <code>9b9838aa2fb99e957274efee2c304ff3fbc4dd6ef5509ef6d1871d250bef47bd</code></p>
      <p>Vídeo original: <code>818c7d7115918fda8b7d6798d5a3a1b0561b9928cdb514d9a21f342d7221fcf1</code></p>
      <p>GIRO — HTML fornecido: <code>a112ad4c48be86bb47307353c8c8afef7131c461732eeee4abf41364e9d3dd4b</code></p>
      <p>SHA-256. As cópias usam CSS e imagens embutidos; fontes do sistema substituem as fontes indisponíveis.</p>
    </details>
  </div>;
}
