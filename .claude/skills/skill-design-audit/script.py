#!/usr/bin/env python3
"""
FIA Design Audit Script
Audita arquivos React/TSX contra o Design System do FIA
"""

import os
import re
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime

# Regras de Design do FIA
DESIGN_RULES = {
    # Backgrounds
    "backgrounds": {
        "page": ["bg-[#0a0e1a]"],
        "card": ["bg-[#0f1629]", "bg-[#0f1629]/80"],
        "input": ["bg-[#1a2332]", "bg-slate-800"],
        "header": ["bg-[#0f1629]/80"],
        "sidebar": ["bg-slate-900"],
        "table_header": ["bg-[#1a2332]/80"],
    },

    # Bordas
    "borders": {
        "cyan_subtle": "border-cyan-500/10",
        "cyan_medium": "border-cyan-500/20",
        "cyan_strong": "border-cyan-500/30",
        "sidebar": "border-slate-700",
    },

    # Cores de texto
    "text_colors": {
        "primary": ["text-white", "text-cyan-400"],
        "secondary": ["text-slate-400", "text-slate-300"],
        "tertiary": ["text-slate-500"],
        "success": ["text-green-400", "text-green-500"],
        "warning": ["text-yellow-400", "text-yellow-500"],
        "danger": ["text-red-400", "text-red-500"],
    },

    # Rounded
    "rounded": {
        "small": ["rounded-md", "rounded-lg"],
        "medium": ["rounded-xl"],
        "large": ["rounded-2xl"],
    },

    # Gradientes de titulo
    "title_gradient": "bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent",

    # Shadows
    "shadows": {
        "glow_subtle": "shadow-[0_0_30px_rgba(0,255,255,0.05)]",
        "glow_strong": "shadow-[0_0_20px_rgba(0,255,255,0.4)]",
    },

    # Hovers
    "hovers": {
        "card": "hover:bg-cyan-500/5",
        "button": "hover:bg-cyan-500/10",
        "border": "hover:border-cyan-500/40",
    },

    # Icon sizes
    "icon_sizes": {
        "small": "h-4 w-4",
        "medium": "h-5 w-5",
        "large": "h-6 w-6",
    },
}

# Padroes incorretos comuns
INCORRECT_PATTERNS = [
    # Backgrounds incorretos
    (r'bg-gray-\d+', 'Usar bg-slate-XXX ou bg-[#HEXCODE]'),
    (r'bg-zinc-\d+', 'Usar bg-slate-XXX ou bg-[#HEXCODE]'),
    (r'bg-neutral-\d+', 'Usar bg-slate-XXX ou bg-[#HEXCODE]'),

    # Cores de texto incorretas
    (r'text-gray-\d+', 'Usar text-slate-XXX'),
    (r'text-zinc-\d+', 'Usar text-slate-XXX'),

    # Bordas incorretas
    (r'border-gray-\d+', 'Usar border-slate-XXX ou border-cyan-500/XX'),
    (r'border-zinc-\d+', 'Usar border-slate-XXX ou border-cyan-500/XX'),

    # Focus incorreto
    (r'focus:ring-blue-\d+', 'Usar focus:ring-cyan-500/XX'),
    (r'focus:border-blue-\d+', 'Usar focus:border-cyan-500/XX'),
]

# Padroes obrigatorios por tipo de componente
REQUIRED_PATTERNS = {
    "Page": [
        (r'min-h-screen', 'Pagina deve ter min-h-screen'),
        (r'bg-\[#0a0e1a\]', 'Pagina deve ter background #0a0e1a'),
    ],
    "Header": [
        (r'bg-\[#0f1629\]/80', 'Header deve ter bg-[#0f1629]/80'),
        (r'backdrop-blur', 'Header deve ter backdrop-blur'),
        (r'border-cyan-500/10', 'Header deve ter border-cyan-500/10'),
    ],
    "Card": [
        (r'rounded-(xl|2xl)', 'Card deve ter rounded-xl ou rounded-2xl'),
        (r'border-cyan-500/\d+', 'Card deve ter borda cyan'),
    ],
    "Table": [
        (r'bg-\[#1a2332\]', 'Header de tabela deve ter bg-[#1a2332]'),
        (r'hover:bg-cyan-500/5', 'Linhas devem ter hover:bg-cyan-500/5'),
    ],
    "Input": [
        (r'bg-\[#1a2332\]|bg-slate-800', 'Input deve ter bg correto'),
        (r'border-cyan-500/\d+|border-slate-700', 'Input deve ter borda correta'),
    ],
    "Button": [
        (r'rounded-(md|lg|xl)', 'Botao deve ter rounded'),
        (r'transition', 'Botao deve ter transition'),
    ],
}


@dataclass
class Issue:
    line: int
    column: int
    severity: str  # "critical", "minor", "suggestion"
    message: str
    found: str
    expected: str


