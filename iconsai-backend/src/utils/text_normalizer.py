"""
Text normalization utilities for TTS.
Handles number-to-words conversion and phonetic map application for PT-BR.
"""

import re
from typing import Dict, Optional

# Portuguese number words
UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

# Default phonetic map for Brazilian Portuguese terms
DEFAULT_PHONETIC_MAP: Dict[str, str] = {
    # Economy - Natural pronunciations
    "PIB": "pi-bi",
    "IPCA": "ípeca",
    "IGP-M": "igepê-ême",
    "INPC": "inepecê",
    "CDI": "cedê-í",
    "PMC": "peemecê",

    # Institutions
    "BCB": "becebê",
    "BACEN": "bacém",
    "COPOM": "copóm",
    "CMN": "ceemêne",
    "CVM": "cevêeme",
    "BNDES": "beenedéesse",
    "IBGE": "ibegê",
    "IPEA": "ipéa",
    "FGV": "efegêvê",
    "FIPE": "fípi",
    "DIEESE": "diêsse",
    "CAGED": "cajéd",
    "INSS": "inêssi",
    "FGTS": "efegêtêesse",
    "CLT": "cêeletê",
    "MEI": "mêi",
    "CNPJ": "ceenepêjóta",
    "CPF": "cêpêéfe",

    # Rates and indicators
    "Selic": "séliqui",
    "SELIC": "séliqui",
    "PTAX": "petáx",
    "TR": "têérre",
    "IOF": "iôéfe",
    "IR": "iérre",
    "IRPF": "iérrepêéfe",
    "ICMS": "icemésse",
    "IPI": "ipí",
    "PIS": "pís",
    "COFINS": "cofíns",

    # Financial market
    "IPO": "ipô",
    "ETF": "ítêéfe",
    "CDB": "cedêbê",
    "LCI": "élecêí",
    "LCA": "élecêá",
    "FII": "fiî",
    "NTN": "ênetêene",

    # International
    "FMI": "éfemí",
    "ONU": "onú",
    "OMC": "ômecê",
    "OCDE": "ócedê",
    "BCE": "becê",
    "FED": "féd",
    "G20": "gê vínti",
    "BRICS": "brícs",
    "EUA": "êuá",

    # Currencies
    "USD": "dólar",
    "BRL": "real",
    "EUR": "êuro",
    "GBP": "líbra",

    # Technology
    "IA": "iá",
    "AI": "êi ái",
    "API": "apí",
    "PDF": "pedêéfe",
    "URL": "urél",

    # English terms - Brazilian pronunciation
    "spread": "sprééd",
    "hedge": "hédji",
    "swap": "suóp",
    "default": "defólt",
    "rating": "rêitin",
    "benchmark": "bêntchmark",
    "commodities": "comóditis",
    "commodity": "comóditi",
    "target": "târguet",
    "stop": "istóp",
    "day trade": "dêi trêid",
    "home broker": "hôme brôker",

    # IconsAI brand
    "IconsAI": "aiconseiai",
    "iconsai": "aiconseiai",
    "ICONSAI": "aiconseiai",
}


def number_to_words(num: int) -> str:
    """Convert a number to Portuguese words."""
    if num == 0:
        return 'zero'
    if num == 100:
        return 'cem'
    if num < 0:
        return 'menos ' + number_to_words(abs(num))

    if num < 10:
        return UNITS[num]
    if num < 20:
        return TEENS[num - 10]
    if num < 100:
        ten = num // 10
        unit = num % 10
        return TENS[ten] + (' e ' + UNITS[unit] if unit else '')
    if num < 1000:
        hundred = num // 100
        rest = num % 100
        if num == 100:
            return 'cem'
        return HUNDREDS[hundred] + (' e ' + number_to_words(rest) if rest else '')
    if num < 1000000:
        thousand = num // 1000
        rest = num % 1000
        thousand_word = 'mil' if thousand == 1 else number_to_words(thousand) + ' mil'
        return thousand_word + (' e ' + number_to_words(rest) if rest else '')
    if num < 1000000000:
        million = num // 1000000
        rest = num % 1000000
        million_word = 'um milhão' if million == 1 else number_to_words(million) + ' milhões'
        return million_word + (' e ' + number_to_words(rest) if rest else '')
    if num < 1000000000000:
        billion = num // 1000000000
        rest = num % 1000000000
        billion_word = 'um bilhão' if billion == 1 else number_to_words(billion) + ' bilhões'
        return billion_word + (' e ' + number_to_words(rest) if rest else '')

    return str(num)


