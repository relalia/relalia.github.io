"""Visual overview generated only from the page's structured dataset."""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.graphics.shapes import Drawing, Line, Circle, Rect, Polygon, String, PolyLine
ROOT=Path(__file__).resolve().parents[1]
ID='sintese-benchmarks-interface-2026-10-16'
data=json.loads((ROOT/f'content/{ID}.json').read_text(encoding='utf8'))
target=Path(sys.argv[1]).resolve()
if target.parent!=(ROOT/'public/reports').resolve() or target.name!=ID+'.pdf':
    raise ValueError('Overview PDF target must be its own generated attachment')
fonts=Path(reportlab.__file__).parent/'fonts'
pdfmetrics.registerFont(TTFont('Overview',str(fonts/'Vera.ttf')))
pdfmetrics.registerFont(TTFont('OverviewBold',str(fonts/'VeraBd.ttf')))
pdfmetrics.registerFontFamily('Overview',normal='Overview',bold='OverviewBold',italic='Overview',boldItalic='OverviewBold')
ink=colors.HexColor('#183b3c'); green=colors.HexColor('#17645b'); border=colors.HexColor('#dce8e0')
styles={
    'title':ParagraphStyle('title',fontName='OverviewBold',fontSize=18,leading=23,textColor=ink,spaceAfter=10),
    'heading':ParagraphStyle('heading',fontName='OverviewBold',fontSize=12,leading=16,textColor=green,spaceBefore=7,spaceAfter=7,keepWithNext=True),
    'body':ParagraphStyle('body',fontName='Overview',fontSize=9,leading=12.5,textColor=ink,spaceAfter=7),
    'small':ParagraphStyle('small',fontName='Overview',fontSize=7.8,leading=10.5,textColor=ink,spaceAfter=5),
    'cell':ParagraphStyle('cell',fontName='Overview',fontSize=7.5,leading=10,textColor=ink),
    'head':ParagraphStyle('head',fontName='OverviewBold',fontSize=7.4,leading=10,textColor=green)
}
def typ(s):return str(s).replace('→',' > ').replace('−','-').replace('—','-').replace('–','-').replace('Δ','Dif.')
def p(s,style='body'):return Paragraph(escape(typ(s)),styles[style])
def fmt(n):return f'{n:.1f}'.replace('.',',')
def delta(n):return ('+' if n>0 else '')+fmt(n)
def date(s):return s[8:10]+'/'+s[5:7]+'/'+s[:4]
def table(headers,rows,widths):
    t=Table([[p(c,'head') for c in headers]]+[[p(c,'cell') for c in r] for r in rows],colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf6f0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#fafcfb')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,border),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    return t
def marker(d,x,y,color,shape,size=6):
    attrs=dict(strokeColor=color,fillColor=colors.white,strokeWidth=2.5)
    if shape=='square':s=Rect(x-size,y-size,size*2,size*2,**attrs)
    elif shape=='diamond':s=Polygon([x,y+size+2,x+size+2,y,x,y-size-2,x-size-2,y],**attrs)
    elif shape=='triangle':s=Polygon([x,y+size+2,x+size+2,y-size,x-size-2,y-size],**attrs)
    else:s=Circle(x,y,size,**attrs)
    d.add(s)
def label(d,x,y,text,size=18,color=ink,anchor='middle'):
    d.add(String(x,y,typ(text),fontName='Overview',fontSize=size,fillColor=color,textAnchor=anchor))
def main_chart(b,width=245):
    plot=b['plot'];h=plot['height'];d=Drawing(plot['width'],h)
    for tick in range(0,11,2):
        y=plot['bottom']-tick/10*(plot['bottom']-plot['top'])
        d.add(Line(plot['x'][0],h-y,plot['x'][1],h-y,strokeColor=border))
        label(d,plot['x'][0]-13,h-y-6,tick,17,anchor='end')
    for i,s in enumerate(b['series']):
        pts=plot['points'][i];color=colors.HexColor(s['color'])
        d.add(Line(pts[0]['x'],h-pts[0]['y'],pts[1]['x'],h-pts[1]['y'],strokeColor=color,strokeWidth=3,strokeDashArray=[float(n) for n in s['dash'].split()] or None))
        for j,point in enumerate(pts):
            d.add(Line(point['x']+(-9 if j==0 else 9),h-point['y'],plot['leaderX'][j],h-point['labelY'],strokeColor=color))
            marker(d,point['x'],h-point['y'],color,s['marker'])
            label(d,plot['labelX'][j],h-point['labelY']-6,fmt(s['values'][j]),19,color)
    for i,x in enumerate(plot['x']):
        label(d,x,h-290,'Run 0'+str(i+1),18)
        label(d,x,h-316,date(b['dates'][i]),17)
    factor=width/plot['width'];d.scale(factor,factor);d.width*=factor;d.height*=factor
    return d
def small_chart(b,mode,width=185):
    rows=[r for r in b['rows'] if r['mode']==mode];h=285;d=Drawing(320,h)
    y=lambda n:235-n/10*200
    x=lambda i:56+i*57
    for tick in range(0,11,2):
        d.add(Line(56,h-y(tick),284,h-y(tick),strokeColor=border));label(d,32,h-y(tick)-6,tick,17,anchor='end')
    for run in ['old','new']:
        color=colors.HexColor('#66757d' if run=='old' else '#17645b' if mode=='agil' else '#235ca0')
        points=[]
        for i,r in enumerate(rows):points.extend([x(i),h-y(r[run]['vc']['total'])])
        d.add(PolyLine(points,strokeColor=color,strokeWidth=3,strokeDashArray=[8,5] if run=='old' else None,fillColor=None))
        for i,r in enumerate(rows):
            n=r[run]['vc']['total'];marker(d,x(i),h-y(n),color,'circle' if run=='old' else 'square',5)
            new_higher=r['new']['vc']['total']>r['old']['vc']['total']
            above=new_higher if run=='new' else not new_higher
            label(d,x(i),h-y(n)+(13 if above else -23),fmt(n),18,color)
    for i,r in enumerate(rows):label(d,x(i),h-275,r['question'],18)
    factor=width/320;d.scale(factor,factor);d.width*=factor;d.height*=factor
    return d
def image(number,width):
    meta=data['images'][number-1];img=Image(str(ROOT/'public'/meta['path'].lstrip('/')))
    factor=min(1,width/img.imageWidth);img.drawWidth=img.imageWidth*factor;img.drawHeight=img.imageHeight*factor
    return [img,p(f"{meta['id']} · captura original · SHA-256 {meta['sha256'][:16]}… (completo no índice)",'small')]
def columns(left,right,widths=[250,250]):
    t=Table([[left,right]],colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]));return t
