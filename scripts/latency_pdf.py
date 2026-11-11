from decimal import Decimal, ROUND_HALF_UP
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.platypus import Table


def seconds(milliseconds):
    return f'{milliseconds // 1000:,}'.replace(',', '.') + f',{milliseconds % 1000:03d} s'


def percentage(numerator, denominator):
    value = (100 * Decimal(numerator) / denominator).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return f'{value:f}'.rstrip('0').rstrip('.').replace('.', ',') + '%'


def multiplier(maximum, minimum):
    value = (Decimal(maximum) / minimum).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return f'{value:.2f}'.replace('.', ',') + '×'


def timing_fields(data):
    opponent = data['opponent']
    fields = {'Tempos por pergunta': f"{data['vadechat']['label']} × {opponent['label']} (OpenRouter, {opponent['model']})"}
    for index, question in enumerate(data['questions'], 1):
        fields[f"{index} · {question['label']}"] = f"{seconds(question['vadechatMs'])} × {seconds(question['opponentMs'])}"
    return fields


def latency_story(data, paragraph):
    vadechat, opponent = data['vadechat'], data['opponent']
    series = [
        (vadechat, 'vadechatMs', colors.HexColor('#17645b'), colors.HexColor('#eef6f2')),
        (opponent, 'opponentMs', colors.HexColor('#674696'), colors.HexColor('#f5f0fa')),
    ]
    cards = Drawing(490, 60)
    for index, (participant, _, ink, tint) in enumerate(series):
        x = index * 250
        cards.add(Rect(x, 1, 240, 56, fillColor=tint, strokeColor=None))
        cards.add(Rect(x, 55, 240, 2, fillColor=ink, strokeColor=None))
        cards.add(String(x + 11, 40, participant['label'], fontName='Helvetica-Bold', fontSize=10, fillColor=ink))
        cards.add(String(x + 11, 20, seconds(participant['meanMs']), fontName='Helvetica-Bold', fontSize=17, fillColor=ink))
        cards.add(String(x + 11, 7, f"{seconds(participant['totalMs'])} no total", fontName='Helvetica', fontSize=8, fillColor=ink))

    questions = data['questions']
    faster, slower = sorted(series, key=lambda participant: participant[0]['meanMs'])
    faster_participant, faster_key, ink, tint = faster
    slower_participant, slower_key, _, _ = slower
    faster_mean, slower_mean = faster_participant['meanMs'], slower_participant['meanMs']
    difference = slower_mean - faster_mean
    overview = [paragraph('Tempo médio até a resposta completa', style='FindingTitle'), cards]
    if difference > 0:
        first = sum(question[faster_key] < question[slower_key] for question in questions)
        metrics = []
        if faster_mean > 0:
            metrics.append((multiplier(slower_mean, faster_mean), 'Maior média ÷ menor média'))
        metrics.extend([
            (percentage(difference, slower_mean), f"Menos tempo que {slower_participant['label']}"),
            (percentage(first, len(questions)), f'Terminou primeiro em {first} de {len(questions)} perguntas'),
        ])
        advantage = Drawing(490, 61)
        advantage.add(Rect(0, 1, 490, 55, fillColor=tint, strokeColor=None))
        advantage.add(Rect(0, 1, 2, 55, fillColor=ink, strokeColor=None))
        advantage.add(String(11, 41, f"{faster_participant['label']} teve o menor tempo médio",
                             fontName='Helvetica-Bold', fontSize=10, fillColor=ink))
        for index, (value, label) in enumerate(metrics):
            x = 11 + index * 480 / len(metrics)
            advantage.add(String(x, 21, value, fontName='Helvetica-Bold', fontSize=17, fillColor=ink))
            advantage.add(String(x, 8, label, fontName='Helvetica', fontSize=8, fillColor=ink))
        overview.append(advantage)
    axis = Drawing(490, 14)
    plot_width = 420
    tick_color = colors.HexColor('#526b65')
    for index in range(5):
        tick = data['scaleSeconds'] * index / 4
        label = f'{tick:g}' + (' s' if index == 4 else '')
        axis.add(String(plot_width * index / 4, 4, label, fontName='Helvetica', fontSize=8,
                        fillColor=tick_color, textAnchor='start' if index == 0 else 'middle'))

    rows = [[axis]]
    for question in questions:
        row = Drawing(490, 37)
        y = 30
        row.add(String(0, y, question['label'], fontName='Helvetica-Bold', fontSize=9))
        for tick_index in range(5):
            x = plot_width * tick_index / 4
            row.add(Line(x, y - 25, x, y - 5, strokeColor=colors.HexColor('#dfe8e3'), strokeWidth=0.5))
        for series_index, (_, key, ink, _) in enumerate(series):
            value = question[key]
            bar_y = y - 13 - series_index * 10
            width = plot_width * value / (data['scaleSeconds'] * 1000)
            row.add(Rect(0, bar_y, width, 7, fillColor=ink, strokeColor=None))
            row.add(String(486, bar_y, seconds(value), fontName='Helvetica-Bold', fontSize=8, fillColor=ink, textAnchor='end'))
        rows.append([row])

    chart = Table(rows, colWidths=[490], repeatRows=1, hAlign='LEFT', style=[
        (padding, (0, 0), (-1, -1), 0)
        for padding in ('LEFTPADDING', 'RIGHTPADDING', 'TOPPADDING', 'BOTTOMPADDING')
    ])

    return overview + [
        paragraph(f'Diferença média de {seconds(difference)} por pergunta.'),
        paragraph('Tempo por pergunta', style='FindingTitle'),
        paragraph(f"Barras de cima em verde para {vadechat['label']}. Barras de baixo em roxo para {opponent['label']}.", style='Caption'),
        chart,
        paragraph(f"Do envio pela API até o texto completo com confirmação de encerramento. Conversas novas por participante e pergunta. Pedidos sequenciais, sem reenvios. Modelo via OpenRouter {opponent['model']}.", style='Caption'),
    ]
