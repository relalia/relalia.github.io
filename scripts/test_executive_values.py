import io
import json
import unittest
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate

SCRIPTS = Path(__file__).resolve().parent


def load_module(name, filename):
    spec = spec_from_file_location(name, SCRIPTS / filename)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


source = load_module('executive_source', 'verify-executive-source.py')
pdf = load_module('executive_pdf', 'executive-pdf.py')


class ExecutiveValuesTest(unittest.TestCase):
    def test_source_distinguishes_missing_cells_from_zero(self):
        mode = {
            'label': 'Ágil', 'n': 2, 'coverageTotal': 5, 'pendingJudgments': 3,
            'inconclusive': 0, 'outdated': 0, 'vcMean': None, 'opponentMean': 7.5, 'wins': 1,
        }
        row = 'Ágil — / 7,5 1 / — / — 2/5 (40%) 3 / 0 / 0'
        source.verify_score_row(mode, row, '')
        for wrong in (row.replace('1 / —', '2 / —'), row.replace('— / 7,5', '0,0 / 7,5')):
            with self.assertRaises(AssertionError):
                source.verify_score_row(mode, wrong, '')

    def test_pdf_renders_unknown_averages_and_counts_without_fabricating_zeros(self):
        catalog = json.loads((SCRIPTS.parent / 'content/reports.json').read_text(encoding='utf-8'))
        data = next(report['executive'] for report in catalog['reports'] if report['id'].startswith('benchmark-deepseek'))
        mode, empty = data['modes']
        mode['vcMean'] = None
        mode['criteria'][0]['vc'] = None
        empty.update(n=0, vcMean=None, opponentMean=None, wins=None, ties=None, losses=None)
        for criterion in empty['criteria']:
            criterion.update(n=0, vc=None, opponent=None)
        for key in ('ties', 'losses'):
            mode.pop(key)

        styles = getSampleStyleSheet()

        def paragraph(value, label=None, style=None):
            heading = f'{label} ' if label else ''
            return Paragraph(escape(heading + str(value)), styles['BodyText'])

        output = io.BytesIO()
        SimpleDocTemplate(output).build(pdf.executive_story(data, paragraph))
        text = ' '.join(' '.join(page.extract_text().split()) for page in PdfReader(output).pages)
        self.assertIn('Ágil Não informado 6,80 Não informado 5/5', text)
        self.assertIn('Pleno Não informado Não informado 0 / 0 / 0 0/5', text)
        self.assertIn('Diferença: Não informada', text)


if __name__ == '__main__':
    unittest.main()
