#!/usr/bin/env python3
'''Update HARNESS_COOKIE values (and optionally Playwright storage state).'''

import argparse
import subprocess
import sys
from pathlib import Path

HOME = Path.home()
AGENTS_ENV = HOME / 'websites' / 'dexter-agents' / '.env'
MCP_ENV = HOME / 'websites' / 'dexter-mcp' / '.env'
STATE_FILE = HOME / 'websites' / 'dexter-mcp' / 'state.json'


def update_env_file(path: Path, value: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f'Env file not found: {path}')
    lines = path.read_text().splitlines()
    replaced = False
    for i, line in enumerate(lines):
        if line.startswith('HARNESS_COOKIE='):
            lines[i] = f'HARNESS_COOKIE={value}'
            replaced = True
            break
    if not replaced:
        lines.append(f'HARNESS_COOKIE={value}')
    path.write_text('\n'.join(lines) + '\n')


def ensure_storage_state_line(path: Path, state_path: Path) -> None:
    lines = path.read_text().splitlines()
    target = f'HARNESS_STORAGE_STATE={state_path}'
    for i, line in enumerate(lines):
        if line.startswith('HARNESS_STORAGE_STATE='):
            lines[i] = target
            break
    else:
        lines.append(target)
    path.write_text('\n'.join(lines) + '\n')


def run_storage_export(prompt: str) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        'npm', 'run', 'dexchat', '--',
        '--prompt', prompt,
        '--storage', str(STATE_FILE),
        '--no-artifact',
    ]
    subprocess.run(cmd, cwd=str(HOME / 'websites' / 'dexter-agents'), check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description='Update HARNESS_COOKIE across repos.')
    parser.add_argument('--value', help='URL-encoded HARNESS_COOKIE value')
    parser.add_argument('--stdin', action='store_true', help='Read value from STDIN')
    parser.add_argument('--refresh-storage', action='store_true', help='Regenerate Playwright storage state after updating env')
    parser.add_argument('--prompt', default='Resolve my wallet', help='Prompt to use when regenerating storage state')
    args = parser.parse_args()

    if args.stdin:
        stdin_value = sys.stdin.read().strip()
        if stdin_value:
            value = stdin_value
        else:
            raise SystemExit('No data received on STDIN.')
    elif args.value:
        value = args.value.strip()
    else:
        try:
            value = input('Paste URL-encoded HARNESS_COOKIE: ').strip()
        except EOFError:
            value = ''
        if not value:
            raise SystemExit('HARNESS_COOKIE value is required; rerun with --value, --stdin, or provide input when prompted.')

    if not value:
        raise SystemExit('Empty value provided for HARNESS_COOKIE.')

    check_value = value.lower()
    if '-refresh-token=' not in check_value and 'refresh-token%3d' not in check_value:
        print('WARNING: HARNESS_COOKIE value does not include an sb-...-refresh-token entry.\n'
              'Per-user MCP JWT minting will fail until the refresh token is present.', file=sys.stderr)
    update_env_file(AGENTS_ENV, value)
    update_env_file(MCP_ENV, value)
    ensure_storage_state_line(MCP_ENV, STATE_FILE)

    print('Updated HARNESS_COOKIE in:')
    print(f'  - {AGENTS_ENV}')
    print(f'  - {MCP_ENV}')

    if args.refresh_storage:
        print('Regenerating Playwright storage state...')
        run_storage_export(args.prompt)
        print(f'Storage state written to {STATE_FILE}')


if __name__ == '__main__':
    main()
