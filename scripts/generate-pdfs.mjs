import { spawnSync } from 'node:child_process';
import { verifyOriginals } from './validate-data.mjs';
verifyOriginals('public');
const result = spawnSync(process.env.RELALIA_PYTHON || 'python', ['scripts/generate-public-pdfs.py'], { stdio:'inherit' });
if (result.error) throw new Error('Python não encontrado. Instale requirements-pdf.txt ou configure RELALIA_PYTHON.', {cause:result.error});
process.exit(result.status ?? 1);