def currency_to_words(value: str) -> str:
    """Convert currency value (R$ X.XXX,XX) to Portuguese words."""
    cleaned = re.sub(r'R\$\s*', '', value).strip()
    parts = cleaned.replace('.', '').split(',')
    reais = int(parts[0]) if parts[0] else 0
    centavos = int(parts[1].ljust(2, '0')[:2]) if len(parts) > 1 and parts[1] else 0

    result = ''

    if reais > 0:
        result = number_to_words(reais) + (' real' if reais == 1 else ' reais')

    if centavos > 0:
        if reais > 0:
            result += ' e '
        result += number_to_words(centavos) + (' centavo' if centavos == 1 else ' centavos')

    if reais == 0 and centavos == 0:
        result = 'zero reais'

    return result


def percentage_to_words(value: str) -> str:
    """Convert percentage (X,X% or X.X%) to Portuguese words."""
    cleaned = re.sub(r'%', '', value).replace(' ', '').strip()

    # Decimal with comma or dot
    if ',' in cleaned or '.' in cleaned:
        separator = ',' if ',' in cleaned else '.'
        parts = cleaned.split(separator)
        integer_part = int(parts[0]) if parts[0] else 0
        decimal_part = int(parts[1]) if len(parts) > 1 and parts[1] else 0

        if decimal_part == 0:
            return number_to_words(integer_part) + ' por cento'

        return number_to_words(integer_part) + ' vírgula ' + number_to_words(decimal_part) + ' por cento'

    # Integer
    num = int(cleaned) if cleaned else 0
    return number_to_words(num) + ' por cento'


def normalize_numbers(text: str) -> str:
    """
    Normalize all numbers in text to Portuguese words.

    Handles:
    - Currency: R$ 1.234,56
    - Percentages: 12,5% or 12.5%
    - Large numbers with thousand separators: 1.500.000
    - Decimal numbers: 3,14
    """
    result = text

    # 1. Currency: R$ X.XXX,XX
    result = re.sub(
        r'R\$\s*[\d.,]+',
        lambda m: currency_to_words(m.group()),
        result
    )

    # 2. Percentages: X,X% or X.X%
    result = re.sub(
        r'[\d.,]+\s*%',
        lambda m: percentage_to_words(m.group()),
        result
    )

    # 3. Large numbers with thousand separator: 1.500.000
    result = re.sub(
        r'\b\d{1,3}(?:\.\d{3})+\b',
        lambda m: number_to_words(int(m.group().replace('.', ''))),
        result
    )

    # 4. Decimal numbers with comma: 3,14
    def decimal_to_words(match):
        integer = match.group(1)
        decimal = match.group(2)
        int_num = int(integer)
        decimal_words = ' '.join(UNITS[int(d)] if d.isdigit() else d for d in decimal)
        return number_to_words(int_num) + ' vírgula ' + decimal_words

    result = re.sub(
        r'\b(\d+),(\d+)\b',
        decimal_to_words,
        result
    )

    return result


def escape_regex(text: str) -> str:
    """Escape special regex characters."""
    return re.escape(text)


def normalize_text_for_tts(
    text: str,
    phonetic_map: Optional[Dict[str, str]] = None
) -> str:
    """
    Normalize text for TTS by applying phonetic substitutions.

    Args:
        text: Input text
        phonetic_map: Custom phonetic map (merged with defaults)

    Returns:
        Normalized text with phonetic substitutions applied
    """
    # Merge custom phonetic map with defaults
    final_map = {**DEFAULT_PHONETIC_MAP}
    if phonetic_map:
        final_map.update(phonetic_map)

    normalized = text

    # Sort by length (longest first) to avoid partial substitutions
    sorted_terms = sorted(
        [t for t in final_map.keys() if t and t.strip()],
        key=len,
        reverse=True
    )

    for term in sorted_terms:
        try:
            # Check if term is alphanumeric (word boundaries work)
            if re.match(r'^[\w\s]+$', term):
                # Use word boundaries for alphanumeric terms
                pattern = re.compile(rf'\b{escape_regex(term)}\b', re.IGNORECASE)
                normalized = pattern.sub(final_map[term], normalized)
            else:
                # For special characters, use literal replacement with spacing
                replacement = f' {final_map[term]} '
                normalized = normalized.replace(term, replacement)
        except Exception:
            # Fallback: simple replacement
            normalized = normalized.replace(term, final_map[term])

    # Clean up multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized


def prepare_text_for_tts(
    text: str,
    phonetic_map: Optional[Dict[str, str]] = None
) -> str:
    """
    Full text preparation pipeline for TTS.

    1. Normalize numbers to words
    2. Apply phonetic map

    Args:
        text: Input text
        phonetic_map: Optional custom phonetic map

    Returns:
        Fully normalized text ready for TTS
    """
    # Sanitize input
    sanitized = text.strip().replace('<', '').replace('>', '')

    # Normalize numbers first
    with_numbers = normalize_numbers(sanitized)

    # Apply phonetic map
    final = normalize_text_for_tts(with_numbers, phonetic_map)

    return final
