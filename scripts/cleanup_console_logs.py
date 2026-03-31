#!/usr/bin/env python3
"""
Replaces console.log/error/warn/debug/info calls with secureLogger equivalents
across the hacCare TypeScript/TSX codebase.

Exclusions:
- src/lib/security/secureLogger.ts  (the logger itself)
- src/lib/security/securityHeaders.ts  (intentional console usage for CSP monitoring)
- src/config/environment.ts  (implements its own appLogger abstraction using console)
"""

import os
import re
from pathlib import Path

WORKSPACE = Path('/workspaces/hacCare/src')
SECURE_LOGGER_PATH = WORKSPACE / 'lib' / 'security' / 'secureLogger.ts'

EXCLUDED_FILES = {
    str((WORKSPACE / 'lib' / 'security' / 'secureLogger.ts').resolve()),
    str((WORKSPACE / 'lib' / 'security' / 'securityHeaders.ts').resolve()),
    str((WORKSPACE / 'config' / 'environment.ts').resolve()),
}

CONSOLE_PATTERN = re.compile(r'\bconsole\.(log|error|warn|debug|info)\b')


def get_relative_import_path(file_path: Path) -> str:
    """Compute the relative import path from file to secureLogger (without .ts)."""
    rel_dir = os.path.relpath(SECURE_LOGGER_PATH.parent, file_path.parent)
    return f"{rel_dir}/{SECURE_LOGGER_PATH.stem}".replace('\\', '/')


def has_secure_logger_import(content: str) -> bool:
    return 'secureLogger' in content


def add_import(content: str, import_path: str) -> str:
    """Add secureLogger import after the last top-level import statement."""
    import_line = f"import {{ secureLogger }} from '{import_path}';"
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and not stripped.startswith('import type'):
            last_import_idx = i
        elif stripped.startswith('import type '):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
        return '\n'.join(lines)
    else:
        return import_line + '\n' + content


def replace_console_calls(content: str) -> tuple:
    """Replace console.* calls with secureLogger.* equivalents."""
    mapping = {
        'log': 'debug',
        'error': 'error',
        'warn': 'warn',
        'debug': 'debug',
        'info': 'info',
    }
    total = 0

    def replace_match(m):
        nonlocal total
        total += 1
        return f'secureLogger.{mapping[m.group(1)]}'

    new_content = CONSOLE_PATTERN.sub(replace_match, content)
    return new_content, total


def process_file(file_path: Path) -> tuple:
    """Process a single file. Returns (modified: bool, num_replacements: int)."""
    abs_path = str(file_path.resolve())
    if abs_path in EXCLUDED_FILES:
        return False, 0

    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"  ERROR reading {file_path}: {e}")
        return False, 0

    if not CONSOLE_PATTERN.search(content):
        return False, 0

    new_content, num_replacements = replace_console_calls(content)

    if num_replacements == 0:
        return False, 0

    if not has_secure_logger_import(new_content):
        import_path = get_relative_import_path(file_path)
        new_content = add_import(new_content, import_path)

    try:
        file_path.write_text(new_content, encoding='utf-8')
    except Exception as e:
        print(f"  ERROR writing {file_path}: {e}")
        return False, 0

    return True, num_replacements


def main():
    total_files = 0
    total_replacements = 0
    modified_files = []

    for ext in ['*.ts', '*.tsx']:
        for file_path in sorted(WORKSPACE.rglob(ext)):
            modified, replacements = process_file(file_path)
            if modified:
                total_files += 1
                total_replacements += replacements
                rel = str(file_path.relative_to(WORKSPACE.parent))
                modified_files.append((rel, replacements))

    print(f"\n✅ Console cleanup complete!")
    print(f"   Files modified: {total_files}")
    print(f"   Total replacements: {total_replacements}")
    print(f"\nModified files:")
    for f, n in modified_files:
        print(f"  {f} ({n} replacement{'s' if n != 1 else ''})")


if __name__ == '__main__':
    main()
