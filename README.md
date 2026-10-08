# Relalia: O Relatório da Alia

Portal estático de validações e propostas para Alia, GIRO, VadeChat, Atlas e Base de Conhecimento, publicado em **https://relalia.github.io/** pelo repositório **relalia/relalia.github.io**. Next.js, TypeScript e App Router, sem API Routes, Server Actions ou servidor de produção. Cada relatório tem HTML próprio e funciona por navegação, acesso direto e atualização do navegador.

## Executar localmente

Requisitos de desenvolvimento/build: Node.js 22+, pnpm 11, Python 3.12+. Python gera os documentos durante o build; o site publicado só contém arquivos estáticos.

```sh
pnpm install --frozen-lockfile
python -m pip install -r requirements-pdf.txt
pnpm dev
```

Desenvolvimento: http://localhost:3000. Para exportar e conferir:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm verify
python scripts/verify-pdfs.py
pnpm start:export
```

Prévia da pasta `out`: http://127.0.0.1:4173. `pnpm check` reúne testes de dados, typecheck, geração de PDFs, exportação e verificação dos arquivos. `pnpm pdfs` gera só os PDFs. Se o Python não estiver no PATH, defina `RELALIA_PYTHON` com o caminho do executável (PowerShell: `$env:RELALIA_PYTHON='C:\caminho\python.exe'`).

## Estrutura

- `app/`: página inicial com a rodada mais recente e `relatorios/[slug]`, gerada por `generateStaticParams`. `globals.css` contém a identidade visual, layouts móveis e impressão.
- `lib/types.ts`: relatórios, achados, anexos, evidências, comparações e execução/resultado do reteste. `lib/reports.ts`: acesso ao catálogo.
- `content/reports.json`: conteúdo; os registros Atlas preservam os campos de origem em `originalRecord`. Comparações indicam `reportId`, `findingId` e `label`.
- `components/`: linha do tempo, ficha, filtros Radix Select, achado, galeria com ampliação/MP4 e abertura/download de documentos.
- `public/originals/`: quatro PDFs, XLSX e evidências originais. `SHA256SUMS.txt` e `content/originals.sha256.json` registram integridade.
- `public/reports/`: PDFs gerados, separados dos originais. As fichas das rodadas antigas são complementares; novas rodadas têm relatórios gerados a partir do catálogo. URLs anteriores foram preservadas.
- `scripts/`: geração/verificação de PDFs, validação do catálogo, testes de vínculos e prévia estática com suporte a Range para vídeo.
- `.github/workflows/pages.yml`: instala dependências, testa, gera PDFs e exportação, verifica e publica somente `out`.

## Materiais e integridade

Por decisão expressa do responsável pelo MVP, os documentos e capturas originais são públicos, sem anonimização ou autenticação de servidor. A interface exige uma senha compartilhada para restringir navegação casual (nível 1). HTML/dados, URLs diretas dos anexos, repositório e histórico Git continuam públicos. Esse bloqueio não é autenticação segura nem criptografia. As cópias publicadas preservam exatamente os bytes dos arquivos fornecidos. O build verifica SHA-256 antes de gerar PDFs; a verificação final repete a conferência em `out`. Os arquivos de origem locais em `relatorios/`, `assets/` e `data.js` continuam fora do Git, enquanto as cópias publicadas estão organizadas em `public/originals`.

## Senha da interface e manutenção

Execute o utilitário em uma janela externa do CMD no Windows (PowerShell 5.1/.NET 4.8 ou mais recente):

```bat
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rafae\Documents\GitHub\alia-pages-demo\scripts\set-access-password.ps1"
```

Ele solicita senha e confirmação com entrada oculta, sem caracteres visíveis. Não passe a senha por argumento, variável de ambiente ou conversa. O processo usa bytes UTF-8, salt aleatório de 16 bytes e PBKDF2-HMAC-SHA-256 com 600.000 iterações e resultado de 256 bits. Grava atomicamente **somente** `algorithm`, `hash`, `iterations`, `length`, `salt`, `verifier` e `version` em `public/access-config.json`. A configuração derivada é pública; não contém a senha. Confirmação divergente/vazia ou falha preserva a configuração anterior. Não há senha padrão ou acesso alternativo. Os buffers temporários são limpos no processo; a memória de runtimes não oferece garantia absoluta de apagamento.

Para trocar a senha, execute o mesmo comando: são gerados novo salt e nova versão UUID. Execute `pnpm test`, `pnpm typecheck`, `pnpm build` e `pnpm verify`; commit/push da configuração derivada para `main` publica a troca pelo workflow existente. Não adicione a senha à documentação ou ao commit. A verificação de publicação recusa configuração ausente, inválida ou com campos extras. Em desenvolvimento, ausência/erro mantém a interface bloqueada.

`components/AccessGate.tsx`, no layout compartilhado, começa fechado na renderização estática. Após verificar a senha com Web Crypto, preserva a URL solicitada e grava no localStorage **somente** `{ version, expiresAt }`, com expiração absoluta de oito horas (sem renovação pela navegação). Revalida no carregamento, foco/retorno à aba, eventos de armazenamento e no prazo final. A ação **Sair** sincroniza entre abas via eventos de storage e BroadcastChannel, quando disponíveis. Se o armazenamento falhar, a liberação existe só na memória daquela aba, até o prazo ou recarga. Sem JavaScript a interface fica bloqueada com mensagem explicativa. Web Crypto exige HTTPS ou localhost; navegador sem o recurso também fica bloqueado.

A configuração é buscada separadamente com `cache: 'no-store'` e URL única a cada consulta, no carregamento, envio, retorno e a cada minuto enquanto a aba está visível. Não é embutida no bundle. A troca de versão invalida liberações anteriores no fluxo normal assim que a nova publicação é consultada; clientes offline, cópias antigas e marcadores manipulados não são revogados por esse controle local. Erro de conexão/configuração fecha a interface e oferece nova tentativa. Preserve o nome `public/access-config.json` e publique a configuração junto do restante da exportação. O cache dos anexos não muda.

Testes automatizados de derivação usam credenciais descartáveis em memória, sem consultar a senha real. `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/set-access-password.ps1 -SelfTest` testa confirmação divergente e o vetor PBKDF2 sem gravar configuração. Para conferir a senha definitiva, digite-a diretamente no navegador; o agente não precisa recebê-la.

O Atlas mantém 51 achados, 44 IDs de evidências e as 43 imagens incorporadas à planilha. **EV-27 é descrição sem imagem incorporada**. Não foi reconstruída uma imagem ausente. Os vínculos originais são preservados, inclusive associações que não são simétricas entre as listas de achados e evidências. AC-022 distingue o texto extraído (assinaturas/validações) da hipótese de causa provável dos problemas relacionados, e disponibiliza a descrição original integral.

“Reteste executado” indica execução, não correção. O resultado de cada achado é registrado separadamente, inclusive persistência e melhora parcial.

## Cadastrar uma rodada

1. Acrescente um objeto a `content/reports.json` com `id` único em formato de slug, `date` ISO, `title`, `module`, `status`, `count`, `summary`, `highlights`, `files` e `findings`. A rota será `/relatorios/ID/`. Não copie páginas. A linha do tempo, sua contagem e a página inicial são atualizadas automaticamente.
2. Cada achado precisa de `id` estável e único na rodada, `title`, `description`, `status`, `evidenceIds` e `retest.execution`. Para novos registros, preencha `kind`, `expected` e `verification`; acrescente criticidade apenas quando cadastrada. Use `observationLabel`, `hypothesis` e `suggestion` para separar relato, hipótese e proposta. IDs de perguntas podem reaparecer em retestes de outra rodada, conectados por `comparisons`.
3. Use `retest.execution: "not-performed"` para aguardando reteste, `"not-applicable"` para proposta ainda sem reteste aplicável, ou `"performed"` acompanhado de `retest.result`. Não marque correção apenas porque a rodada acabou.
4. Registre cada anexo original com o comando abaixo. Ele copia sem transformação, calcula SHA-256, atualiza o manifesto e recusa sobrescrever um original com bytes diferentes. Copie `path`, `originalName` e `sha256` retornados para o catálogo.

```sh
node scripts/register-original.mjs "caminho/do/arquivo.pdf" /originals/reports/nome-estavel.pdf
node scripts/register-original.mjs "caminho/da/captura.png" /originals/evidence/ID-DA-RODADA/captura.png
```

5. Em `files`, um original usa `origin: "original"`, `kind: "pdf"` ou `"xlsx"`, `label` e os campos de integridade. Um documento gerado usa `origin: "generated"`, `kind: "pdf"`, `label` e `path: "/reports/ID-DA-RODADA.pdf"`. Se houver original, a ficha gerada deve ser rotulada como complementar. Nunca atribua `origin: "generated"` a um original.
6. Em `evidence`, crie IDs globalmente únicos com `reportId`, `findingIds`, `description`, `kind: "image"` ou `"video"` e os campos retornados pelo registro. Vincule-os ao `evidenceIds` dos achados. Para descrição sem arquivo, use `kind: "description"`, `path: null`. Vídeos são exibidos com controles e download; o PDF os referencia por nome e ID. Capturas são incluídas no PDF. Quadros extraídos, quando houver, precisam ser identificados como tal; a rodada de 06/10 não usa quadros extraídos.
7. Para comparação, acrescente `comparisons: [{ "reportId": "outra-rodada", "findingId": "ID", "label": "Ver reteste" }]`. Os vínculos são validados sem condições especiais para nomes de rodadas.
8. Execute os comandos de verificação acima. Abra a rota direta, filtros, ampliação, vídeo e documentos na prévia; confira telas pequenas e impressão. Commit/push para `main` dispara o workflow existente.

Os PDFs gerados automaticamente incluem observação, melhoria esperada, verificação, criticidade cadastrada, situação, execução/resultado do reteste e referências/capturas. A geração só escreve em `/reports/`, recusa caminhos fora dessa pasta e nunca altera `/originals/`.

## Publicação e verificação

Rodada de 08/10/2026: https://relalia.github.io/relatorios/alia-2026-10-08/. Cinco achados: **GIRO-UX-01** (cards, resumo completo e ação do VadeChat), **GIRO-FEAT-02** (histórico por período, balanço e plano de ação por serventia), **VC-ABST-13** (referências equivocadas, recuperação, citações e abstenção), **VC-TRACE-14** (modelo/modo por resposta e regeneração) e **VC-UX-15** (copiar, editar e reenviar a mensagem). A rodada usa o módulo Alia por abranger GIRO e VadeChat. São seis capturas originais: `GIRO-EV-01`, `GIRO-EV-02` e `VC-EV-13A` a `VC-EV-13D`, com ampliação, download e SHA-256. As imagens `concreta.jpeg` e `abstencao.jpeg` foram restauradas pelo usuário e incorporadas sem alterações. O par da Lei nº 6.015 mostra 1976 com abstenção e 1973 com trecho de resposta substantiva; outras capturas tratam do Provimento CNJ nº 181/2025. O relatório distingue capturas, relatos, hipóteses e propostas, sem afirmar equivalência de condições, modo histórico ou correção jurídica. O erro de cadastro do benchmark será corrigido internamente; as rodadas históricas não foram reescritas. O PDF inclui as seis imagens e os critérios de verificação. Nenhuma funcionalidade proposta foi implementada na Alia pelo Relalia.

Rodada de 07/10/2026: https://relalia.github.io/relatorios/alia-2026-10-07/. Relatório final com **BC-DOC-01** (visualização) e **BC-DOC-02** (download do original), ambos com erro `NoSuchKey`, **BC-UX-03** (sobreposição de Fechar e Editar), **ALIA-NAV-04** (breadcrumb e retorno contextual) e **ALIA-BENCH-05** (proposta de benchmark rastreável de Q&A em Ágil e Pleno, com indicadores e comparação entre versões). A rodada usa o módulo **Alia** por abranger Base de Conhecimento, navegação e benchmark. **BC-EV-01**, **BC-EV-02**, **BC-EV-03** e **ALIA-EV-04** preservam as quatro capturas originais; a proposta de benchmark não tem evidência de implementação anexada. O PDF é gerado automaticamente. Encerrar o registro não implica corrigir problemas ou executar o benchmark: os quatro problemas aguardam reteste, e o quinto item é uma proposta de melhoria. Resultados, tempo, consumo e gráficos de benchmark só devem ser apresentados como reais quando houver execuções verificáveis. A mesma estrutura permite acrescentar novas rodadas e resultados com vínculos de comparação, preservando IDs e URLs existentes.

`next.config.ts` usa `output: 'export'`, `trailingSlash: true` e imagens sem otimização de servidor. Os caminhos começam em `/`, pois o repositório de organização publica na raiz do domínio. O Pages deve usar **GitHub Actions** como origem. O job de build tem `contents: read`; apenas o job de deploy recebe `pages: write` e `id-token: write`.

As verificações aceitam rodadas adicionais, rejeitam IDs duplicados dentro de seu escopo, exigem campos/rotas/anexos válidos e conferem vínculos, conteúdo dos PDFs e integridade dos originais. Os testes específicos das rodadas históricas protegem os dados existentes, sem impor uma quantidade máxima de relatórios.

Rodada de 06/10: https://relalia.github.io/relatorios/vadechat-2026-10-06/. As oito propostas/observações se referem à **plataforma Alia/VadeChat**. O Relalia documenta o trabalho para a equipe da ferramenta; não implementa voz, feedback ou integração com provedores. Os critérios móveis de VC-RESP-12 são retestes futuros da Alia, sem resultados inventados.
