"""Check extractable generated PDF content and protect original paths."""
from pathlib import Path
from decimal import Decimal
import json
import re
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
evidence = {item['id']: item for item in data['evidence']}

def verify_latency_source(report):
    original = next(file for file in report['files'] if file['origin'] == 'original')
    source = '\n'.join(page.extract_text() for page in PdfReader(root/'public'/original['path'].lstrip('/')).pages)
    aggregates = re.findall(r'(?:VadeChat Ágil|openai/gpt-5\.6-sol)\s+(\d+,\d{3}) s (\d+,\d{3}) s (\d+/\d+)', normalize(source))
    assert len(aggregates) == 2, 'Missing participant totals, means or coverage in latency source'
    (agil_total, agil_mean, agil_coverage), (sol_total, sol_mean, sol_coverage) = aggregates
    assert agil_coverage == sol_coverage == '5/5' and '10/10 tentativas encerradas' in source
    assert all(f'{value} s' in report['summary'] for value in (agil_mean, sol_mean))
    highlights = ' '.join(report['highlights'])
    assert all(f'{value} s' in highlights for value in (agil_total, sol_total))
    seconds = lambda value: Decimal(value.replace(',', '.'))
    delta = str(seconds(agil_mean) - seconds(sol_mean)).replace('.', ',')
    ratio = f'{seconds(agil_mean) / seconds(sol_mean):.2f}'.replace('.', ',')
    assert f'{delta} s' in highlights and f'{ratio} vezes' in report['summary']

    blocks = re.split(r'\n(\d+) · ID [^\n]+\n', source)
    rows = []
    for number, block in zip(blocks[1::2], blocks[2::2]):
        pair = re.findall(r'^(\d+,\d{3}) s\nCompleta$', block, re.M)
        assert len(pair) == 2 and seconds(pair[0]) > seconds(pair[1]), f'Unexpected latency source result for question {number}'
        rows.append((number, ' × '.join(f'{value} s' for value in pair)))
    timing_fields = next(f for f in report['findings'] if f['id'] == 'VC-LAT-01')['sourceFields'][1:]
    assert len(rows) == 5 and rows == [(field['label'].split(' · ')[0], field['value']) for field in timing_fields], 'Catalog timings differ from the source PDF'

for report in data['reports']:
    for file in report['files']:
        if file['origin']!='generated':continue
        reader=PdfReader(root/'public'/file['path'].lstrip('/'))
        text=normalize(' '.join(re.sub(r'Relalia: O Relatório da Alia\s+Página \d+','',p.extract_text() or '') for p in reader.pages))
        if report.get('overviewId'):
            overview=json.loads((root/f"content/{report['overviewId']}.json").read_text(encoding='utf8'))
            assert normalize(overview['title'].replace('—','-')) in text
            assert len(reader.pages)<=5,'Visual synthesis should fit five readable pages'
            assert sum(len(p.images) for p in reader.pages)==6,'Expected six original screenshots'
            for b in overview['benchmarks']:
                assert b['label'] in text and normalize(b['concentration'].replace('−','-')) in text
                for s in b['series']:
                    assert s['label'] in text
                    for score in s['values']:assert f'{score:.1f}'.replace('.',',') in text
                for r in b['rows']:
                    for run in ['old','new']:assert f"{r[run]['vc']['total']:.1f}".replace('.',',') in text
            for item in overview['improvements']:
                assert item['id'] in text and normalize(item['description']) in text
            for image in overview['images']:assert image['id'] in text and image['sha256'][:16] in text
            assert overview['id']+'-dados.json' in text and overview['id']+'-fontes.json' in text
            print(f"{report['id']}: {len(reader.pages)} pages, six screenshots, eight series and UI captions verified")
            continue
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
        if not report.get('executive') and not report.get('benchmarkId'):
            expected = [report['summary'], *report['highlights']]
            if report.get('note'):
                expected.append(report['note'])
            for finding in report['findings']:
                expected.extend(f"{field['label']}: {field['value']}" for field in finding.get('sourceFields', []))
                expected.extend(evidence[evidence_id]['description'] for evidence_id in finding['evidenceIds'])
            for paragraph in expected:
                assert normalize(paragraph) in text, f"Stale or incomplete PDF {report['id']}: {paragraph}"
        if report['id'] == 'vadechat-latencia-2026-11-10':
            verify_latency_source(report)
        for finding in report['findings']:
            for key in ['id','description','expected','verification','severity','hypothesis']:
                if finding.get(key):
                    assert normalize(finding[key]) in text,f"Missing PDF {report['id']}/{finding['id']}.{key}"
            if finding['retest'].get('result'):
                assert normalize(finding['retest']['result']) in text
            for evidence_id in finding['evidenceIds']:
                assert evidence_id in text
        if report.get('executive'):
            source_spec=spec_from_file_location('executive_source',root/'scripts/verify-executive-source.py')
            source_module=module_from_spec(source_spec)
            source_spec.loader.exec_module(source_module)
            source_module.verify(report)
            executive=report['executive']
            assert len(reader.pages)<=4,'Executive results and UX should fit four pages'
            assert normalize(executive['caveat']) in text
            if executive.get('completionNote'):
                assert normalize(executive['completionNote']) in text
                assert normalize(executive['sourceStatusNote']) in text
                assert normalize(report['status']) in text
                assert not executive.get('pendingNotice')
                assert len(reader.pages)<=2
            if executive.get('pendingNotice'):
                assert normalize(executive['pendingNotice']) in text
                assert len(reader.pages)<=2,'Results-only executive should fit two pages'
                for mode in executive['modes']:
                    assert f"contestações {mode['contests']}; decisões pendentes {mode['pendingDecisions']}" in text
            assert executive['source']['path'] in text
            assert normalize(report['summary']) in text
            for mode in executive['modes']:
                vc,opponent=(f'{mode[key]:.2f}'.replace('.',',') for key in ('vcMean','opponentMean'))
                assert f"{mode['label']} {vc} {opponent} {mode['wins']} / {mode['ties']} / {mode['losses']} {mode['n']}/{mode['coverageTotal']}" in text
                review_prefix=f"{mode['label']} · registro do PDF: Revisões"
                if review_prefix in text:
                    assert f"{review_prefix} {mode['reviewsCompleted']}/{mode['reviewsTotal']} ({mode['pendingReviews']} pendentes); contestações {mode['contests']}; decisões pendentes {mode['pendingDecisions']}" in text
                else:
                    assert mode['pendingReviews']==mode['contests']==mode['pendingDecisions']==0
                    assert f"Revisões: {mode['reviewsCompleted']}/{mode['reviewsTotal']} por modo; nenhuma pendente." in text
                    assert 'Contestações, decisões pendentes e julgamentos pendentes, inconclusivos ou desatualizados: 0.' in text
                for criterion in mode['criteria']:
                    assert f"{criterion['vc']:.1f} / {criterion['opponent']:.1f}".replace('.',',') in text
            for row in executive['operations']['rows']:
                tokens=f"{row['tokensTotal']:,}".replace(',','.')
                cost=f"{row['providerCostUsd']:.6f}".replace('.',',')
                seconds=f"{row['seconds']:.1f}".replace('.',',')
                assert f"{row['role']} {row['attempts']} / {row['failedOrUncertain']} {tokens} {cost} {seconds} s" in text
            for insight in executive['insights']:
                assert normalize(insight['text']) in text
            for role in executive['roles']:
                if role['model']:assert role['model'] in text
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
