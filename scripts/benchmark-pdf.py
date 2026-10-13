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
    alternative_key = 'alternative' if 'alternativeLabel' in b else 'chatgpt'
    alternative_name = b.get('alternativeLabel','ChatGPT gratuito')
    judge = b.get('judgeLabel','Claude Sonnet 5.5 Médio')
    reviewer = b.get('reviewerTitle','Revisão metodológica - GPT 6.1 Sol Alto')
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
    def mean(m,participant):
        values=[score(q,m,participant) for q in b['questions'] if isinstance(score(q,m,participant),(int,float))]
        return sum(values)/len(values) if values else None
    number = lambda n: f'{n:.1f}'.replace('.',',') if n is not None else 'não registrado'
    story = [p(b['subtitle'],style='FindingTitle'), p(b['caveat']), p('5 perguntas técnicas · 10 julgamentos comparativos · escala de 0 a 10'),p(b['metadata']['source'],style='Caption')]
    for key,label in [('reference','Referência'),('participants','Participantes'),('judge','Juiz'),('reviewer','Revisor dos julgamentos'),('reviewerRole','Papel do revisor'),(('alternativeModel' if alternative_key=='alternative' else 'chatgptModel'),'Modelo exibido da alternativa gratuita')]:
        value = b['metadata'][key]
        story.append(p(' · '.join(value) if isinstance(value,list) else value,label))
    story.append(p(b.get('reuseNote','As mesmas cinco respostas da alternativa foram reutilizadas nos dois embates.')))
    for condition in b.get('conditions',[]):
        story.append(p(condition))
    if b.get('dateBasis'): story.append(p(b['dateBasis']))
    for mode, label in [('agil','Ágil'),('pleno','Pleno')]:
        story.append(p(f'{label} × {alternative_name}',style='FindingTitle'))
        for participant, name in [('vadechat',f'Vadechat {label}'),(alternative_key,alternative_name)]:
            wins = sum(q['comparisons'][mode]['winner'] == participant for q in b['questions'])
            ties = sum(q['comparisons'][mode]['winner'] == 'tie' for q in b['questions'])
            losses = sum(q['comparisons'][mode]['winner'] in ['vadechat',alternative_key] and q['comparisons'][mode]['winner'] != participant for q in b['questions'])
            story.append(p(f"{name}: média {number(mean(mode,participant))}/10; {wins} {'vitória' if wins==1 else 'vitórias'}, {ties} {'empate' if ties==1 else 'empates'}, {losses} {'derrota' if losses==1 else 'derrotas'}."))
        if alternative_key == 'alternative':
            ordinary=sum(q['comparisons'][mode]['winner']=='tie' and q['comparisons'][mode]['tieKind']=='ordinary' for q in b['questions'])
            abstention=sum(q['comparisons'][mode]['tieKind']=='abstention' for q in b['questions'])
            inconclusive=sum(q['comparisons'][mode]['winner']=='inconclusive' for q in b['questions'])
            story.append(p(f'Denominadores: cinco notas por participante e cinco comparações por embate. Empates comuns: {ordinary}; por abstenção: {abstention}; resultados inconclusivos: {inconclusive}. Ausência de nota não é zero.'))
            classes=['Conforme','Parcialmente conforme','Divergente','Abstenção','Inconclusiva']
            rows=[['Participante']+classes]
            rows += [[name]+[str(sum(q['comparisons'][mode]['scores'][participant]['classification']==c for q in b['questions']))+'/5' for c in classes] for participant,name in [('vadechat','Vadechat '+label),(alternative_key,alternative_name)]]
            story += [table(rows,[95,65,115,75,75,78])]
    story.append(p('Pontuação e classificação são distintas: vencer em pontos não implica classificação Conforme. A síntese se limita à cobertura, omissões e contradições frente ao gabarito humano.'))
    rows = [['Questão','Ágil',alternative_name+' contra Ágil','Pleno',alternative_name+' contra Pleno']]
    rows += [[q['id']] + [number(score(q,m,part)) for m in ['agil','pleno'] for part in ['vadechat',alternative_key]] for q in b['questions']]
    rows += [['Média'] + [number(mean(m,part)) for m in ['agil','pleno'] for part in ['vadechat',alternative_key]]]
    story += [p('Tabela consolidada',style='FindingTitle'),table(rows,[55,65,155,65,163]),PageBreak(),p('Notas por pergunta',style='FindingTitle'),p('Os segmentos retos mostram o perfil por questão; não representam evolução temporal. Mesma escala de 0 a 10 nos dois embates.')]
    for mode, label in [('agil','Ágil'),('pleno','Pleno')]:
        d = Drawing(503,240)
        d.add(String(35,223,f'{label} x {alternative_name}',fontName='BenchmarkText',fontSize=11))
        for n in range(0,11,2):
            y = 40 + n*15
            d.add(Line(35,y,450,y,strokeColor=colors.HexColor('#dce8e0')))
            d.add(String(15,y-3,str(n),fontName='BenchmarkText',fontSize=9))
        for i,q in enumerate(b['questions']):
            d.add(String(35+i*103.75,22,q['id'],fontName='BenchmarkText',fontSize=9))
        for part,color,name in [('vadechat','#17645b',f'Vadechat {label}'),(alternative_key,'#7852a1',alternative_name)]:
            coordinates = [coord for i,q in enumerate(b['questions']) for coord in [35+i*103.75,40+score(q,mode,part)*15]]
            d.add(PolyLine(coordinates,strokeColor=colors.HexColor(color),strokeWidth=2,strokeDashArray=[5,3] if part==alternative_key else None))
            for i,q in enumerate(b['questions']):
                d.add(Circle(35+i*103.75,40+score(q,mode,part)*15,4,strokeColor=colors.HexColor(color),fillColor=colors.white))
            d.add(String(35 if part=='vadechat' else 235,205,name,fontName='BenchmarkText',fontSize=9,fillColor=colors.HexColor(color)))
        bars = Drawing(503,90)
        for i,(part,color,name) in enumerate([('vadechat','#17645b',f'Vadechat {label}'),(alternative_key,'#7852a1',alternative_name)]):
            y = 55-i*40
            bars.add(String(0,y+17,f'{name}: {number(mean(mode,part))}/10',fontName='BenchmarkText',fontSize=9))
            bars.add(Rect(0,y,480,10,fillColor=colors.HexColor('#e9efec'),strokeColor=None))
            bars.add(Rect(0,y,mean(mode,part)*48,10,fillColor=colors.HexColor(color),strokeColor=None))
        story += [KeepTogether([d,p('Médias por embate',style='Caption'),bars])]
    rows = [['Questão',alternative_name+' contra Ágil',alternative_name+' contra Pleno','Diferença Pleno - Ágil']]
    rows += [[q['id'],f"{score(q,'agil',alternative_key)} - {q['comparisons']['agil']['scores'][alternative_key]['classification']}",f"{score(q,'pleno',alternative_key)} - {q['comparisons']['pleno']['scores'][alternative_key]['classification']}",score(q,'pleno',alternative_key)-score(q,'agil',alternative_key)] for q in b['questions']]
    story += [p('Variação observada no julgamento das mesmas respostas de '+alternative_name,style='FindingTitle'),p(b.get('varianceDescription','Os textos são os mesmos. A causa da variação não foi isolada.')),table(rows,[55,160,160,128])]
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
    if alternative_key == 'alternative':
        docs=[b['protocol'],b['alternation']]+[doc for q in b['questions'] for doc in [q['question'],q['human'],q[alternative_key]]+[doc for mode in ['agil','pleno'] for doc in [q['comparisons'][mode]['response'],q['comparisons'][mode]['document'],q['comparisons'][mode]['review']]]]
        story.append(p(f'Índice das {len(docs)} evidências originais',style='FindingTitle'))
        for i,source in enumerate(docs):
            url='https://relalia.github.io'+source['path']
            story.append(Paragraph(f'{i+1}. <link href="{escape(url)}">{escape(source["path"])}</link>',source_style))
        story.append(p('Cada texto integral abaixo é acompanhado pelo SHA-256. Os mesmos arquivos da pergunta, referência e Claude são vinculados aos dois embates.'))
    document(b['protocol'],'global_prompt.txt integral - modelo de protocolo')
    document(b['alternation'],'answer_alternation.txt integral - ordem A/B')
    story.append(p('O portal permite consultar o Prompt reconstruído a partir dos arquivos, combinando o protocolo com os respectivos textos. Os prompts completos efetivamente enviados não estão registrados.'))
    for q in b['questions']:
        story += [PageBreak(),p(f"{q['id']} · {q['title']}",style='FindingTitle')]
        # Keep the catalog finding text available to the existing PDF verification pipeline.
        story.append(p(next(f['description'] for f in report['findings'] if f['id']==q['id'])))
        for mode,label in [('agil','Ágil'),('pleno','Pleno')]:
            c=q['comparisons'][mode]
            story.append(p(f'{label} × {alternative_name} - julgamento original',style='FindingTitle'))
            rows=[['Participante','Critério 1 /4','Critério 2 /4','Critério 3 /2','Total','Classificação']]
            for part,name in [('vadechat',f'Vadechat {label}'),(alternative_key,alternative_name)]:
                s=c['scores'][part]
                rows.append([name]+[number(n) for n in s['criteria']]+[number(s['total']),s['classification']])
                if s['total'] != s['criteriaSum']:
                    story.append(p(f"Discrepância preservada: {name}, total {s['total']}, soma dos critérios {s['criteriaSum']}."))
            winner=c['winner']
            result='Empate' if winner=='tie' else 'Inconclusivo' if winner=='inconclusive' else (alternative_name if winner==alternative_key else 'Vadechat '+label)+' venceu'
            story += [table(rows,[110,55,55,55,40,188]),p(result,'Resultado original'),p(f"A = {alternative_name if c.get('order',q['order'])['A']==alternative_key else 'Vadechat '+label}; B = {alternative_name if c.get('order',q['order'])['B']==alternative_key else 'Vadechat '+label}"),p(c['reviewSummary'],'Resumo editorial da revisão metodológica')]
            if alternative_key == 'alternative':
                story += [p(c['reviewImpact'],'Impacto possível na interpretação'),p(c['reviewAction'],'Necessidade de revisão')]
                for observation in c['observations']: story.append(p(observation,'Inconsistência preservada'))
                story.append(p(f"Diferença Vadechat - Claude: {number(c['scores']['vadechat']['total']-c['scores']['alternative']['total'])} ponto(s)."))
                story.append(p('Prompt reconstruído a partir dos arquivos: global_prompt.txt + pergunta + corpo substantivo da referência + fatos obrigatórios/pesos e observação de revisão identificados separadamente + respostas na ordem A/B acima. A composição integral pode ser copiada/baixada no portal. Não existe registro do prompt efetivamente enviado.'))
        if alternative_key == 'alternative':
            story.append(p('Fatos obrigatórios e pesos registrados',style='FindingTitle'))
            for fact in q['mandatoryFacts']:story.append(p(f"{fact['text']} - peso {fact['weight']:.2f}"))
            if not q['mandatoryFacts']:story.append(p('Nenhum fato obrigatório com peso explicitamente registrado.'))
            story.append(p('As variações da pergunta e demais metadados são preservados na resposta humana integral abaixo, sem compor o enunciado substantivo.'))
        document(q['question'],'Pergunta integral')
        document(q['human'],'Resposta humana integral - referência')
        document(q[alternative_key],'Resposta integral - '+alternative_name+' (reutilizada nos dois embates)')
        for mode,label in [('agil','Ágil'),('pleno','Pleno')]:
            c=q['comparisons'][mode]
            document(c['response'],f'Resposta integral - Vadechat {label}')
            document(c['document'],f'Julgamento integral - {judge} - {label} × {alternative_name}')
            story.append(p(c['reviewKind']))
            document(c['review'],f'{reviewer} - {label} × {alternative_name} - integral')
    if b.get('conclusion'): story += [PageBreak(),p('Conclusão dentro da amostra',style='FindingTitle'),p(b['conclusion'])]
    return story
