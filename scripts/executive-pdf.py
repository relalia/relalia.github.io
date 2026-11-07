"""Results-first PDF section, using the same catalog aggregates as the page."""
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle, PageBreak, Spacer, KeepTogether
from reportlab.graphics.shapes import Drawing, Rect, String

GREEN = colors.HexColor('#17645b')
BLUE = colors.HexColor('#275f9d')

def executive_story(data, p):
    number = lambda value, digits=2: f'{value:.{digits}f}'.replace('.', ',')
    def table(rows, widths):
        t = Table([[p(cell, style='Caption') for cell in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#edf5f0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LINEBELOW', (0,0), (-1,-1), .4, colors.HexColor('#dce8e0')),
        ]))
        return t
    def criterion_cell(mode, index):
        criterion = mode['criteria'][index]
        values = f"{number(criterion['vc'],1)} / {number(criterion['opponent'],1)}"
        return values if criterion['n'] == mode['n'] else f"{values} · n = {criterion['n']}"
    story = ([p(data['pendingNotice'])] if data.get('pendingNotice') else []) + [p(f"Resultados do benchmark · fonte de {data['runDate'][8:10]}/{data['runDate'][5:7]}/{data['runDate'][:4]}", style='FindingTitle'),
             p(data['title']), p(f"{data['questions']} perguntas · {sum(m['n'] for m in data['modes'])} embates comparáveis · escala 0-10. Médias e resultados originais do juiz.", style='Caption')]
    if data.get('completionNote'):
        story.insert(0, p(data['completionNote'], style='Caption'))
    chart = Drawing(500, 151)
    for i, mode in enumerate(data['modes']):
        x = i*254
        chart.add(String(x, 136, f"VadeChat {mode['label']}  {number(mode['vcMean'])}", fontName='Helvetica-Bold', fontSize=12, fillColor=GREEN))
        for j, (label, value, color) in enumerate([(f"VadeChat {mode['label']}", mode['vcMean'], GREEN), (data['opponent'], mode['opponentMean'], BLUE)]):
            y = 109-j*38
            chart.add(String(x, y, f'{label} · {number(value)} / 10', fontName='Helvetica', fontSize=9, fillColor=color))
            chart.add(Rect(x, y-17, 225, 9, fillColor=colors.HexColor('#e4ece8'), strokeColor=None))
            chart.add(Rect(x, y-17, 225*value/data['scaleMax'], 9, fillColor=color, strokeColor=None))
        difference = round(mode['vcMean'] - mode['opponentMean'], 2)
        signed_difference = ('+' if difference > 0 else '') + number(difference)
        chart.add(String(x, 18, f"Diferença: {signed_difference} pontos · n = {mode['n']}", fontName='Helvetica', fontSize=9, fillColor=GREEN))
    story += [chart, table([['Modo', 'VadeChat', data['opponent'], 'V / E / D', 'Comparáveis']]+[
        [m['label'], number(m['vcMean']), number(m['opponentMean']), f"{m['wins']} / {m['ties']} / {m['losses']}", f"{m['n']}/{m['coverageTotal']}"] for m in data['modes']], [65,80,135,95,128]),
        Spacer(1,10), p(data['precisionNote'], style='Caption'), p(data['caveat']),
        p('Onde os pontos foram obtidos', style='FindingTitle'),
        table([['Critério', 'Máximo', 'Ágil · VC / adversário', 'Pleno · VC / adversário']]+[
            [f"{c['code']} · {c['label']}",str(c['max'])]+[criterion_cell(m,i) for m in data['modes']]
            for i,c in enumerate(data['modes'][0]['criteria'])], [200,50,126,127]),
        p('Base por modo e critério: '+ '; '.join(f"{m['label']} n = {m['n']}" for m in data['modes'])+'. Médias arredondadas por critério não devem ser somadas para reconstruir os totais.', style='Caption'),
        PageBreak(), p('Prioridades para a equipe de IA', style='FindingTitle'), p('Síntese editorial dos agregados; não constitui novo julgamento.', style='Caption')]
    for insight in data['insights']:
        story.append(p(insight['text'], insight['title']))
    story += [p('Papéis e limites', style='FindingTitle')]
    for role in data['roles']:
        story.append(p(f"{role['platform']} · {role['model'] or 'modelo interno não informado'}. {role.get('note','')}", role['role'], style='Caption'))
    for mode in data['modes']:
        story.append(p(f"Revisões {mode['reviewsCompleted']}/{mode['reviewsTotal']} ({mode['pendingReviews']} pendentes); contestações {mode['contests']}; decisões pendentes {mode['pendingDecisions']}. Contradições essenciais VC/adversário: {mode['contradictionsVc']}/{mode['contradictionsOpponent']}; abstenções: {mode['abstentionsVc']}/{mode['abstentionsOpponent']}. Julgamentos pendentes/inconclusivos/desatualizados: {mode['pendingJudgments']}/{mode['inconclusive']}/{mode['outdated']}.", mode['label']+' · registro do PDF', style='Caption'))
    story += [p('Revisões não substituem as notas originais. Vencer em pontos não equivale à classificação Conforme. Ausência de sinalização não comprova ausência de erros.', style='Caption'),
        p('Operação e consumo', style='FindingTitle'),
        table([['Papel', 'Tentativas / falhas ou incertas', 'Tokens totais', 'US$ provedor', 'Durações somadas']]+[
            [r['role'],f"{r['attempts']} / {r['failedOrUncertain']}",f"{r['tokensTotal']:,}".replace(',','.'),number(r['providerCostUsd'],6),number(r['seconds'],1)+' s'] for r in data['operations']['rows']], [80,125,90,105,103]),
        p('Geração Tri7: '+ '; '.join(f"{r['mode']} {r['attempts']} tentativas" for r in data['operations']['generation'])+'. Tokens, custo e duração não informados. Tentativas não representam perguntas avaliadas.',style='Caption'),
        p(data['operations']['note'],style='Caption'),
        p('Fonte preservada: https://relalia.github.io'+data['source']['path'],style='Caption'),
        p(data.get('sourceStatusNote') or 'A fonte executiva não inclui textos das perguntas, referências, pareceres individuais, comentários dos revisores ou histórico das tentativas. Esses registros são necessários para explicar causas e propor correções específicas. Declarações de envio não são prova independente de execução; a revisão também não é validação jurídica independente.',style='Caption')]
    return story
