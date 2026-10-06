"""Generate only catalog attachments explicitly marked generated. Never rewrite originals."""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, KeepTogether

ROOT = Path(__file__).resolve().parents[1]

def generated_target(file):
    relative = file['path']
    if file['origin'] != 'generated' or not relative.startswith('/reports/') or not relative.endswith('.pdf'):
        raise ValueError('PDF generator may write only generated attachments in /reports/')
    target = (ROOT / 'public' / relative.lstrip('/')).resolve()
    if not target.is_relative_to((ROOT / 'public/reports').resolve()):
        raise ValueError('PDF path escapes the generated reports directory')
    return target

def generate(data):
    evidence = {e['id']: e for e in data['evidence']}
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ReportTitle', parent=styles['Title'], textColor=colors.HexColor('#164c49'), fontSize=22, leading=27, spaceAfter=20))
    styles.add(ParagraphStyle(name='FindingTitle', parent=styles['Heading2'], textColor=colors.HexColor('#164c49'), fontSize=13, leading=17, spaceBefore=18, spaceAfter=10))
    styles.add(ParagraphStyle(name='Text', parent=styles['BodyText'], fontSize=9.5, leading=14, spaceAfter=9))
    styles.add(ParagraphStyle(name='Caption', parent=styles['BodyText'], fontSize=8, leading=11, spaceAfter=10, textColor=colors.HexColor('#526b65')))
    def p(text, label=None, style='Text'):
        return Paragraph((f'<b>{escape(label)}:</b> ' if label else '') + escape(str(text)), styles[style])
    def page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#526b65'))
        canvas.drawString(46, 26, 'Relalia: O Relatório da Alia')
        canvas.drawRightString(A4[0]-46, 26, f'Página {doc.page}')
        canvas.restoreState()
    for report in data['reports']:
        for attachment in report['files']:
            if attachment['origin'] != 'generated':
                continue
            target = generated_target(attachment)
            target.parent.mkdir(parents=True, exist_ok=True)
            doc = SimpleDocTemplate(str(target), pagesize=A4, leftMargin=46, rightMargin=46, topMargin=44, bottomMargin=44,
                title=report['title'], author='Relalia', subject=attachment['label'], invariant=1)
            story = [p(report['title'], style='ReportTitle'), p(f"{report['module']} · {report['date']} · {report['status']}",style='Caption'),
                p(attachment['label'],style='Caption'), p(report['summary'])]
            for highlight in report['highlights']:
                story.append(p('• ' + highlight))
            if any(f['origin'] == 'original' for f in report['files']):
                story.append(p('Esta ficha é complementar. Os documentos originais estão disponíveis separadamente, com bytes preservados.', style='Caption'))
            story.append(p(f"{len(report['findings'])} achados",style='FindingTitle'))
            for finding in report['findings']:
                story.append(KeepTogether([p(f"{finding['id']} · {finding['title']}",style='FindingTitle'), p(finding['description'],finding.get('observationLabel','Observado'))]))
                for key,label in [('kind','Categoria'),('severity','Criticidade'),('context','Contexto'),('hypothesis','Hipótese'),('expected','Melhoria esperada'),('suggestion','Sugestão registrada'),('verification','Como verificar'),('basis','Fundamento registrado'),('status','Situação')]:
                    if finding.get(key):
                        story.append(p(finding[key],label))
                if finding.get('hypothesis') and finding.get('originalRecord'):
                    story.append(p(finding['originalRecord']['descricao'],'Texto original do checklist'))
                for field in finding.get('sourceFields',[]):
                    story.append(p(field['value'],field['label']))
                execution = {'performed':'Executado','not-performed':'Não executado','not-applicable':'Ainda não aplicável à proposta'}[finding['retest']['execution']]
                story.append(p(execution,'Reteste'))
                story.append(p(finding['retest'].get('result') or 'Sem resultado de reteste registrado','Resultado do reteste'))
                if finding.get('relatedIds'):
                    story.append(p(', '.join(finding['relatedIds']),'Achados vinculados'))
                for comparison in finding.get('comparisons',[]):
                    story.append(p(f"{comparison['label']}: https://relalia.github.io/relatorios/{comparison['reportId']}/#{comparison['findingId']}",'Comparação',style='Caption'))
                if not finding['evidenceIds']:
                    story.append(p('Sem evidência visual anexada a este item. Consulte também os documentos da rodada.',style='Caption'))
                for evidence_id in finding['evidenceIds']:
                    item = evidence[evidence_id]
                    story.append(p(f"{evidence_id} · {item['description']}",'Evidência',style='Caption'))
                    if item['kind'] == 'image' and item['path']:
                        img = Image(str(ROOT / 'public' / item['path'].lstrip('/')))
                        scale = min(1, (A4[0]-92)/img.imageWidth, 390/img.imageHeight)
                        img.drawWidth, img.drawHeight = img.imageWidth*scale, img.imageHeight*scale
                        story.append(KeepTogether([img,p(f"Captura original · {evidence_id} · {item['originalName']}",style='Caption')]))
                    elif item['kind'] == 'description':
                        story.append(p('Descrição sem imagem incorporada.',style='Caption'))
                    elif item['kind'] == 'video':
                        story.append(p(f"Vídeo original · {evidence_id} · {item['originalName']}. Consulte o MP4 no portal; este PDF não contém quadros extraídos.",style='Caption'))
                    if item['path']:
                        story.append(p('https://relalia.github.io' + item['path'].replace(' ','%20'),style='Caption'))
            story += [Spacer(1,14),p(report.get('note') or 'Propostas e critérios de verificação não representam funcionalidades implementadas nem retestes executados.',style='Caption')]
            doc.build(story,onFirstPage=page_footer,onLaterPages=page_footer)
            print(target.relative_to(ROOT))

if __name__ == '__main__':
    generate(json.loads((ROOT/'content/reports.json').read_text(encoding='utf-8')))
