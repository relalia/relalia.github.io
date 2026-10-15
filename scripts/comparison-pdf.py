"""Succinct comparison PDF, generated from the same structured data as the page."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
import reportlab

import sys
root = Path(__file__).resolve().parents[1]
source_id = sys.argv[2] if len(sys.argv) > 2 else 'benchmark-comparativo-2026-10-14'
source_file = (root / 'content' / (source_id + '.json')).resolve()
if source_file.parent != (root / 'content').resolve():
    raise ValueError('Comparison source must remain in content')
source = json.loads(source_file.read_text(encoding='utf-8'))
base = root / 'public/reports'
target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else base / (source['id'] + '.pdf')
if not target.resolve().is_relative_to(base.resolve()):
    raise ValueError('PDF target must remain in public/reports')
edit = {**source['editorial'], 'title':source['title']}
data = {'summary':source['summary'], 'rows':[], 'footer':'Médias de cinco notas por modo e execução, sem arredondamento intermediário. Ausência não vira zero. Q05 permanece no resumo histórico, com a inconclusividade solicitada pelo revisor destacada.', 'outcome':'Resultados originais do VadeChat (vitórias/empates comuns/derrotas): Ágil 1/1/3 para 1/0/4; Pleno 2/2/1 para 2/1/2. Sem abstenções ou resultados inconclusivos originalmente atribuídos.'}
data['footer'] = edit.get('denominatorNote', data['footer'])
data['outcome'] = edit.get('outcomeNote', data['outcome'])
alternative = source.get('alternativeLabel', 'ChatGPT gratuito').replace(' gratuito', '')
dates = [r['date'][8:10]+'/'+r['date'][5:7]+'/'+r['date'][:4] for r in source['runs']]
for row in source['rows']:
    score = lambda n:f'{n:.1f}'.replace('.', ',')
    variation = ('+' if row['delta'] > 0 else '') + score(row['delta'])
    data['rows'].append({**row, 'c':{'old':row['old'], 'new':row['new']}, 'cells':[row['question'], 'Ágil' if row['mode']=='agil' else 'Pleno', score(row['old']['vc']['total']), score(row['new']['vc']['total']), variation, row['change']]})
fonts = Path(reportlab.__file__).parent / 'fonts'
pdfmetrics.registerFont(TTFont('Relalia', str(fonts / 'Vera.ttf')))
pdfmetrics.registerFont(TTFont('RelaliaBold', str(fonts / 'VeraBd.ttf')))
pdfmetrics.registerFontFamily('Relalia', normal='Relalia', bold='RelaliaBold', italic='Relalia', boldItalic='RelaliaBold')
green = colors.HexColor('#17645b')
ink = colors.HexColor('#183b3c')
line = colors.HexColor('#dce8e0')
styles = {
    'body': ParagraphStyle('body', fontName='Relalia', fontSize=9, leading=13, textColor=ink, spaceAfter=7),
    'small': ParagraphStyle('small', fontName='Relalia', fontSize=7.7, leading=10, textColor=ink, spaceAfter=4),
    'title': ParagraphStyle('title', fontName='RelaliaBold', fontSize=19, leading=24, textColor=ink, spaceAfter=12),
    'heading': ParagraphStyle('heading', fontName='RelaliaBold', fontSize=13, leading=17, textColor=green, spaceBefore=9, spaceAfter=9, keepWithNext=True),
    'rowtitle': ParagraphStyle('rowtitle', fontName='RelaliaBold', fontSize=8.5, leading=12, textColor=ink, spaceBefore=3, spaceAfter=3),
    'cell': ParagraphStyle('cell', fontName='Relalia', fontSize=8, leading=11, textColor=ink),
    'headcell': ParagraphStyle('headcell', fontName='RelaliaBold', fontSize=7.8, leading=10.3, textColor=green),
}
def typ(s):
    return str(s).replace('→', ' > ').replace('—', '-').replace('–', '-').replace('‑', '-')
def p(s, style='body'):
    return Paragraph(escape(typ(s)), styles[style])
def rich(s):
    return Paragraph(s, styles['body'])
def fmt(n):
    return f'{n:.1f}'.replace('.', ',')
def delta(n):
    return ('+' if n > 0 else '') + fmt(n)
def table(headers, rows, widths):
    cells = [[p(s, 'headcell') for s in headers]] + [[p(s, 'cell') for s in r] for r in rows]
    t = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#edf6f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafcfb')]),
        ('LINEBELOW', (0, 0), (-1, -1), .4, line), ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t
story = []
story += [p('RELALIA / RETESTE VADECHAT × '+alternative.upper()+' / RUN 02', 'small'), p(edit['title'], 'title'),
          p('Execuções: '+dates[0]+' (legado01) e '+dates[1]+' (run02).'), p(' '.join(source['highlights'])), p(edit['caveat'], 'small')]
story.append(table(['Modo', 'Média '+dates[0][:5], 'Média '+dates[1][:5], 'Variação', 'Subiram / caíram / iguais'], [
    [m, fmt(s['old']), fmt(s['new']), delta(s['delta']), f"{s['up']} / {s['down']} / {s['same']}"]
    for m, s in [('Ágil', data['summary']['agil']), ('Pleno', data['summary']['pleno'])]]
    , [55, 79, 79, 75, 217]))
story += [Spacer(1, 10), p('Dez comparações de notas originais', 'heading')]
short_changes = [
    'Retira lista extensa de documentos; persistem omissões e mistura com Registro Civil.',
    'Acrescenta 90 dias; perde firma reconhecida, regime de bens e pacto.',
    'Adota R$ 100 mil e a distinção entre análise especial e comunicação obrigatória.',
    'Recupera hipóteses dos arts. 155-A e 162, antes não localizadas.',
    'Mantém 180 dias; acrescenta 30 dias para outro documento, com desconto questionado.',
    'Mantém 180 dias; mudam ressalvas e informações adicionais.',
    'Acrescenta CPC e dois meses; segue pagamento em vez de declaração em 60 dias.',
    'Perde CPC e declaração em 60 dias; trata pagamento e contradiz o próprio prazo.',
    'Ganha lista de campos; perde identificação de Goiás; persistem ressalvas ausentes.',
    'Ganha data e sinal público; perde vedação, diligência e biometria recomendada.',
]
story.append(table(['Questão', 'Modo', 'VC antes', 'VC nova', 'Variação', 'Mudança principal'], [r['cells'][:5] + [r.get('shortChange',short_changes[i])] for i,r in enumerate(data['rows'])], [50, 45, 50, 50, 60, 250]))
story += [Spacer(1, 9), p(data['footer'], 'small'), p(data['outcome'], 'small'), PageBreak()]
story += [p('Conferência de integridade', 'heading')]
if edit.get('roles'):
    story.append(p(edit['roles'], 'small'))
for item in edit['integrity']:
    story.append(p(item, 'small' if source.get('alternativeLabel') else 'body'))
story += [p('Conferência dos julgamentos e lacunas', 'heading'), p(edit['formal']),
          p('Adversário fixo, avaliação variável', 'heading'), p(edit['oscillation']), PageBreak()]
story += [p('Interpretação por pergunta e modo', 'heading'), p('Sínteses editoriais. Revisões antigas e novas permanecem separadas das notas originais.', 'small')]
for row in data['rows']:
    mode = 'Ágil' if row['mode'] == 'agil' else 'Pleno'
    c = row['c']
    title = f"{row['question']} · {mode}: {fmt(c['old']['vc']['total'])} > {fmt(c['new']['vc']['total'])}"
    story.append(KeepTogether([p(title, 'rowtitle'), p(row['review'], 'small')]))
story += [p('Conclusão limitada à amostra', 'heading'), p(edit['conclusion']), p('Pendências e evidências', 'heading'),
          p(source['pending'], 'small'),
          p('Página e textos integrais: https://relalia.github.io/relatorios/' + source['id'] + '/. Índice gerado e hashes: /reports/' + source['id'] + '-auditoria.json. Execução inicial: /relatorios/'+source['related'][0]['id']+'/. ' + str(len(source['documents'])) + ' fontes pertinentes; backups e rascunhos excluídos.', 'small')]

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(line)
    canvas.line(45, 38, w - 45, 38)
    canvas.setFont('Relalia', 7)
    canvas.setFillColor(ink)
    canvas.drawString(45, 25, 'Relalia | Reteste VadeChat × '+alternative+' | Run 02')
    canvas.drawRightString(w - 45, 25, str(doc.page))
    canvas.restoreState()
doc = SimpleDocTemplate(str(target), pagesize=A4, rightMargin=45, leftMargin=45, topMargin=42, bottomMargin=50,
                        title=edit['title'], author='Relalia', subject='Comparativo documental de execuções', invariant=1)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(target.relative_to(root))
