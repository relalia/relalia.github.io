"""Verify catalog aggregates against the supplied PDF, not individual judgments."""
from pathlib import Path
import hashlib
import json
import re
from pypdf import PdfReader
from executive_values import fmt

ROOT = Path(__file__).resolve().parents[1]
compact = lambda text: ' '.join(text.split())
num = lambda text: float(text.replace('.', '').replace(',', '.'))
UNAVAILABLE = r'(?i:[–—-]|n/d|não informad[oa]|sem dados|sem média|desconhecid[oa])'


def source_value(value, digits=None):
    if value is None:
        return UNAVAILABLE
    return re.escape(str(value) if digits is None else fmt(value, digits))


def verify_score_row(mode, overview, conclusions):
    counts = tuple(mode.get(key) for key in ('wins', 'ties', 'losses'))
    means = (mode['vcMean'], mode['opponentMean'])
    if all(value is not None for value in (*means, *counts)):
        match = re.search(rf"{re.escape(mode['label'])}: média ([\d,]+) contra ([\d,]+) em (\d+) embates; (\d+) vitórias?, (\d+) empates? e (\d+) derrotas?", conclusions)
        assert match, mode['label']
        values = match.groups()
        assert tuple(map(num, values[:2])) == means
        assert tuple(map(int, values[2:])) == (mode['n'], *counts)
        assert sum(counts) == mode['n']

    record = ' / '.join(source_value(count) for count in counts)
    if all(count is None for count in counts):
        record = rf'(?:{record}|{UNAVAILABLE})'
    planned = mode['coverageTotal']
    coverage = re.escape(f"{mode['n']}/{planned}")
    if planned:
        coverage += re.escape(f" ({mode['n']/planned:.0%})")
    else:
        coverage += r'(?: \(0%\))?'
    judgments = f"{mode['pendingJudgments']} / {mode['inconclusive']} / {mode['outdated']}"
    row = (rf"\b{re.escape(mode['label'])} {source_value(means[0], 1)} / {source_value(means[1], 1)} "
           rf"{record} {coverage} {re.escape(judgments)}\b")
    assert re.search(row, overview), f"Score row differs from the source for {mode['label']}"

