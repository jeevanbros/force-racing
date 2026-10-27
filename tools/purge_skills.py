import os
import shutil
from pathlib import Path

ALLOWED_SKILLS = {
    # Web Design & Interface Guidelines
    "web-design-guidelines",
    "gale-design",
    "gale-presenter",
    
    # Web Motion & Animations (GSAP)
    "gsap-core",
    "gsap-timeline",
    "gsap-scrolltrigger",
    "gsap-performance",
    "gsap-plugins",
    "gsap-utils",
    "gsap-frameworks",
    "gsap-react",
    
    # Launch Video & Hyperframes
    "brag",
    "brag-slim",
    "hyperframes",
    "hyperframes-animation",
    "hyperframes-audio",
    "hyperframes-cli",
    "hyperframes-core",
    "hyperframes-creative",
    "hyperframes-keyframes",
    "hyperframes-registry",
    "hyperframes-studio",
    "media-use",
    "motion-graphics",
    
    # Parallel Orchestration
    "herdr"
}

TARGET_SKILL_DIRS = [
    Path.home() / ".agents" / "skills",
    Path.home() / ".gemini" / "antigravity-cli" / "skills",
    Path(__file__).resolve().parent.parent / ".agents" / "skills",
    Path(__file__).resolve().parent.parent / ".gemini" / "skills",
]

deleted_skills = set()
retained_skills = set()

for sdir in TARGET_SKILL_DIRS:
    if not sdir.exists():
        continue
    for child in list(sdir.iterdir()):
        if child.is_dir():
            if child.name not in ALLOWED_SKILLS:
                shutil.rmtree(child)
                deleted_skills.add(child.name)
            else:
                retained_skills.add(child.name)

print("Purge completed successfully.")
print(f"Retained skills ({len(retained_skills)}):", sorted(list(retained_skills)))
print(f"Deleted skills ({len(deleted_skills)}):", sorted(list(deleted_skills)))
