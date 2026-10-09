"""Print the same structured judge results, then all source texts, without interpreting HTML."""
from pathlib import Path
from xml.sax.saxutils import escape
import json
import reportlab
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.graphics.shapes import Drawing, Line, Circle, String, PolyLine, Rect

ROOT = Path(__file__).resolve().parents[1]

def benchmark_story(report, p):
    b = json.loads((ROOT / f"content/{report['benchmarkId']}.json").read_text(encoding='utf8'))
    font_root = Path(reportlab.__file__).parent / 'fonts'
    pdfmetrics.registerFont(TTFont('BenchmarkText', str(font_root / 'Vera.ttf')))
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
    # Monochrome symbol font is present on Windows; DejaVu is standard on the CI host.
    symbol_paths = [Path('C:/Windows/Fonts/seguisym.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
    symbol = next((f for f in symbol_paths if f.exists()), None)
    if symbol:
        pdfmetrics.registerFont(TTFont('BenchmarkSymbols', str(symbol)))
    source_style = ParagraphStyle('BenchmarkSource', fontName='BenchmarkText', fontSize=8, leading=12, spaceAfter=4, wordWrap='CJK')
    table_style = ParagraphStyle('BenchmarkTable', fontName='BenchmarkText', fontSize=8, leading=11, wordWrap='CJK')
    normal_font = pdfmetrics.getFont('BenchmarkText')
    def source_markup(text):
        result = []
        for char in text:
            if char == '\ufe0f':  # Invisible emoji presentation selector has no standalone glyph.
                continue
            if ord(char) in normal_font.face.charToGlyph:
                result.append(escape(char))
            elif symbol and ord(char) in pdfmetrics.getFont('BenchmarkSymbols').face.charToGlyph:
                result.append(f'<font name="BenchmarkSymbols">{escape(char)}</font>')
            else:
                result.append(f'<font name="STSong-Light">{escape(char)}</font>')
        return ''.join(result)
    def table(rows, widths):
        formatted = [[Paragraph(escape(str(cell)), table_style) for cell in row] for row in rows]
        t = Table(formatted, colWidths=widths, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf6f0')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#164c49')),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#dce8e0')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
        return t
    score = lambda q,m,participant: q['comparisons'][m]['scores'][participant]['total']
    mean = lambda m,participant: sum(score(q,m,participant) for q in b['questions']) / len(b['questions'])
    number = lambda n: f'{n:.1f}'.replace('.',',')
    story = [p(b['subtitle'],style='FindingTitle'), p(b['caveat']), p('5 perguntas técnicas · 10 julgamentos comparativos · escala de 0 a 10'),p(b['metadata']['source'],style='Caption')]
    for key,label in [('reference','Referência'),('participants','Participantes'),('judge','Juiz'),('reviewer','Revisor dos julgamentos'),('reviewerRole','Papel do revisor'),('chatgptModel','Modelo do participante ChatGPT')]:
        value = b['metadata'][key]
        story.append(p(' · '.join(value) if isinstance(value,list) else value,label))
    story.append(p('ChatGPT gratuito descreve a modalidade de acesso. Suas cinco respostas foram reutilizadas nos dois embates. A revisão de outra IA não constitui validação jurídica independente.'))
    for mode, label in [('agil','Ágil'),('pleno','Pleno')]:
        story.append(p(f'{label} × ChatGPT gratuito',style='FindingTitle'))
        for participant, name in [('vadechat',f'Vadechat {label}'),('chatgpt','ChatGPT gratuito')]:
            wins = sum(q['comparisons'][mode]['winner'] == participant for q in b['questions'])
            ties = sum(q['comparisons'][mode]['winner'] == 'tie' for q in b['questions'])
            losses = sum(q['comparisons'][mode]['winner'] in ['vadechat','chatgpt'] and q['comparisons'][mode]['winner'] != participant for q in b['questions'])
            story.append(p(f'{name}: média {number(mean(mode,participant))}/10; {wins} vitórias, {ties} empates, {losses} derrotas.'))
    story.append(p('Pontuação e classificação são distintas: vencer em pontos não implica classificação Conforme. A síntese se limita à cobertura, omissões e contradições frente ao gabarito humano.'))
    rows = [['Questão','Ágil','ChatGPT gratuito contra Ágil','Pleno','ChatGPT gratuito contra Pleno']]
    rows += [[q['id']] + [number(score(q,m,part)) for m in ['agil','pleno'] for part in ['vadechat','chatgpt']] for q in b['questions']]
    rows += [['Média'] + [number(mean(m,part)) for m in ['agil','pleno'] for part in ['vadechat','chatgpt']]]
    story += [p('Tabela consolidada',style='FindingTitle'),table(rows,[55,65,155,65,163]),PageBreak(),p('Notas por pergunta',style='FindingTitle'),p('Os segmentos retos mostram o perfil por questão; não representam evolução temporal. Mesma escala de 0 a 10 nos dois embates.')]
    for mode, label in [('agil','Ágil'),('pleno','Pleno')]:
        d = Drawing(503,240)
        d.add(String(35,223,f'{label} x ChatGPT gratuito',fontName='BenchmarkText',fontSize=11))
        for n in range(0,11,2):
            y = 40 + n*15
            d.add(Line(35,y,450,y,strokeColor=colors.HexColor('#dce8e0')))
            d.add(String(15,y-3,str(n),fontName='BenchmarkText',fontSize=9))
        for i,q in enumerate(b['questions']):
            d.add(String(35+i*103.75,22,q['id'],fontName='BenchmarkText',fontSize=9))
        for part,color,name in [('vadechat','#17645b',f'Vadechat {label}'),('chatgpt','#7852a1','ChatGPT gratuito')]:
            coordinates = [coord for i,q in enumerate(b['questions']) for coord in [35+i*103.75,40+score(q,mode,part)*15]]
            d.add(PolyLine(coordinates,strokeColor=colors.HexColor(color),strokeWidth=2,strokeDashArray=[5,3] if part=='chatgpt' else None))
            for i,q in enumerate(b['questions']):
                d.add(Circle(35+i*103.75,40+score(q,mode,part)*15,4,strokeColor=colors.HexColor(color),fillColor=colors.white))
            d.add(String(35 if part=='vadechat' else 235,205,name,fontName='BenchmarkText',fontSize=9,fillColor=colors.HexColor(color)))
        bars = Drawing(503,90)
        for i,(part,color,name) in enumerate([('vadechat','#17645b',f'Vadechat {label}'),('chatgpt','#7852a1','ChatGPT gratuito')]):
            y = 55-i*40
            bars.add(String(0,y+17,f'{name}: {number(mean(mode,part))}/10',fontName='BenchmarkText',fontSize=9))
            bars.add(Rect(0,y,480,10,fillColor=colors.HexColor('#e9efec'),strokeColor=None))
            bars.add(Rect(0,y,mean(mode,part)*48,10,fillColor=colors.HexColor(color),strokeColor=None))
        story += [KeepTogether([d,p('Médias por embate',style='Caption'),bars])]
    rows = [['Questão','ChatGPT gratuito contra Ágil','ChatGPT gratuito contra Pleno','Diferença Pleno - Ágil']]
    rows += [[q['id'],f"{score(q,'agil','chatgpt')} - {q['comparisons']['agil']['scores']['chatgpt']['classification']}",f"{score(q,'pleno','chatgpt')} - {q['comparisons']['pleno']['scores']['chatgpt']['classification']}",score(q,'pleno','chatgpt')-score(q,'agil','chatgpt')] for q in b['questions']]
    story += [p('Variação observada no julgamento das mesmas respostas do ChatGPT',style='FindingTitle'),p('Os textos são os mesmos. A causa da variação não foi isolada.'),table(rows,[55,160,160,128])]
    def document(doc,label):
        story.append(p(label,style='FindingTitle'))
        story.append(Paragraph(escape(doc['path']),source_style))
        story.append(Paragraph(f"SHA-256: {doc['sha256']}",source_style))
        for line in doc['text'].splitlines():
            story.append(Paragraph(source_markup(line),source_style) if line.strip() else Spacer(1,5))
    story += [PageBreak(),p('Protocolo e limitações',style='FindingTitle'),p(b['metadata']['missing'])]
    for criterion in b['criteria']:
        story.append(p(f"{criterion['label']}: 0 a {criterion['max']} pontos ({criterion['max']*10}% da escala)."))
    for limitation in b['limitations']:
        story.append(p(limitation))
    document(b['protocol'],'global_prompt.txt integral - modelo de protocolo')
    document(b['alternation'],'answer_alternation.txt integral - ordem A/B')
    story.append(p('O portal permite consultar o Prompt reconstruído a partir dos arquivos, combinando o protocolo com os respectivos textos. Os prompts completos efetivamente enviados não estão registrados.'))
    for q in b['questions']:
        story += [PageBreak(),p(f"{q['id']} · {q['title']}",style='FindingTitle')]
        # Keep the catalog finding text available to the existing PDF verification pipeline.
        story.append(p(next(f['description'] for f in report['findings'] if f['id']==q['id'])))
        for mode,label in [('agil','Ágil'),('pleno','Pleno')]:
            c=q['comparisons'][mode]
            story.append(p(f'{label} × ChatGPT gratuito - julgamento original',style='FindingTitle'))
            rows=[['Participante','Critério 1 /4','Critério 2 /4','Critério 3 /2','Total','Classificação']]
            for part,name in [('vadechat',f'Vadechat {label}'),('chatgpt','ChatGPT gratuito')]:
                s=c['scores'][part]
                rows.append([name]+s['criteria']+[s['total'],s['classification']])
                if s['total'] != s['criteriaSum']:
                    story.append(p(f"Discrepância preservada: {name}, total {s['total']}, soma dos critérios {s['criteriaSum']}."))
            story += [table(rows,[110,55,55,55,40,188]),p(c['resultOriginal'],'Resultado original'),p(f"A = {'ChatGPT gratuito' if q['order']['A']=='chatgpt' else 'Vadechat '+label}; B = {'ChatGPT gratuito' if q['order']['B']=='chatgpt' else 'Vadechat '+label}"),p(c['reviewSummary'],'Resumo editorial da revisão metodológica')]
        document(q['question'],'Pergunta integral')
        document(q['human'],'Resposta humana integral - referência')
        document(q['chatgpt'],'Resposta integral - ChatGPT gratuito (reutilizada nos dois embates)')
        for mode,label in [('agil','Ágil'),('pleno','Pleno')]:
            c=q['comparisons'][mode]
            document(c['response'],f'Resposta integral - Vadechat {label}')
            document(c['document'],f'Julgamento integral - Claude Sonnet 5.5 Médio - {label} × ChatGPT gratuito')
            story.append(p(c['reviewKind']))
            document(c['review'],f'Revisão metodológica - GPT 6.1 Sol Alto - {label} × ChatGPT gratuito - integral')
    return story
