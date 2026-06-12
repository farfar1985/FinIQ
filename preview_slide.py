"""
Render a mock preview of how slide N will look in PowerPoint, using PIL.
Replicates the same layout math as build_demo_deck.py to give a visual sanity check.

Usage: python preview_slide.py <slide_index_1based>
"""

import sys
from PIL import Image, ImageDraw, ImageFont
import os

SHOTS_DIR = r"C:\Users\farza\Desktop\new screenshots\demo-screenshots"

SLIDES = [
    ("step-01-home-portal",              "1",   "Home portal"),
    ("step-02a-spec-new",                "2a",  "Spec Agent entry — natural-language intent"),
    ("step-02b-projects-new",            "2b",  "Structured project creation"),
    ("step-02c-import-from-repo",        "2c",  "Import from repository"),
    ("step-03-spec-finiq",               "3",   "Decision Point — alternatives with trade-offs"),
    ("step-04-version-history",          "4",   "Living specification, gaps, version history"),
    ("step-05-route-esignature-modal",   "5",   "Route specification for e-signature"),
    ("step-06a-approve-page",            "6a",  "Authorized approver view"),
    ("step-06b-signature-recorded",      "6b",  "Signature recorded"),
    ("step-07-canvas-preview",           "7",   "Open Canvas — three-panel workspace"),
    ("step-08a-enlarge-chart-clicked",   "8a",  "Build Agent — enlarge chart"),
    ("step-08b-working-capital-added",   "8b",  "Build Agent — add Working Capital KPI"),
    ("step-09a-resources-tab",           "9a",  "Resources tab — bound primitives"),
    ("step-09b-add-resource-drawer",     "9b",  "Add to App — Skills"),
    ("step-09c-add-companion-agent",     "9c",  "Add to App — Companion Agents"),
    ("step-09d-add-knowledge",           "9d",  "Add to App — Knowledge files"),
    ("step-10-compliance-matrix",        "10",  "Compliance Matrix"),
    ("step-11a-deploy-publish",          "11a", "Deploy — Publish details"),
    ("step-11b-deploy-compliance",       "11b", "Deploy — Compliance & Governance"),
    ("step-11c-deploy-environment",      "11c", "Deploy — Environment"),
    ("step-11d-deploy-approval",         "11d", "Deploy — Approval & e-signature"),
    ("step-11e-deploy-progress",         "11e", "Deploying…"),
    ("step-12a-skills",                  "12a", "Skills marketplace"),
    ("step-12b-skills-app-agents",       "12b", "Apps Become Agents"),
    ("step-12c-skills-bottom",           "12c", "Skills marketplace — full catalog"),
    ("step-13a-ask-amira-drawer",        "13a", "Ask Amira — FinIQ Agent (Q3 Petcare)"),
    ("step-13b-ask-amira-nestle",        "13b", "Ask Amira — comparison vs Nestlé"),
    ("step-14-project-finiq",            "14",  "Project FinIQ — lineage and audit"),
]

# Render at 96 DPI: 13.333" x 7.5" → 1280x720 px. Use 144 DPI for sharper preview.
DPI = 144
SLIDE_W_PX = int(13.333 * DPI)  # 1920
SLIDE_H_PX = int(7.5 * DPI)     # 1080
HEADER_H_PX = int(0.85 * DPI)
HEADER_PAD_LEFT_PX = int(0.6 * DPI)

IMG_AREA_TOP_PX = HEADER_H_PX + int(0.1 * DPI)
IMG_AREA_LEFT_PX = int(0.4 * DPI)
IMG_AREA_W_PX = SLIDE_W_PX - 2 * IMG_AREA_LEFT_PX
IMG_AREA_H_PX = SLIDE_H_PX - IMG_AREA_TOP_PX - int(0.3 * DPI)

CHARCOAL = (0x36, 0x45, 0x4F)
WHITE = (0xFF, 0xFF, 0xFF)


def render_slide(idx_1based, out_path):
    stem, step_num, step_title = SLIDES[idx_1based - 1]
    img_path = os.path.join(SHOTS_DIR, f"{stem}.png")

    canvas = Image.new("RGB", (SLIDE_W_PX, SLIDE_H_PX), WHITE)
    draw = ImageDraw.Draw(canvas)

    # Header band
    draw.rectangle([(0, 0), (SLIDE_W_PX, HEADER_H_PX)], fill=CHARCOAL)

    # Header text
    try:
        font_step = ImageFont.truetype("C:/Windows/Fonts/calibrib.ttf", int(22 * DPI / 72))
        font_title = ImageFont.truetype("C:/Windows/Fonts/calibri.ttf", int(22 * DPI / 72))
    except OSError:
        font_step = ImageFont.load_default()
        font_title = ImageFont.load_default()

    step_text = f"Step {step_num}"
    sx = HEADER_PAD_LEFT_PX
    sy = HEADER_H_PX // 2

    # Vertically center text — use anchor "lm" if supported
    draw.text((sx, sy), step_text, fill=WHITE, font=font_step, anchor="lm")
    bbox = draw.textbbox((sx, sy), step_text, font=font_step, anchor="lm")
    sx2 = bbox[2] + int(0.3 * DPI)
    draw.text((sx2, sy), step_title, fill=WHITE, font=font_title, anchor="lm")

    # Image — scaled to fit
    with Image.open(img_path) as im:
        im = im.convert("RGB")
        px_w, px_h = im.size
        aspect = px_w / px_h
        area_aspect = IMG_AREA_W_PX / IMG_AREA_H_PX
        if aspect > area_aspect:
            fit_w_px = IMG_AREA_W_PX
            fit_h_px = int(IMG_AREA_W_PX / aspect)
        else:
            fit_h_px = IMG_AREA_H_PX
            fit_w_px = int(IMG_AREA_H_PX * aspect)
        im_resized = im.resize((fit_w_px, fit_h_px), Image.LANCZOS)
        left = IMG_AREA_LEFT_PX + (IMG_AREA_W_PX - fit_w_px) // 2
        top = IMG_AREA_TOP_PX + (IMG_AREA_H_PX - fit_h_px) // 2
        canvas.paste(im_resized, (left, top))

    canvas.save(out_path, quality=85)
    print(f"  wrote: {out_path}")


def main():
    # Render a few representative slides
    for idx in [1, 5, 10, 17, 22, 28]:
        out = rf"C:\Users\farza\Desktop\preview_slide_{idx:02d}.jpg"
        render_slide(idx, out)


if __name__ == "__main__":
    main()