story=[p('RELALIA / SÍNTESE VISUAL / 16.10.2026','small'),p(data['title'],'title'),p(data['period'],'small'),p(data['caveat'],'small')]
summary=[]
for b in data['benchmarks']:
    for m in ['agil','pleno']:
        s=b['summaries'][m];summary.append([b['label'],'Ágil' if m=='agil' else 'Pleno',fmt(s['old']),fmt(s['new']),delta(s['delta']),f"{s['up']} / {s['down']} / {s['same']}"])
story += [table(['Conjunto','Modo','Run 01','Run 02','Δ média','Subiram / caíram / iguais'],summary,[126,44,54,54,58,164]),p('Denominador: cinco notas válidas, nas mesmas perguntas, em cada modo e execução. Sem arredondamento intermediário.','small'),p('Médias por execução · escala comum de 0 a 10','heading')]
panels=[]
for b in data['benchmarks']:
    panels.append([p(b['label'],'heading'),p('Juiz: '+b['judge'],'small'),main_chart(b),table(['Série','Run 01','Run 02','Δ'],[[s['label'],fmt(s['values'][0]),fmt(s['values'][1]),delta(s['delta'])] for s in b['series']],[121,40,40,41])])
story += [columns(*panels),Spacer(1,7),p('Ágil: círculo e verde; Pleno: quadrado e azul. Adversário contra Ágil: losango e tracejado roxo; contra Pleno: triângulo e pontilhado ocre. Rótulos próximos usam linhas-guia, sem deslocar os pontos.','small'),p(data['figureNote'],'small'),PageBreak()]
story += [p('Por pergunta: onde a nota mudou','heading'),p('VadeChat · Run 01: círculo e tracejado cinza. Run 02: quadrado e linha verde (Ágil) ou azul (Pleno). Escala 0–10 nos quatro gráficos.','small'),p('Condições declaradas: participante ChatGPT gratuito sem login, modelo não identificado; participante Claude gratuito com login e Sonnet 5.5 Médio exibido. Revisões de GPT 6.1 Sol Alto, acesso pago. Juízes distintos, identificados no painel de cada conjunto. Não são afirmações sobre condições atuais das plataformas.','small')]
for b in data['benchmarks']:
    story += [p(b['label'],'heading'),columns([p('Ágil','small'),small_chart(b,'agil')],[p('Pleno','small'),small_chart(b,'pleno')])]