@dataclass
class AuditResult:
    file_path: str
    component_type: str
    total_lines: int
    conformance_score: float
    critical_issues: List[Issue] = field(default_factory=list)
    minor_issues: List[Issue] = field(default_factory=list)
    suggestions: List[Issue] = field(default_factory=list)
    conformities: List[str] = field(default_factory=list)


def detect_component_type(content: str, filename: str) -> str:
    """Detecta o tipo de componente baseado no conteudo e nome"""
    filename_lower = filename.lower()

    if "page" in filename_lower:
        return "Page"
    if "header" in filename_lower:
        return "Header"
    if "sidebar" in filename_lower:
        return "Sidebar"
    if "modal" in filename_lower:
        return "Modal"
    if "card" in filename_lower:
        return "Card"
    if "table" in filename_lower:
        return "Table"
    if "input" in filename_lower:
        return "Input"
    if "button" in filename_lower:
        return "Button"
    if "tab" in filename_lower:
        return "Tab"

    # Detectar por conteudo
    if "min-h-screen" in content:
        return "Page"
    if "<header" in content.lower() or "Header" in content:
        return "Header"
    if "<table" in content.lower():
        return "Table"

    return "Component"


def audit_file(file_path: str) -> AuditResult:
    """Audita um arquivo TSX/JSX contra as regras de design"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    filename = os.path.basename(file_path)
    component_type = detect_component_type(content, filename)

    result = AuditResult(
        file_path=file_path,
        component_type=component_type,
        total_lines=len(lines),
        conformance_score=100.0,
    )

    # Verificar padroes incorretos
    for line_num, line in enumerate(lines, 1):
        for pattern, message in INCORRECT_PATTERNS:
            matches = re.finditer(pattern, line)
            for match in matches:
                result.critical_issues.append(Issue(
                    line=line_num,
                    column=match.start(),
                    severity="critical",
                    message=message,
                    found=match.group(),
                    expected="Ver design-rules.md",
                ))

    # Verificar padroes obrigatorios para o tipo de componente
    if component_type in REQUIRED_PATTERNS:
        for pattern, message in REQUIRED_PATTERNS[component_type]:
            if not re.search(pattern, content):
                result.minor_issues.append(Issue(
                    line=0,
                    column=0,
                    severity="minor",
                    message=message,
                    found="Nao encontrado",
                    expected=pattern,
                ))

    # Verificar conformidades positivas
    if re.search(r'bg-\[#0f1629\]', content):
        result.conformities.append("Background de card correto")
    if re.search(r'border-cyan-500/\d+', content):
        result.conformities.append("Bordas cyan corretas")
    if re.search(r'text-cyan-400', content):
        result.conformities.append("Cor de destaque cyan correta")
    if re.search(r'text-slate-\d+', content):
        result.conformities.append("Cores de texto slate corretas")
    if re.search(r'rounded-(xl|2xl)', content):
        result.conformities.append("Border radius correto")
    if re.search(r'transition', content):
        result.conformities.append("Transicoes implementadas")
    if re.search(r'hover:', content):
        result.conformities.append("Estados de hover implementados")

    # Verificar gradiente de titulo
    if component_type in ["Page", "Header"]:
        if re.search(r'from-cyan-400.*via-green-400.*to-yellow-400', content):
            result.conformities.append("Gradiente de titulo correto")
        elif re.search(r'text-2xl.*font-bold', content):
            result.suggestions.append(Issue(
                line=0,
                column=0,
                severity="suggestion",
                message="Considerar usar gradiente de titulo",
                found="Titulo sem gradiente",
                expected="bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent",
            ))

    # Calcular score de conformidade
    total_checks = (
        len(REQUIRED_PATTERNS.get(component_type, [])) +
        len(result.conformities) +
        len(result.critical_issues) +
        len(result.minor_issues)
    )

    if total_checks > 0:
        penalties = (
            len(result.critical_issues) * 10 +
            len(result.minor_issues) * 3
        )
        result.conformance_score = max(0, 100 - penalties)

    return result


def generate_report(results: List[AuditResult], output_file: Optional[str] = None) -> str:
    """Gera relatorio de auditoria em Markdown"""

    total_critical = sum(len(r.critical_issues) for r in results)
    total_minor = sum(len(r.minor_issues) for r in results)
    total_suggestions = sum(len(r.suggestions) for r in results)
    avg_conformance = sum(r.conformance_score for r in results) / len(results) if results else 0

    report = f"""# Auditoria de Design - FIA

> Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Resumo Executivo

| Metrica | Valor |
|---------|-------|
| Arquivos Auditados | {len(results)} |
| Conformidade Media | {avg_conformance:.1f}% |
| Desvios Criticos | {total_critical} |
| Desvios Menores | {total_minor} |
| Sugestoes | {total_suggestions} |

## Status Geral

