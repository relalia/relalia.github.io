"""Formatting shared by the executive PDF generator and its verifier."""

from decimal import Decimal, ROUND_HALF_UP


def fmt(value, digits=1):
    if value is None:
        return 'Não informado'
    rounded = Decimal(str(value)).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return format(rounded, 'f').replace('.', ',')


def outcome_record(mode):
    counts = [mode.get(key) for key in ('wins', 'ties', 'losses')]
    if mode['n'] == 0 and all(count is None or count == 0 for count in counts):
        return '0 / 0 / 0'
    return 'Não informado' if None in counts else ' / '.join(map(str, counts))