notes=[]
for b in data['benchmarks']:
    changes='; '.join(f"{r['question']} {'Ágil' if r['mode']=='agil' else 'Pleno'}: {fmt(r['old']['opponent']['total'])} > {fmt(r['new']['opponent']['total'])}" for r in b['rows'] if r['opponentDelta'])
    notes.append([p(b['label'],'heading'),p(b['concentration'],'small'),p(f"Adversário fixo: {b['changedOpponent']}/10 embates com alteração. {changes}.",'small'),p('Revisões - síntese editorial: '+b['review'],'small')])
story += [columns(*notes),p('Notas, classificações e vencedores originais preservados. Informações adicionais não verificáveis, extensão e número de citações não são métricas. As revisões questionam julgamentos; não substituem o histórico.','small'),PageBreak()]
a,b,c,d=data['improvements']
story += [p('Interface: rastreabilidade por resposta','heading'),p(a['id']+' · '+a['status'],'small'),p(a['description']),p(a['benefit'],'small'),p(a['limit'],'small')]+image(1,470)+image(2,470)+[p('Fonte: capturas e relato do usuário. Sem reteste independente do produto. Vínculo anterior: alia-2026-10-08 / VC-TRACE-14.','small'),PageBreak()]
story += [p('GIRO: leitura e ação em destaque','heading'),p(b['id']+' · '+b['status'],'small'),p(b['description'],'small')]+image(3,250)+[p('Relato do usuário: Mostrar mais expande o resumo e o botão ganhou área de interação. Benefício esperado: facilitar leitura e toque; sem medição de cliques ou velocidade. O escopo GIRO-UX-01 permanece parcialmente documentado.','small'),p('Compositor: espaço para o contexto da notícia','heading'),p(c['id']+' · '+c['status'],'small'),p(c['description'],'small')]+image(4,500)+[p('Altura adequada ao texto, segundo o usuário; mais espaço para edição, com rolagem. Não demonstra conteúdo todo visível, altura ilimitada, envio automático ou retorno ao tamanho inicial (VC-UX-05 / VC-FLOW-06).','small'),PageBreak()]
story += [p('Hero: do chip ao início da consulta','heading'),p(d['id']+' · '+d['status'],'small'),p(d['description'],'small')]+image(5,500)+image(6,500)+[p(d['reported'],'small'),p(d['benefit'],'small'),p(d['limit'],'small'),p('Método, fontes e limites','heading'),p(data['formula'],'small'),p('Referências humanas sem validação jurídica externa; conjuntos e juízes distintos. Prompts completos ausentes nos legados e metadados com lacunas. Configurações declaradas pelo executor. Não há evidência causal entre interface e notas, nem medição de custo, latência ou produtividade.','small'),p('Página, ampliações das imagens e downloads: https://relalia.github.io/relatorios/'+ID+'/. Dados: /reports/'+ID+'-dados.json. Índice gerado e hashes: /reports/'+ID+'-fontes.json. Comparativos completos: /relatorios/benchmark-comparativo-2026-10-14/ e /relatorios/benchmark-comparativo-claude-2026-10-15/.','small')]
def footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(border);canvas.line(46,38,A4[0]-46,38);canvas.setFont('Overview',7);canvas.setFillColor(ink);canvas.drawString(46,25,'Relalia | Síntese de benchmarks e interface | 16/10/2026');canvas.drawRightString(A4[0]-46,25,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate(str(target),pagesize=A4,leftMargin=46,rightMargin=46,topMargin=40,bottomMargin=48,title=data['title'],author='Relalia',subject='Síntese visual de dois benchmarks e seis capturas',invariant=1)
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(target.relative_to(ROOT))
