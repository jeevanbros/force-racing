#!/usr/bin/env python3
"""
Package all workspace skills and Galeport / Antigravity capabilities
into the project and the USB pen drive for Windows portability.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
USB_ROOT = Path('/Volumes/FORCERACING')

source_skills_map = {}

# 1. ~/.claude/skills
claude_skills = Path.home() / '.claude/skills'
if claude_skills.exists():
    for p in claude_skills.iterdir():
        if p.name.startswith('.'): continue
        target = p.resolve()
        if target.is_dir() and (target / 'SKILL.md').exists():
            source_skills_map[p.name] = target

# 2. Galeport skills
galeport_skills = Path.home() / 'Documents/Work/Galeport/AI/skills'
if galeport_skills.exists():
    for sub in galeport_skills.glob('**/*'):
        if sub.is_dir() and (sub / 'SKILL.md').exists():
            source_skills_map[sub.name] = sub

# 3. .gemini skills
gemini_skills = Path.home() / '.gemini/antigravity-cli/skills'
if gemini_skills.exists():
    for sub in gemini_skills.iterdir():
        if sub.name.startswith('.'): continue
        target = sub.resolve()
        if target.is_dir() and (target / 'SKILL.md').exists() and 'movie-downloader' not in target.name:
            source_skills_map[sub.name] = target

print(f'Discovered {len(source_skills_map)} skills to package.')

# Targets:
# A. Project .gemini/skills and .agents/skills (local)
targets = [
    ROOT / '.gemini/skills',
    ROOT / '.agents/skills',
]

if USB_ROOT.exists():
    targets.extend([
        USB_ROOT / 'skills',
        USB_ROOT / 'force-racing-revival/.gemini/skills',
        USB_ROOT / 'force-racing-revival/.agents/skills',
    ])

def ignore_patterns(path, names):
    return [n for n in names if n in ['.DS_Store', '__pycache__', '.git', '.trash'] or n.startswith('._')]

for target_dir in targets:
    target_dir.mkdir(parents=True, exist_ok=True)
    print(f'Copying skills to {target_dir}...')
    for name, src in source_skills_map.items():
        dst = target_dir / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, symlinks=False, ignore=ignore_patterns)

print('Skills packaging complete across all targets!')
