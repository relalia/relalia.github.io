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
        if report.get('comparisonId'):
            c=json.loads((root/f"content/{report['comparisonId']}.json").read_text(encoding='utf8'))
            assert normalize(c['title'].replace('—','-')) in text
            for row in c['rows']:
                assert normalize(row['question']+' · '+('Ágil' if row['mode']=='agil' else 'Pleno')) in text
                assert normalize(row['review'].replace('→',' > ').replace('—','-').replace('–','-').replace('‑','-')) in text
            for highlight in c['highlights']:
                assert normalize(highlight.replace('→',' > ').replace('—','-').replace('–','-')) in text
            if c.get('alternativeLabel'):
                assert c['alternativeLabel'] in text and 'ChatGPT Grátis' in text
                assert 'modelo não identificado' in text
                assert len(reader.pages)<=3,'Succinct comparison exceeded three pages'
                assert normalize(c['editorial']['outcomeNote'].replace('→',' > ')) in text
            else:
                assert 'inconclusividade global em Q05' in text
            assert 'campos estruturados vazios' in text
            assert 'https://relalia.github.io/relatorios/'+c['id']+'/' in text
            assert c['related'][0]['id'] in text
            assert 'NÃO PUBLICADO' not in text and 'Revisão local' not in text
            print(f"{report['id']}: {len(reader.pages)} pages, all ten review summaries, highlights and evidence URLs verified")
            continue
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
        if report.get('benchmarkId'):
            b=json.loads((root/f"content/{report['benchmarkId']}.json").read_text(encoding='utf8'))
            docs=[b['protocol'],b['alternation']]
            for q in b['questions']:
                docs += [q['question'],q['human'],q['alternative'] if 'alternative' in q else q['chatgpt']]
                for mode in ['agil','pleno']:
                    docs += [q['comparisons'][mode][field] for field in ['response','document','review']]
            compact=lambda s:re.sub(r'\s|\ufe0f','',s)
            for source in docs:
                assert compact(source['text']) in compact(text),f"Missing integral benchmark source: {source['path']}"
                assert source['sha256'] in text,f"Missing benchmark hash {source['path']}"
            if 'alternativeLabel' in b:
                assert 'Claude gratuito' in text and 'ChatGPT Grátis' in text and 'GPT-6.1 Alta' in text
                assert 'Sonnet 5.5 Médio' in text and 'modelo não identificado' in text
                assert 'Índice das 47 evidências' in text
                for q in b['questions']:
                    for mode in ['agil','pleno']:
                        for field in ['reviewSummary','reviewImpact','reviewAction']:
                            assert normalize(q['comparisons'][mode][field]) in text
            else:
                assert 'ChatGPT gratuito' in text and 'modelo não identificado' in text
            print(f"Benchmark: {len(docs)} integral source texts and hashes verified")
        print(f"{report['id']}: {len(reader.pages)} pages, extractable fields verified")
