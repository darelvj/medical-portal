"""Render the adjacent Markdown interview sheet to PDF with ReportLab.

Install ReportLab in your Python environment to rerender: pip install reportlab
This script only reads the Markdown source and writes the adjacent PDF.
"""

from html import escape
from pathlib import Path
import re
import sys

try:
    from reportlab.lib import colors
except ImportError:
    sys.path.insert(0, "/tmp/medical-portal-pdf-libs")
    from reportlab.lib import colors

from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, HRFlowable


SOURCE = Path(__file__).with_name("interview-cheat-sheet.md")
OUTPUT = SOURCE.with_suffix(".pdf")

font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
bold_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
if font_path.exists() and bold_path.exists():
    pdfmetrics.registerFont(TTFont("DejaVu", str(font_path)))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(bold_path)))
    pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold")
    font = "DejaVu"
    bold = "DejaVu-Bold"
else:
    font = "Helvetica"
    bold = "Helvetica-Bold"

ink = colors.HexColor("#14213d")
muted = colors.HexColor("#49566b")
accent = colors.HexColor("#155fc8")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="SheetTitle", fontName=bold, fontSize=19, leading=25, textColor=ink, spaceAfter=12))
styles.add(ParagraphStyle(name="SheetHeading", fontName=bold, fontSize=12.2, leading=17, textColor=accent, spaceBefore=18, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name="SheetBody", fontName=font, fontSize=9.2, leading=14.4, textColor=ink, spaceAfter=7))
styles.add(ParagraphStyle(name="SheetQA", parent=styles["SheetBody"], leftIndent=7, borderColor=colors.HexColor("#d9e7fc"), borderPadding=6, borderWidth=0.5, spaceAfter=7))
styles.add(ParagraphStyle(name="SheetBullet", parent=styles["SheetBody"], leftIndent=14, firstLineIndent=-9, bulletIndent=3))
styles.add(ParagraphStyle(name="SheetCode", fontName="Courier", fontSize=7.8, leading=11.5, textColor=muted, leftIndent=9, spaceBefore=2, spaceAfter=9))


def inline_markup(value: str) -> str:
    value = escape(value)
    value = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"`([^`]+)`", r"<font color='#155fc8'>\1</font>", value)
    return value


def add_paragraph(story, text):
    if text.startswith("Q: "):
        match = re.match(r"Q: (.+?) A: (.+)", text)
        if match:
            question, answer = match.groups()
            story.append(Paragraph(f"<b>Q: {inline_markup(question)}</b><br/>A: {inline_markup(answer)}", styles["SheetQA"]))
            return
    story.append(Paragraph(inline_markup(text), styles["SheetBody"]))


def build_story(source: str):
    story = []
    paragraph = []
    code = []
    in_code = False

    def flush_paragraph():
        if paragraph:
            add_paragraph(story, " ".join(paragraph))
            paragraph.clear()

    for raw in source.splitlines():
        line = raw.strip()
        if line.startswith("```"):
            flush_paragraph()
            if in_code:
                story.append(Preformatted("\n".join(code), styles["SheetCode"]))
                code.clear()
            in_code = not in_code
            continue
        if in_code:
            code.append(raw)
            continue
        if not line:
            flush_paragraph()
        elif line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), styles["SheetTitle"]))
            story.append(HRFlowable(width="100%", thickness=1.5, color=accent, spaceAfter=10))
        elif line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[3:]), styles["SheetHeading"]))
        elif re.match(r"^(?:- |\d+\. )", line):
            flush_paragraph()
            bullet = re.sub(r"^(?:- |\d+\. )", "", line)
            story.append(Paragraph("• " + inline_markup(bullet), styles["SheetBullet"]))
        elif line.startswith("Q: "):
            flush_paragraph()
            add_paragraph(story, line)
        else:
            paragraph.append(line)
    flush_paragraph()
    return story


def page_decoration(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#d9e1ec"))
    canvas.line(43, 42, width - 43, 42)
    canvas.setFont(font, 7.5)
    canvas.setFillColor(muted)
    canvas.drawString(44, 29, "Medical Portal  |  Interview preparation  |  Fictional-data demo")
    canvas.drawRightString(width - 44, 29, str(document.page))
    canvas.restoreState()


def main():
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=44, bottomMargin=57,
                            title="Medical Portal - Interview Cheat Sheet", author="Medical Portal project")
    doc.build(build_story(SOURCE.read_text(encoding="utf-8")), onFirstPage=page_decoration, onLaterPages=page_decoration)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
