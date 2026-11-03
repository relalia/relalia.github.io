"""Verify catalog aggregates against the supplied PDF, not individual judgments."""
from pathlib import Path
import hashlib
import json
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
compact = lambda text: ' '.join(text.split())
num = lambda text: float(text.replace('.', '').replace(',', '.'))
fmt = lambda value, digits=1: f'{value:.{digits}f}'.replace('.', ',')

def verify(report):
    data = report['executive']
    path = ROOT/'public'/data['source']['path'].lstrip('/')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == data['source']['sha256']
    original = next(file for file in report['files'] if file['path'] == data['source']['path'])
    assert original['origin'] == 'original' and original['sha256'] == data['source']['sha256']
    pages = [compact(p.extract_text()) for p in PdfReader(path).pages]
    assert len(pages) == data['source']['pages']
    conclusions = pages[data['source'].get('conclusionsPage',3)-1]
    for role in data['roles']:
        if role['model']:
            assert f"{role['role']} {role['platform']} {role['model']}" in pages[0]
        else:
            assert role['platform'] == 'VadeChat'
            assert 'Ágil VadeChat Pleno VadeChat Resultados' in pages[0]
    for mode in data['modes']:
        match = re.search(rf"{mode['label']}: média ([\d,]+) contra ([\d,]+) em (\d+) embates; (\d+) vitórias, (\d+) empates? e (\d+) derrotas?", conclusions)
        assert match, mode['label']
        values = match.groups()
        assert (num(values[0]), num(values[1])) == (mode['vcMean'], mode['opponentMean'])
        assert tuple(map(int,values[2:])) == (mode['n'],mode['wins'],mode['ties'],mode['losses'])
        assert mode['wins']+mode['ties']+mode['losses'] == mode['n'] == data['questions']
        assert f"{mode['label']} {fmt(mode['vcMean'])} / {fmt(mode['opponentMean'])} {mode['wins']} / {mode['ties']} / {mode['losses']} {mode['n']}/{mode['coverageTotal']} (100%) {mode['pendingJudgments']} / {mode['inconclusive']} / {mode['outdated']}" in pages[0]
        for criterion in mode['criteria']:
            expected = f"{mode['label']} · {criterion['code']} /{criterion['max']} n = {criterion['n']} VadeChat {fmt(criterion['vc'])} / {criterion['max']} Adversário {fmt(criterion['opponent'])} / {criterion['max']}"
            assert expected in pages[1], expected
            assert 0 <= criterion['vc'] <= criterion['max'] and 0 <= criterion['opponent'] <= criterion['max']
        quality = f"{mode['label']} {mode['contradictionsVc']} / {mode['contradictionsOpponent']} {mode['abstentionsVc']} / {mode['abstentionsOpponent']} {mode['reviewsCompleted']}/{mode['reviewsTotal']}; {mode['pendingReviews']} pendentes {mode['contests']} / {mode['pendingDecisions']}"
        assert quality in pages[1], quality
    for row in data['operations']['rows']:
        part = conclusions.split(row['role']+' ')[1].split('Subtotais')[0]
        assert f"{row['attempts']} tentativas; {row['failedOrUncertain']} falhas/incertas" in part
        token = lambda value: f'{value:,}'.replace(',','.')
        assert f"{token(row['tokensIn'])} / {token(row['tokensOut'])} / {token(row['tokensTotal'])}" in part
        assert row['tokensIn']+row['tokensOut'] == row['tokensTotal']
        assert f"US$ {fmt(row['providerCostUsd'],6)}" in part and f"{fmt(row['seconds'])} s" in part
    for row in data['operations']['generation']:
        assert f"{row['mode']}: {row['attempts']} tentativas; tokens entrada/saída desconhecido/desconhecido; duração desconhecida; custo desconhecido" in conclusions
        assert all(row[field] is None for field in ['tokensIn','tokensOut','costUsd','seconds'])
    budget=data['operations']['budget']
    assert f"Orçamento local OpenRouter: US$ {fmt(budget['limitUsd'],6)} · consumo/reservas: US$ {fmt(budget['consumedReservedUsd'],6)} · saldo após reservas: US$ {fmt(budget['remainingUsd'],6)}" in conclusions
    assert abs(budget['limitUsd']-budget['consumedReservedUsd']-budget['remainingUsd']) < 1e-10
    for key in ['series','runId','executionId']:
        assert data['source'][key] in ' '.join(pages)
    assert str(data['source']['revision']) in conclusions and data['runDate'] in pages[0]
    if data.get('pendingNotice'):
        assert 'Rodada parcial' in pages[0]
        decisions=sum(m['pendingDecisions'] for m in data['modes'])
        assert f'{decisions} revisões ou decisões pendentes' in conclusions
    print(f"{report['id']}: source PDF hash, roles, means, denominators, outcomes, criteria, quality and operations verified")

if __name__ == '__main__':
    catalog=json.loads((ROOT/'content/reports.json').read_text(encoding='utf8'))
    for report in catalog['reports']:
        if report.get('executive'): verify(report)
