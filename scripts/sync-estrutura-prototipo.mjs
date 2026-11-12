// Keep embedded copies in sync without risking a truncated report on write failure.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';

const reportPath = 'public/reports/estrutura-vadechat-2026-11-12.html';
const report = fs.readFileSync(reportPath, 'utf8');
let updated = report;
for (const [id, prototypePath] of [
  ['prototype-data', 'public/reports/prototipo-vadechat-estrutura-2026-11-12.html'],
  ['giro-data', 'public/reports/prototipo-giro-estrutura-2026-11-12.html'],
]) {
  const marker = new RegExp(`(<script type="application/octet-stream" id="${id}">)([A-Za-z0-9+/=]+)(</script>)`, 'g');
  if ([...updated.matchAll(marker)].length !== 1) throw new Error(`Expected exactly one embedded prototype: ${id}`);
  const bytes = fs.readFileSync(prototypePath);
  if (!bytes.length) throw new Error(`Prototype is empty: ${prototypePath}`);
  const prototype = bytes.toString('base64');
  updated = updated.replace(marker, (_, open, _previous, close) => open + prototype + close);
}
if (updated !== report) {
  const temporary = `${reportPath}.${randomUUID()}.tmp`;
  const mode = fs.statSync(reportPath).mode & 0o777;
  let created = false;
  try {
    const fd = fs.openSync(temporary, 'wx', mode);
    created = true;
    try {
      if (process.platform !== 'win32') fs.fchmodSync(fd, mode);
      fs.writeFileSync(fd, updated, 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temporary, reportPath);
  } finally {
    if (created) fs.rmSync(temporary, {force:true});
  }
}
console.log(updated === report ? 'Embedded prototypes are current.' : 'Embedded prototypes updated.');
