const prototype = '/reports/prototipo-atlas-2026-11-13.html';
const media = '/evidence/atlas-estrutura-2026-11-13';

const previews = [
  { id: 'resumo', title: 'Matrícula e resumo da análise', section: 'resumo', description: 'O cabeçalho preserva a matrícula, o livro e a data da leitura. Logo abaixo, a barra de navegação e o resumo dão acesso aos dados revisados e às diligências que merecem atenção primeiro.', wide: true },
  { id: 'achados', title: 'Achados e diligências', section: 'achados', description: 'Os filtros distinguem erros corrigidos, pontos de atenção e lacunas que podem impedir um ato. A lista ao lado indica as certidões e escrituras que precisam ser conferidas.', wide: true },
  { id: 'completa', title: 'Cadeia dominial completa', section: 'cadeia/completa', description: 'Os quatro ramos convergem na unificação de 2018. Os vínculos tracejados indicam elos a conferir, e o painel à direita explica o registro selecionado e sua fonte.', wide: true },
  { id: 'vintenaria', title: 'Recorte vintenário', section: 'cadeia/vintenario', description: 'O gráfico parte dos títulos vigentes em 11/11/2006. As ressalvas anteriores ficam em uma seção própria, separadas da avaliação de continuidade no período.' },
  { id: 'sucessao', title: 'Sucessão, doação e divisão', section: 'sucessao', description: 'O recorte mostra como as frações foram transmitidas e quais glebas resultaram da divisão. A vista completa começa nos inventários e destaca a matrícula em análise.' },
  { id: 'imovel', title: 'Imóvel, titulares e ônus', section: 'imovel', description: 'O indicador real agrupa os campos cadastrais. Titularidade e ônus ficam em blocos próprios, com o CAR identificado pelo ato de origem.' },
  { id: 'atos', title: 'Atos e fontes', section: 'atos', description: 'Cada ato tem um resumo e abre o texto da captura sob demanda. As fontes consultadas aparecem ao lado para facilitar a conferência.' },
  { id: 'conferencia', title: 'Conferência com o Tri7', section: 'conferencia', description: 'O quadro compara o cadastro, a leitura do Atlas e a revisão documental. A leitura original permanece acessível em um bloco recolhido.' },
  { id: 'celular', title: 'Navegação no celular', section: 'cadeia', description: 'Em telas estreitas, o gráfico tem uma vista em lista que explicita o próximo elo. O detalhe do registro abre abaixo e mantém o caminho de volta.' },
] as const;

export default function AtlasStructureReport() {
  return <div className="structure-report atlas-structure-report">
    <div className="atlas-structure-intro">
      <p className="structure-lead">Proposta para enxugar a tela da matrícula 40.048 sem perder a cadeia dominial, os atos e a conferência dos dados.</p>
      <a className="action primary" href={prototype}>Abrir tela completa do Atlas <span aria-hidden="true">↗</span></a>
      <p className="structure-caption">Demonstração interativa com nomes e identificadores pessoais mascarados.</p>
    </div>
    <div className="atlas-previews" aria-label="Recortes da nova tela">
      {previews.map(preview => <figure key={preview.id} className={'wide' in preview ? 'atlas-preview-wide' : undefined}>
        <figcaption><h3>{preview.title}</h3><p>{preview.description}</p></figcaption>
        <a href={`${prototype}#${preview.section}`} aria-label={`Abrir na tela completa: ${preview.title}`}>
          <img src={`${media}/${preview.id}.webp`} alt={`Recorte da demonstração do Atlas — ${preview.title}`} loading={preview.id === 'resumo' ? 'eager' : 'lazy'} decoding="async" />
        </a>
      </figure>)}
    </div>
    <p className="note">Proposta de interface baseada na avaliação e nos relatórios da cadeia dominial. A demonstração usa os dados da revisão documental, sem conexão com o Atlas em produção.</p>
  </div>;
}