"""

    if avg_conformance >= 95:
        report += "**EXCELENTE** - Sistema em alta conformidade com o Design System.\n\n"
    elif avg_conformance >= 85:
        report += "**BOM** - Sistema em boa conformidade, pequenos ajustes necessarios.\n\n"
    elif avg_conformance >= 70:
        report += "**ATENCAO** - Sistema precisa de revisao de design.\n\n"
    else:
        report += "**CRITICO** - Sistema com muitos desvios do Design System.\n\n"

    # Detalhe por arquivo
    report += "## Detalhamento por Arquivo\n\n"

    for result in sorted(results, key=lambda r: r.conformance_score):
        status_emoji = "" if result.conformance_score >= 90 else "" if result.conformance_score >= 70 else ""

        report += f"### {status_emoji} {os.path.basename(result.file_path)}\n\n"
        report += f"- **Tipo**: {result.component_type}\n"
        report += f"- **Conformidade**: {result.conformance_score:.1f}%\n"
        report += f"- **Linhas**: {result.total_lines}\n\n"

        if result.conformities:
            report += "**Conformidades:**\n"
            for conf in result.conformities:
                report += f"- [x] {conf}\n"
            report += "\n"

        if result.critical_issues:
            report += "**Desvios Criticos:**\n"
            for issue in result.critical_issues:
                report += f"- **[Linha {issue.line}]** {issue.message}\n"
                report += f"  - Encontrado: `{issue.found}`\n"
                report += f"  - Esperado: `{issue.expected}`\n"
            report += "\n"

        if result.minor_issues:
            report += "**Desvios Menores:**\n"
            for issue in result.minor_issues:
                report += f"- {issue.message}\n"
            report += "\n"

        if result.suggestions:
            report += "**Sugestoes:**\n"
            for issue in result.suggestions:
                report += f"- {issue.message}\n"
            report += "\n"

        report += "---\n\n"

    # Recomendacoes gerais
    report += """## Recomendacoes

### Correcoes Prioritarias
1. Corrigir todos os desvios criticos imediatamente
2. Revisar backgrounds que usam gray/zinc (trocar por slate ou #HEXCODE)
3. Padronizar bordas com cyan-500/XX

### Proximos Passos
1. Executar auditoria apos cada commit
2. Incluir resultado de auditoria em PRs
3. Atualizar design-rules.md conforme necessario

## Referencias

- Design Rules: `.claude/design-rules.md`
- Componentes de Referencia:
  - `src/pages/UserRegistryPage.tsx`
  - `src/pages/RGFPage.tsx`
  - `src/components/reports/tabs/rgf/DespesaPessoalTab.tsx`
"""

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Relatorio salvo em: {output_file}")

    return report


def main():
    """Funcao principal"""
    import argparse

    parser = argparse.ArgumentParser(description='FIA Design Audit')
    parser.add_argument('files', nargs='*', help='Arquivos para auditar')
    parser.add_argument('--all', action='store_true', help='Auditar todas as paginas')
    parser.add_argument('--output', '-o', help='Arquivo de saida para o relatorio')
    parser.add_argument('--json', action='store_true', help='Saida em JSON')

    args = parser.parse_args()

    # Determinar diretorio base
    base_dir = Path(__file__).parent.parent.parent.parent
    src_dir = base_dir / "src"

    files_to_audit = []

    if args.all:
        # Auditar todas as paginas e componentes principais
        patterns = [
            "src/pages/*.tsx",
            "src/components/layout/*.tsx",
            "src/components/reports/*.tsx",
            "src/components/reports/tabs/**/*.tsx",
        ]
        for pattern in patterns:
            files_to_audit.extend(base_dir.glob(pattern))
    elif args.files:
        files_to_audit = [Path(f) for f in args.files]
    else:
        # Auditar paginas por padrao
        files_to_audit = list((src_dir / "pages").glob("*.tsx"))

    if not files_to_audit:
        print("Nenhum arquivo encontrado para auditar.")
        print("Use --all para auditar todo o sistema ou especifique arquivos.")
        sys.exit(1)

    print(f"Auditando {len(files_to_audit)} arquivos...\n")

    results = []
    for file_path in files_to_audit:
        if file_path.exists():
            print(f"  Auditando: {file_path.name}")
            result = audit_file(str(file_path))
            results.append(result)

    print()

    if args.json:
        # Saida em JSON
        output = {
            "timestamp": datetime.now().isoformat(),
            "total_files": len(results),
            "average_conformance": sum(r.conformance_score for r in results) / len(results) if results else 0,
            "results": [
                {
                    "file": r.file_path,
                    "type": r.component_type,
                    "conformance": r.conformance_score,
                    "critical_issues": len(r.critical_issues),
                    "minor_issues": len(r.minor_issues),
                }
                for r in results
            ]
        }
        print(json.dumps(output, indent=2))
    else:
        # Relatorio em Markdown
        report = generate_report(results, args.output)
        if not args.output:
            print(report)


if __name__ == "__main__":
    main()
