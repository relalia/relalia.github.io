from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors


def seconds(milliseconds):
    return f'{milliseconds / 1000:.3f}'.replace('.', ',') + ' s'


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
    faster = sum(question['opponentMs'] < question['vadechatMs'] for question in questions)
    delta = seconds(abs(vadechat['meanMs'] - opponent['meanMs']))
    chart = Drawing(490, 37 * len(questions) + 21)
    plot_width = 420
    tick_color = colors.HexColor('#526b65')
    for index in range(5):
        tick = data['scaleSeconds'] * index / 4
        label = f'{tick:g}' + (' s' if index == 4 else '')
        chart.add(String(plot_width * index / 4, chart.height - 10, label,
                         fontName='Helvetica', fontSize=8, fillColor=tick_color, textAnchor='start' if index == 0 else 'middle'))

    for index, question in enumerate(questions):
        y = chart.height - 23 - 37 * index
        chart.add(String(0, y, question['label'], fontName='Helvetica-Bold', fontSize=9))
        for tick_index in range(5):
            x = plot_width * tick_index / 4
            chart.add(Line(x, y - 25, x, y - 5, strokeColor=colors.HexColor('#dfe8e3'), strokeWidth=0.5))
        for series_index, (_, key, ink, _) in enumerate(series):
            value = question[key]
            bar_y = y - 13 - series_index * 10
            width = plot_width * value / (data['scaleSeconds'] * 1000)
            chart.add(Rect(0, bar_y, width, 7, fillColor=ink, strokeColor=None))
            chart.add(String(486, bar_y, seconds(value), fontName='Helvetica-Bold', fontSize=8, fillColor=ink, textAnchor='end'))

    return [
        paragraph('Tempo médio até a resposta completa', style='FindingTitle'),
        cards,
        paragraph(f"Diferença média de {delta}. {opponent['label']} terminou primeiro em {faster} de {len(questions)} perguntas."),
        paragraph('Tempo por pergunta', style='FindingTitle'),
        paragraph(f"Barras de cima em verde para {vadechat['label']}. Barras de baixo em roxo para {opponent['label']}.", style='Caption'),
        chart,
        paragraph(f"Do envio pela API até o texto completo com confirmação de encerramento. Conversas novas por participante e pergunta. Pedidos sequenciais, sem reenvios. Modelo via OpenRouter {opponent['model']}.", style='Caption'),
    ]
