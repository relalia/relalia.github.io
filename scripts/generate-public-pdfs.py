"""Generate text-only public PDFs from the reviewed JSON, never from private originals."""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'content/reports.json').read_text(encoding='utf-8'))
retest_labels = {'pending': 'Pendente', 'completed': 'Concluído', 'baseline': 'Linha de base'}
target = ROOT / 'public/reports'
target.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitlePublic', parent=styles['Title'], textColor=colors.HexColor('#164c49'), fontSize=20, leading=25, alignment=TA_CENTER, spaceAfter=20))
styles.add(ParagraphStyle(name='FindingPublic', parent=styles['Heading3'], textColor=colors.HexColor('#164c49'), spaceBefore=12, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyPublic', parent=styles['BodyText'], fontSize=9.5, leading=14, spaceAfter=7))
styles.add(ParagraphStyle(name='SmallPublic', parent=styles['BodyText'], fontSize=8, leading=11, textColor=colors.HexColor('#526b65')))

for report in data['reports']:
    filename = Path(report['files'][0]['path']).name
    path = target / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=45, bottomMargin=45,
                            title=f"{report['title']} - versão pública", author='Tri7 Alia - histórico público', subject='Resumo técnico revisado')
    story = [Paragraph(escape(report['title']), styles['CoverTitlePublic']),
             Paragraph(escape(f"{report['module']} · {report['date']} · {report['status']}"), styles['SmallPublic']), Spacer(1, 16),
             Paragraph(escape(report['summary']), styles['BodyPublic'])]
    for highlight in report['highlights']:
        story.append(Paragraph('• ' + escape(highlight), styles['BodyPublic']))
    story.extend([Spacer(1, 12), Paragraph('Achados', styles['Heading2'])])
    for finding in report['findings']:
        parts = [Paragraph(escape(f"{finding['id']} · {finding['title']}"), styles['FindingPublic']),
                 Paragraph(escape(finding['description']), styles['BodyPublic'])]
        if finding.get('context'):
            parts.append(Paragraph('Contexto: ' + escape(finding['context']), styles['SmallPublic']))
        if finding.get('evidenceIds'):
            parts.append(Paragraph('Evidências vinculadas: ' + escape(', '.join(finding['evidenceIds'])), styles['SmallPublic']))
        if finding.get('relatedIds'):
            parts.append(Paragraph('Achados vinculados: ' + escape(', '.join(finding['relatedIds'])), styles['SmallPublic']))
        parts.append(Paragraph('Reteste: ' + escape(retest_labels[finding['retest']]), styles['SmallPublic']))
        story.append(KeepTogether(parts))
    story.extend([Spacer(1, 16), Paragraph('Publicação revisada. Arquivos originais e capturas do Atlas não integram este PDF. Os vínculos de evidência foram mantidos.', styles['SmallPublic'])])
    doc.build(story)
    print(path.relative_to(ROOT))