def verify(report):
    data = report['executive']
    path = ROOT/'public'/data['source']['path'].lstrip('/')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == data['source']['sha256']
    original = next(file for file in report['files'] if file['path'] == data['source']['path'])
    assert original['origin'] == 'original' and original['sha256'] == data['source']['sha256']
    pages = [compact(p.extract_text()) for p in PdfReader(path).pages]
    assert len(pages) == data['source']['pages']
    conclusions = pages[data['source'].get('conclusionsPage',3)-1]
    quality_page = pages[data['source'].get('qualityPage',2)-1]
    final_scores = 'Notas finais por modo' in pages[0]
    assert data.get('scoreBasis') == ('final' if final_scores else None), 'Score basis differs from the source'
    if final_scores:
        assert data['title'] in pages[0]
        status = re.search(rf"\bRodada (final|parcial) · {data['questions']} perguntas ·", pages[0])
        assert status, 'Status or question count missing from the source'
        if report['status'] == 'Execução finalizada':
            assert data.get('completionNote') and data.get('sourceStatusNote'), 'Document the confirmed completion and the source status'
        else:
            assert f'Rodada {status[1]}' == report['status'], 'Status differs from the source'
        roles = data['roles']
        assert len(roles) == 4, 'Expected the product, opponent, judge and reviewer roles'
        assert {role['role'] for role in roles if role['model']} == {'Adversário', 'Juiz', 'Revisor'}, 'Incomplete benchmark roles'
        for criterion in data['modes'][0]['criteria']:
            label = f"{criterion['code']}: {criterion['label']} /{criterion['max']}"
            assert label.casefold() in quality_page.casefold(), label
    for role in data['roles']:
        if role['model']:
            assert f"{role['role']} {role['platform']} {role['model']}" in pages[0]
        else:
            assert role['platform'] == 'VadeChat'
            heading = 'Notas finais por modo' if final_scores else 'Resultados'
            assert f'Ágil VadeChat Pleno VadeChat {heading}' in pages[0]
    for mode in data['modes']:
        assert mode['n'] <= mode['coverageTotal'] <= data['questions']
        verify_score_row(mode, pages[0], conclusions)
        if final_scores:
            corrected = corrected_label(mode['correctedBouts'])
            assert f"{mode['label']} · {mode['n']}/{mode['coverageTotal']} embates com nota final · {corrected}" in pages[0]
            assert f"{mode['label']} · {corrected} · {mode['pendingDecisions']} decisões pendentes" in quality_page
        for criterion in mode['criteria']:
            prefix = f"{mode['label']} · {criterion['code']} /{criterion['max']} n = {criterion['n']} VadeChat"
            expected = (rf"{re.escape(prefix)} {source_value(criterion['vc'], 1)} / {criterion['max']} "
                        rf"Adversário {source_value(criterion['opponent'], 1)} / {criterion['max']}\b")
            assert re.search(expected, quality_page), expected
        quality = f"{mode['label']} {mode['contradictionsVc']} / {mode['contradictionsOpponent']} {mode['abstentionsVc']} / {mode['abstentionsOpponent']} {mode['reviewsCompleted']}/{mode['reviewsTotal']}; {mode['pendingReviews']} pendentes {mode['contests']} / {mode['pendingDecisions']}"
        assert quality in quality_page, quality
    operations = conclusions.split('Subtotais',1)[0]
    parts = re.split(r'\b(Adversário|Juiz|Revisor) (?=\d+ tentativas?;)', operations)
    source_roles = parts[1::2]
    rows = data['operations']['rows']
    assert source_roles == [row['role'] for row in rows], 'Operation roles and order differ from the source'
    assert len(set(source_roles)) == len(source_roles) > 0, 'Missing or duplicate operation roles in the source'
    for row, part in zip(rows, parts[2::2], strict=True):
        counts = re.match(r'(\d+) tentativas?; (\d+) falhas/incertas ', part)
        assert counts and tuple(map(int, counts.groups())) == (row['attempts'], row['failedOrUncertain']), row['role']
        tokens = [row[field] for field in ('tokensIn','tokensOut','tokensTotal')]
        expected_tokens = ' / '.join('desconhecido' if token is None else f'{token:,}'.replace(',','.') for token in tokens)
        assert f'falhas/incertas {expected_tokens} ' in part
        if all(token is not None for token in tokens):
            assert tokens[0]+tokens[1] == tokens[2]
        cost = 'desconhecido' if row['providerCostUsd'] is None else f"US$ {fmt(row['providerCostUsd'],6)}"
        assert re.search(rf'dados incompletos {re.escape(cost)} \d+ custos? desconhecidos?', part)
        duration = re.search(r'(desconhecida|[\d.,]+ s) \d+ sem duração$', part.strip())
        assert duration
        assert (None if duration[1] == 'desconhecida' else num(duration[1][:-2])) == row['seconds']
    generation = re.findall(
        r'(Ágil|Pleno): (\d+) tentativas?; tokens entrada/saída desconhecido/desconhecido; duração desconhecida; custo desconhecido',
        conclusions.partition('Geração Tri7:')[2].partition('Conclusões deste benchmark')[0],
    )
    generation_rows = data['operations']['generation']
    assert generation == [(row['mode'], str(row['attempts'])) for row in generation_rows], 'Generation modes or attempts differ from the source'
    assert len({mode for mode, _ in generation}) == len(generation) == len(data['modes']), 'Missing or duplicate generation modes'
    for row in generation_rows:
        assert all(row[field] is None for field in ['tokensIn','tokensOut','costUsd','seconds'])
    budget=data['operations']['budget']
    assert f"Orçamento local OpenRouter: US$ {fmt(budget['limitUsd'],6)} · consumo/reservas: US$ {fmt(budget['consumedReservedUsd'],6)} · saldo após reservas: US$ {fmt(budget['remainingUsd'],6)}" in conclusions
    assert abs(budget['limitUsd']-budget['consumedReservedUsd']-budget['remainingUsd']) < 1e-10
    for key in ['series','runId']:
        assert data['source'][key] in pages[0]
    assert f"Execução {data['source']['executionId']}" in conclusions
    assert re.search(rf"\brevisão {data['source']['revision']}\b", conclusions)
    assert data['runDate'] in pages[0]
    if final_scores:
        assert 'As notas finais incluem as correções validadas.' in conclusions
    if data.get('pendingNotice'):
        assert 'Rodada parcial' in pages[0]
        decisions=sum(m['pendingDecisions'] for m in data['modes'])
        assert f'{decisions} revisões ou decisões pendentes' in conclusions
    if report['status'] == 'Rodada final':
        assert 'Rodada final' in pages[0]
        assert '0 revisões ou decisões pendentes' in conclusions
        assert all(not mode['pendingDecisions'] and not mode['pendingReviews'] for mode in data['modes'])
    print(f"{report['id']}: source PDF hash, roles, means, denominators, outcomes, criteria, quality and operations verified")

def corrected_label(count):
    return f"{count} {'embate corrigido' if count == 1 else 'embates corrigidos'}"

if __name__ == '__main__':
    catalog=json.loads((ROOT/'content/reports.json').read_text(encoding='utf8'))
    for report in catalog['reports']:
        if report.get('executive'): verify(report)
