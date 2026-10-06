"""Check extractable generated PDF content and protect original paths."""
from pathlib import Path
import json
from pypdf import PdfReader
from importlib.util import spec_from_file_location, module_from_spec
root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('pdf_generator',root/'scripts/generate-public-pdfs.py')
generator=module_from_spec(spec)
spec.loader.exec_module(generator)
for bad in [dict(origin='original',path='/originals/reports/original.pdf'),dict(origin='generated',path='/reports/../originals/original.pdf')]:
    try:
        generator.generated_target(bad)
    except ValueError:
        pass
    else:
        raise AssertionError('Generator could overwrite original')
data=json.loads((root/'content/reports.json').read_text(encoding='utf-8'))
normalize=lambda s:' '.join(s.split())
for report in data['reports']:
    for file in report['files']:
        if file['origin']!='generated':continue
        reader=PdfReader(root/'public'/file['path'].lstrip('/'))
        import re
        text=normalize(' '.join(re.sub(r'Relalia: O Relatório da Alia\s+Página \d+','',p.extract_text() or '') for p in reader.pages))
        for finding in report['findings']:
            for key in ['id','description','expected','verification','severity','hypothesis']:
                if finding.get(key):
                    assert normalize(finding[key]) in text,f"Missing PDF {report['id']}/{finding['id']}.{key}"
            if finding['retest'].get('result'):
                assert normalize(finding['retest']['result']) in text
            for evidence_id in finding['evidenceIds']:
                assert evidence_id in text
        if report['id']=='vadechat-2026-10-06':
            assert sum(len(p.images) for p in reader.pages)>=7,'Missing new screenshots in PDF'
            assert 'WhatsApp Video 2026-10-06 at 09.56.57.mp4' in text,'Missing video reference'
        print(f"{report['id']}: {len(reader.pages)} pages, extractable fields verified")
