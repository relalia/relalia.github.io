# Histórico público de validação · Tri7 Alia

Aplicação Next.js com TypeScript e App Router. A exportação estática reúne quatro rodadas do VadeChat e Atlas. Cada relatório tem uma rota própria, PDF público, achados pesquisáveis e vínculos com as evidências. Não há API Routes, Server Actions nem autenticação.

## Executar localmente

Requer Node.js 22 e pnpm 11.19.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000`. Para conferir a versão que será publicada:

```bash
pnpm typecheck
pnpm build
pnpm verify
pnpm start:export
```

Abra `http://localhost:4173/` para prévia da exportação.

## Estrutura

- `app/`: rotas estáticas, layout e estilos; `generateStaticParams` produz as páginas.
- `components/`: linha do tempo, ficha, achado, filtros, galeria e downloads.
- `lib/types.ts`: esquema de relatório, achado, evidência, estado do reteste e anexo.
- `content/reports.json`: único índice público das rodadas, sem dados privados.
- `public/reports/`: PDFs públicos criados do conteúdo revisado.
- `public/evidence/`: única captura do VadeChat regravada sem metadados.
- `scripts/generate-public-pdfs.py`: gera PDFs do JSON público; requer `reportlab`.
- `scripts/verify-public.mjs`: verifica rotas, anexos, vínculos e ausência de formatos privados na exportação.
- `.github/workflows/pages.yml`: build e deploy somente de `out/` no GitHub Pages.

## Acrescentar uma rodada

1. Revise o material localmente e escreva um resumo público sem nomes, documentos, protocolos, matrículas ou detalhes que identifiquem imóveis. Nunca copie um anexo original para `public/`.
2. Acrescente um objeto `Report` em `content/reports.json` com `id` único, data ISO, módulo, resumo, achados, estado do reteste e ao menos um PDF em `files`.
3. Para cada evidência, acrescente um objeto em `evidence` e vincule seu ID em `finding.evidenceIds`. Use `image: null` e `publication: "omitted"` quando a captura não puder ser publicada. Se houver imagem pública, regrave os pixels sem metadados e confirme que nenhuma informação sensível continua legível.
4. Gere o PDF público com `python scripts/generate-public-pdfs.py`, execute `pnpm check` e revise manualmente o conteúdo extraível do PDF e as imagens antes de enviar ao GitHub.

As rotas são geradas automaticamente a partir do array `reports`; nenhuma página ou componente precisa ser copiado. O site está configurado para a raiz de `https://relalia.github.io/`, no repositório `relalia/relalia.github.io`. O Pages usa **GitHub Actions** como fonte. O workflow requer apenas leitura do código no build e `pages: write`/`id-token: write` no job de publicação.

## Revisão de privacidade

Os diretórios originais `assets/`, `relatorios/`, `data.js` e `index.html` são privados e ignorados pelo Git. Os 43 prints do Atlas e a planilha original não são publicados. O EV-27 já não tinha imagem na planilha. Os 44 IDs EV do Atlas e suas relações com os achados continuam no índice público, com aviso de imagem omitida. Os quatro PDFs públicos foram gerados do JSON revisado, não editados visualmente sobre os PDFs originais. A única captura publicada é do VadeChat e foi regravada sem metadados; seu conteúdo foi inspecionado visualmente.
