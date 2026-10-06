# Relalia: O Relatório da Alia

Portal estático de validações do VadeChat e Atlas, publicado em **https://relalia.github.io/** pelo repositório **relalia/relalia.github.io**. Next.js, TypeScript e App Router, sem API Routes, Server Actions ou servidor de produção. Cada relatório tem HTML próprio e funciona por navegação, acesso direto e atualização do navegador.

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
- `public/reports/`: PDFs gerados, separados dos originais. As fichas das rodadas antigas são complementares; o PDF de 06/10 é o relatório completo gerado. URLs anteriores foram preservadas.
- `scripts/`: geração/verificação de PDFs, validação do catálogo, testes de vínculos e prévia estática com suporte a Range para vídeo.
- `.github/workflows/pages.yml`: instala dependências, testa, gera PDFs e exportação, verifica e publica somente `out`.

## Materiais e integridade

Por decisão expressa do responsável pelo MVP, os documentos e capturas originais são públicos, sem anonimização ou autenticação. As cópias publicadas preservam exatamente os bytes dos arquivos fornecidos. O build verifica SHA-256 antes de gerar PDFs; a verificação final repete a conferência em `out`. Os arquivos de origem locais em `relatorios/`, `assets/` e `data.js` continuam fora do Git, enquanto as cópias publicadas estão organizadas em `public/originals`.

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

`next.config.ts` usa `output: 'export'`, `trailingSlash: true` e imagens sem otimização de servidor. Os caminhos começam em `/`, pois o repositório de organização publica na raiz do domínio. O Pages deve usar **GitHub Actions** como origem. O job de build tem `contents: read`; apenas o job de deploy recebe `pages: write` e `id-token: write`.

As verificações aceitam rodadas adicionais, rejeitam IDs duplicados dentro de seu escopo, exigem campos/rotas/anexos válidos e conferem vínculos, conteúdo dos PDFs e integridade dos originais. Os testes específicos das rodadas históricas protegem os dados existentes, sem impor uma quantidade máxima de relatórios.

Rodada de 06/10: https://relalia.github.io/relatorios/vadechat-2026-10-06/. As oito propostas/observações se referem à **plataforma Alia/VadeChat**. O Relalia documenta o trabalho para a equipe da ferramenta; não implementa voz, feedback ou integração com provedores. Os critérios móveis de VC-RESP-12 são retestes futuros da Alia, sem resultados inventados.
