from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "ShowroomOS_Product_Priorities_UI_Reference.pdf"

NAVY = colors.HexColor("#0D2D4D")
NAVY_2 = colors.HexColor("#183B60")
INK = colors.HexColor("#17212B")
MUTED = colors.HexColor("#647384")
PAPER = colors.HexColor("#F7F5F0")
SURFACE = colors.HexColor("#FFFFFF")
BORDER = colors.HexColor("#E3E0D9")
SAND = colors.HexColor("#F1ECE3")
PEACH = colors.HexColor("#F8E8E0")
BLUE = colors.HexColor("#E7EFF8")
GREEN = colors.HexColor("#D9ECE4")
GOLD = colors.HexColor("#F8ECD5")
PURPLE = colors.HexColor("#F2EBF9")
ACCENT = colors.HexColor("#C96C45")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ShowKicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="ShowTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=34, textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="ShowH1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=25, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="ShowH2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=NAVY, spaceBefore=5, spaceAfter=4))
styles.add(ParagraphStyle(name="ShowLead", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=17, textColor=MUTED, spaceAfter=10))
styles.add(ParagraphStyle(name="ShowBody", parent=styles["Normal"], fontName="Helvetica", fontSize=9.2, leading=13.7, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="ShowBullet", parent=styles["Normal"], fontName="Helvetica", fontSize=8.9, leading=13.1, leftIndent=10, firstLineIndent=-8, textColor=INK, spaceAfter=2))
styles.add(ParagraphStyle(name="ShowSmall", parent=styles["Normal"], fontName="Helvetica", fontSize=7.9, leading=10.7, textColor=MUTED))
styles.add(ParagraphStyle(name="ShowTableHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name="ShowTableCell", parent=styles["Normal"], fontName="Helvetica", fontSize=7.7, leading=10.2, textColor=INK))


def p(text, style="ShowBody"):
    return Paragraph(escape(text).replace("\n", "<br/>"), styles[style])


def rich(text, style="ShowBody"):
    return Paragraph(text.replace("\n", "<br/>"), styles[style])


def bullet(text):
    return Paragraph("- " + escape(text), styles["ShowBullet"])


class MobileReference(Flowable):
    """A vector UI reference, intentionally implementation-ready rather than photorealistic."""

    def __init__(self, screen):
        super().__init__()
        self.screen = screen
        self.width = 83 * mm
        self.height = 150 * mm

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def _box(self, c, x, top, w, h, fill=SURFACE, stroke=BORDER, radius=7, line=0.7):
        c.setFillColor(fill)
        c.setStrokeColor(stroke)
        c.setLineWidth(line)
        c.roundRect(x, self.height - top - h, w, h, radius, fill=1, stroke=1)

    def _line(self, c, x1, top1, x2, top2, color=BORDER, line=0.8):
        c.setStrokeColor(color)
        c.setLineWidth(line)
        c.line(x1, self.height - top1, x2, self.height - top2)

    def _text(self, c, x, top, text, size=7.5, color=INK, bold=False):
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(x, self.height - top - size, text)

    def _multi(self, c, x, top, lines, size=6.5, color=MUTED, bold=False, leading=8.3):
        for index, line in enumerate(lines):
            self._text(c, x, top + index * leading, line, size, color, bold)

    def _pill(self, c, x, top, text, fill=BLUE, text_color=NAVY, w=None):
        width = w or max(31, len(text) * 3.9 + 12)
        self._box(c, x, top, width, 13, fill, fill, 6.5, 0)
        self._text(c, x + 6, top + 3.1, text, 5.8, text_color, True)
        return width

    def _header(self, c, title, subtitle="Showroom workspace"):
        self._box(c, 7, 7, self.width - 14, 34, SURFACE, BORDER, 8)
        self._box(c, 14, 13, 20, 20, NAVY, NAVY, 6, 0)
        self._text(c, 20, 18, "[]", 7, colors.white, True)
        self._text(c, 40, 15, title, 8.2, NAVY, True)
        self._text(c, 40, 25, subtitle, 5.9, MUTED)
        self._text(c, self.width - 40, 18, "EN", 6, MUTED, True)
        self._text(c, self.width - 24, 18, "o", 8, ACCENT, True)

    def _bottom_nav(self, c, active="Home"):
        nav_top = self.height - 30
        self._box(c, 7, nav_top, self.width - 14, 23, SURFACE, BORDER, 8)
        items = [("Home", 23), ("Leads", 64), ("Catalog", 108), ("AI", 152), ("More", 193)]
        for name, x in items:
            color = NAVY if name == active else MUTED
            if name == active:
                c.setFillColor(ACCENT)
                c.roundRect(x - 2, self.height - nav_top - 4, 18, 2.5, 1.2, fill=1, stroke=0)
            self._text(c, x, nav_top + 7, "o", 7, color, True)
            self._text(c, x - 4, nav_top + 15, name, 5.2, color, True)

    def _metric(self, c, x, top, label, value, fill=BLUE):
        self._box(c, x, top, 50, 40, SURFACE, BORDER, 7)
        self._box(c, x + 7, top + 7, 13, 13, fill, fill, 4, 0)
        self._text(c, x + 7.5, top + 10, "o", 5, NAVY, True)
        self._text(c, x + 7, top + 25, value, 10, NAVY, True)
        self._text(c, x + 7, top + 35, label, 5.3, MUTED)

    def _product(self, c, x, top, name, meta, price, fill):
        self._box(c, x, top, 96, 82, SURFACE, BORDER, 7)
        self._box(c, x + 6, top + 6, 36, 36, fill, fill, 5, 0)
        self._text(c, x + 9, top + 18, "sample", 5.2, NAVY, True)
        self._pill(c, x + 7, top + 47, "In stock", GREEN, colors.HexColor("#177B63"), 34)
        self._text(c, x + 7, top + 63, name, 6.5, INK, True)
        self._text(c, x + 7, top + 71, meta, 5.3, MUTED)
        self._text(c, x + 7, top + 79, price, 6.2, NAVY, True)

    def draw(self):
        c = self.canv
        self._box(c, 0, 0, self.width, self.height, PAPER, NAVY, 16, 1.1)
        if self.screen == "dashboard":
            self._header(c, "Kohler")
            self._box(c, 12, 49, self.width - 24, 58, NAVY, NAVY, 10, 0)
            self._text(c, 21, 60, "TODAY", 5.8, colors.HexColor("#CFE1ED"), True)
            self._text(c, 21, 70, "Your showroom, in flow.", 10.2, colors.white, True)
            self._multi(c, 21, 84, ["Stay ahead of follow-ups", "and open quotes."], 5.9, colors.HexColor("#DFEAF4"))
            self._box(c, 21, 96, 70, 15, SURFACE, SURFACE, 5, 0)
            self._text(c, 34, 101, "Add lead", 5.8, NAVY, True)
            self._box(c, 95, 96, 73, 15, NAVY_2, colors.HexColor("#5F7892"), 5)
            self._text(c, 107, 101, "Create quote", 5.8, colors.white, True)
            self._text(c, 13, 119, "TODAY AT A GLANCE", 5.2, MUTED, True)
            self._metric(c, 13, 127, "Follow-ups", "08", PEACH)
            self._metric(c, 68, 127, "Active leads", "12", GREEN)
            self._metric(c, 123, 127, "Open quote", "INR 4.8L", PEACH)
            self._metric(c, 178, 127, "Low stock", "06", GOLD)
            self._box(c, 12, 174, self.width - 24, 94, SURFACE, BORDER, 8)
            self._text(c, 20, 185, "FOLLOW-UPS NEEDING ATTENTION", 5.4, MUTED, True)
            for i, (name, project, due) in enumerate([("Priya Shah", "3BHK renovation", "Today"), ("Rahul Kumar", "New flooring", "Tomorrow")]):
                y = 199 + i * 29
                self._box(c, 20, y, 16, 16, SAND, SAND, 8, 0)
                self._text(c, 24, y + 5, name[0] + name.split()[1][0], 5.2, NAVY, True)
                self._text(c, 43, y + 3, name, 6.4, INK, True)
                self._text(c, 43, y + 11, project, 5.2, MUTED)
                self._text(c, 184, y + 5, due, 5.2, ACCENT, True)
                self._line(c, 20, y + 24, self.width - 20, y + 24)
            self._bottom_nav(c, "Home")
        elif self.screen == "quote":
            self._header(c, "New quote", "Draft quote")
            self._box(c, 12, 49, self.width - 24, 31, SURFACE, BORDER, 8)
            self._box(c, 20, 57, 17, 17, PEACH, PEACH, 8, 0)
            self._text(c, 24, 62, "PS", 5.6, ACCENT, True)
            self._text(c, 44, 57, "Priya Shah", 7, INK, True)
            self._text(c, 44, 67, "3BHK renovation", 5.2, MUTED)
            self._text(c, 184, 61, "Change", 5.5, NAVY, True)
            self._text(c, 13, 91, "PRODUCTS", 5.3, MUTED, True)
            self._text(c, 182, 91, "+ Add item", 5.5, NAVY, True)
            for i, (name, size, qty, area, fill) in enumerate([("Statuario Grey", "600 x 1200 mm", "40", "320 sq ft", colors.HexColor("#C6C3BE")), ("Crema Beige", "600 x 1200 mm", "30", "240 sq ft", colors.HexColor("#E6D6BA"))]):
                y = 101 + i * 54
                self._box(c, 12, y, self.width - 24, 49, SURFACE, BORDER, 7)
                self._box(c, 20, y + 7, 31, 31, fill, fill, 5, 0)
                self._text(c, 58, y + 8, name, 6.8, INK, True)
                self._text(c, 58, y + 17, size, 5.1, MUTED)
                self._text(c, 58, y + 26, "Polished - INR 230/sq ft", 4.8, MUTED)
                self._box(c, 172, y + 7, 47, 34, PAPER, BORDER, 5)
                self._text(c, 178, y + 11, "Qty", 4.8, MUTED, True)
                self._text(c, 183, y + 20, "-   " + qty + "   +", 6, NAVY, True)
                self._text(c, 178, y + 30, area, 4.7, NAVY, True)
            self._box(c, 12, 216, self.width - 24, 68, SURFACE, BORDER, 8)
            self._text(c, 20, 227, "Total area", 5.7, MUTED)
            self._text(c, 177, 227, "560 sq ft", 6, NAVY, True)
            self._text(c, 20, 240, "Waste", 5.7, MUTED)
            self._text(c, 177, 240, "10%", 6, NAVY, True)
            self._line(c, 20, 253, self.width - 20, 253)
            self._text(c, 20, 262, "Total amount", 6.5, INK, True)
            self._text(c, 164, 262, "INR 1,59,677", 8.2, NAVY, True)
            self._box(c, 12, 293, self.width - 24, 21, NAVY, NAVY, 7, 0)
            self._text(c, 96, 300, "Send quote", 6.7, colors.white, True)
            self._bottom_nav(c, "Home")
        elif self.screen == "pipeline":
            self._header(c, "Customers", "Lead pipeline")
            self._box(c, 12, 49, self.width - 24, 19, SURFACE, BORDER, 7)
            self._text(c, 21, 55, "Search name, phone or project", 5.8, MUTED)
            x = 12
            for text, fill, col in [("All", NAVY, colors.white), ("New", SURFACE, MUTED), ("Follow-up", SURFACE, MUTED), ("Quote sent", SURFACE, MUTED)]:
                x += self._pill(c, x, 76, text, fill, col) + 5
            self._text(c, 13, 101, "PRIORITY LEADS", 5.4, MUTED, True)
            for i, (name, project, status, action, fill) in enumerate([
                ("Priya Shah", "3BHK renovation", "Follow-up", "Call today", PEACH),
                ("Rahul Kumar", "New home flooring", "Quote sent", "Check decision", GOLD),
                ("Amit Mehta", "Commercial project", "New", "Book visit", BLUE),
            ]):
                y = 112 + i * 53
                self._box(c, 12, y, self.width - 24, 46, SURFACE, BORDER, 8)
                self._box(c, 20, y + 9, 18, 18, fill, fill, 9, 0)
                initials = "".join(part[0] for part in name.split())
                self._text(c, 24, y + 15, initials, 5.5, NAVY, True)
                self._text(c, 45, y + 8, name, 7.1, INK, True)
                self._text(c, 45, y + 18, project, 5.1, MUTED)
                self._pill(c, 45, y + 28, status, fill, NAVY)
                self._text(c, 166, y + 31, action, 5, ACCENT, True)
            self._box(c, 12, 278, self.width - 24, 35, BLUE, colors.HexColor("#B8D3EA"), 8)
            self._text(c, 21, 288, "NEXT ACTION FIRST", 5.5, NAVY, True)
            self._multi(c, 21, 298, ["Each card leads with the next action;", "call, WhatsApp and quote stay secondary."], 5.3, NAVY)
            self._bottom_nav(c, "Leads")
        elif self.screen == "catalog":
            self._header(c, "Products", "Catalogue workspace")
            self._box(c, 12, 49, self.width - 24, 19, SURFACE, BORDER, 7)
            self._text(c, 21, 55, "Search by name or SKU", 5.8, MUTED)
            x = 12
            for text, fill, col in [("All items", NAVY, colors.white), ("In stock", SURFACE, MUTED), ("Low stock", SURFACE, MUTED)]:
                x += self._pill(c, x, 76, text, fill, col) + 5
            self._product(c, 12, 102, "Statuario Grey", "600 x 1200 - Matt", "INR 230 / sq ft", colors.HexColor("#C6C3BE"))
            self._product(c, 116, 102, "Crema Beige", "600 x 1200 - Polish", "INR 205 / sq ft", colors.HexColor("#E6D6BA"))
            self._product(c, 12, 191, "Oak console", "1800 mm - Walnut", "INR 36,500", colors.HexColor("#C6A87B"))
            self._product(c, 116, 191, "Wall light", "12W - Warm white", "INR 2,850", colors.HexColor("#F5D77A"))
            self._box(c, 12, 284, self.width - 24, 28, NAVY, NAVY, 7, 0)
            self._text(c, 58, 292, "Add selected products to quote", 6, colors.white, True)
            self._bottom_nav(c, "Catalog")
        elif self.screen == "client_catalog":
            self._header(c, "Kohler", "Your curated selection")
            self._box(c, 12, 49, self.width - 24, 43, NAVY, NAVY, 10, 0)
            self._text(c, 21, 60, "PRIVA'S 3BHK RENOVATION", 5.2, colors.HexColor("#CFE1ED"), True)
            self._text(c, 21, 71, "A selection made for your space", 8.5, colors.white, True)
            self._text(c, 21, 82, "2 products saved by your showroom", 5.4, colors.HexColor("#DFEAF4"))
            self._text(c, 13, 104, "YOUR SHORTLIST", 5.4, MUTED, True)
            self._product(c, 12, 113, "Statuario Grey", "Available to order", "Request price", colors.HexColor("#C6C3BE"))
            self._product(c, 116, 113, "Crema Beige", "Available to order", "Request price", colors.HexColor("#E6D6BA"))
            self._box(c, 12, 208, self.width - 24, 44, SURFACE, BORDER, 8)
            self._text(c, 21, 219, "Need help choosing?", 7.2, INK, True)
            self._multi(c, 21, 230, ["Ask your showroom to update this", "shortlist or arrange a visit."], 5.2, MUTED)
            self._box(c, 21, 241, 80, 15, NAVY, NAVY, 5, 0)
            self._text(c, 43, 246, "Request quote", 5.5, colors.white, True)
            self._box(c, 107, 241, 82, 15, SURFACE, BORDER, 5)
            self._text(c, 124, 246, "WhatsApp", 5.5, NAVY, True)
            self._box(c, 12, 267, self.width - 24, 36, PURPLE, colors.HexColor("#D4C4E5"), 8)
            self._text(c, 21, 278, "SHOWROOM VISUAL", 5.3, colors.HexColor("#70449B"), True)
            self._text(c, 21, 288, "View saved room concept", 6.2, NAVY, True)
        elif self.screen == "onboarding":
            self._header(c, "RetailFlow", "Set up your workspace")
            self._text(c, 13, 55, "What type of showroom do you run?", 8, NAVY, True)
            self._text(c, 13, 66, "Choose a starting template. You can adjust it later.", 5.7, MUTED)
            choices = [("Tiles", "Area + wastage", BLUE), ("Furniture", "Delivery + fabric", PEACH), ("Bathware", "Bundles + install", GREEN), ("Lighting", "Coverage + watt", GOLD)]
            for i, (name, detail, fill) in enumerate(choices):
                x = 13 + (i % 2) * 107
                y = 80 + (i // 2) * 48
                self._box(c, x, y, 98, 40, SURFACE, NAVY if name == "Tiles" else BORDER, 8, 1.1 if name == "Tiles" else 0.7)
                self._box(c, x + 8, y + 8, 16, 16, fill, fill, 5, 0)
                self._text(c, x + 30, y + 9, name, 6.8, INK, True)
                self._text(c, x + 30, y + 20, detail, 5.2, MUTED)
                if name == "Tiles":
                    self._text(c, x + 80, y + 10, "OK", 5, NAVY, True)
            self._text(c, 13, 184, "WHICH WORKSPACE MODULES DO YOU NEED?", 5.3, MUTED, True)
            modules = ["Inventory", "Quotations", "Delivery", "Installation", "Site measure", "Warranty"]
            for i, name in enumerate(modules):
                x = 13 + (i % 2) * 107
                y = 196 + (i // 2) * 22
                self._box(c, x, y, 98, 16, SURFACE, BORDER, 5)
                self._box(c, x + 7, y + 5, 6, 6, NAVY if i < 3 else SURFACE, NAVY, 2, 0.7)
                self._text(c, x + 20, y + 5, name, 5.8, INK, i < 3)
            self._box(c, 13, 270, self.width - 26, 20, NAVY, NAVY, 7, 0)
            self._text(c, 91, 277, "Continue", 6.5, colors.white, True)
            self._bottom_nav(c, "More")
        c.setFillColor(colors.HexColor("#53687A"))
        c.setFont("Helvetica-Bold", 5.2)
        c.drawCentredString(self.width / 2, 4, "UI REFERENCE - ADAPTIVE SHOWROOM SALES OS")


def page_footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 8.5 * mm, "ShowroomOS product priorities and UI reference - 18 July 2026")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def visual_page(story, number, title, lead, screen, build_focus, rules, metrics, caption):
    story.append(PageBreak())
    story.append(p(f"{number:02d} / UI DESIGN REFERENCE", "ShowKicker"))
    story.append(p(title, "ShowH1"))
    story.append(p(lead, "ShowLead"))
    left = MobileReference(screen)
    right = [
        rich("<b>Build focus</b>", "ShowH2"),
        p(build_focus),
        rich("<b>Interaction rules</b>", "ShowH2"),
    ]
    right.extend([bullet(rule) for rule in rules])
    right.append(rich("<b>Success measures</b>", "ShowH2"))
    right.extend([bullet(metric) for metric in metrics])
    right.append(Spacer(1, 4 * mm))
    note = Table([[p(caption, "ShowSmall")]], colWidths=[82 * mm])
    note.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    right.append(note)
    layout = Table([[left, right]], colWidths=[87 * mm, 87 * mm], hAlign="LEFT")
    layout.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(layout)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title="ShowroomOS Product Priorities and UI Reference",
        author="Codex",
    )
    story = []

    story.append(Spacer(1, 23 * mm))
    story.append(p("PRODUCT STRATEGY AND DESIGN REFERENCE", "ShowKicker"))
    story.append(p("Build one adaptable showroom sales app", "ShowTitle"))
    story.append(p(
        "A practical roadmap for an industry-configurable Showroom Sales OS - built for high-consideration, assisted selling rather than generic retail checkout.",
        "ShowLead",
    ))
    hero = Table([[rich(
        "<b>Product decision</b><br/>Position the product as a showroom sales workspace. The core stays the same: lead, consultation, product shortlist, quote, approval, order and delivery. Industry kits change fields, calculations, product presentation and operations without changing the core customer journey.",
        "ShowBody",
    )]], colWidths=[174 * mm])
    hero.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#B8D3EA")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(hero)
    story.append(Spacer(1, 11 * mm))
    story.append(p("The shared sales journey", "ShowH1"))
    journey = [[p("1. Lead", "ShowTableHead"), p("2. Visit", "ShowTableHead"), p("3. Shortlist", "ShowTableHead"), p("4. Quote", "ShowTableHead"), p("5. Order", "ShowTableHead"), p("6. Delivery", "ShowTableHead")],
               [p("Capture enquiry and source", "ShowTableCell"), p("Understand project and budget", "ShowTableCell"), p("Compare saved products", "ShowTableCell"), p("Price, tax, delivery and validity", "ShowTableCell"), p("Approval, payment and audit", "ShowTableCell"), p("Track fulfillment and review", "ShowTableCell")]]
    jt = Table(journey, colWidths=[29 * mm] * 6)
    jt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BACKGROUND", (0, 1), (-1, -1), SURFACE),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(jt)
    story.append(Spacer(1, 8 * mm))
    story.append(p("What this should not become", "ShowH2"))
    for item in [
        "Not a broad generic retail app with an unfocused feature list.",
        "Not a tile-only database with tile language hard-coded into shared objects.",
        "Not an AI showcase before leads, catalogue, quote, order and permissions are dependable.",
    ]:
        story.append(bullet(item))

    story.append(PageBreak())
    story.append(p("Platform architecture", "ShowH1"))
    story.append(p("Ship a stable core first. Let each showroom type activate only the fields and workflows it needs.", "ShowLead"))
    architecture = [[p("Universal core", "ShowTableHead"), p("Industry configuration", "ShowTableHead"), p("Examples", "ShowTableHead")],
                    [p("Leads, team, products, variants, quotes, orders, payments, tasks, customer portal, analytics and roles.", "ShowTableCell"), p("Industry template, product attributes, units, quote calculator, delivery/install stages, dashboard widgets and branding.", "ShowTableCell"), p("Tiles: sq ft and wastage. Furniture: fabric and assembly. Lighting: wattage and coverage. Electronics: serial and warranty.", "ShowTableCell")],
                    [p("Keep shared records relational and tenant-scoped. Use common IDs for showroom, customer, product, quote and order.", "ShowTableCell"), p("Use typed attribute definitions and variants rather than a large set of nullable columns. Keep queryable fields outside an unstructured JSON blob.", "ShowTableCell"), p("Launch with tiles, bathware and furniture first. They share project-style selling, quotations, delivery and visual selection.", "ShowTableCell")]]
    at = Table(architecture, colWidths=[58 * mm, 58 * mm, 58 * mm], repeatRows=1)
    at.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(at)
    story.append(Spacer(1, 9 * mm))
    story.append(p("Configuration model", "ShowH2"))
    for item in [
        "Onboarding chooses the showroom type, product units and enabled modules. It must not lock the business into one industry forever.",
        "Each product type has a schema: common fields plus template fields such as finish, size, fabric, wattage, serial number or warranty.",
        "Each quote uses the configured calculator: generic items and quantity are always available; area/wastage, installation and delivery are optional modules.",
        "The navigation remains calm: Dashboard, Leads, Catalogue, Quotes and More. Installation, warranty and supplier screens appear only when enabled.",
    ]:
        story.append(bullet(item))

    visual_page(
        story, 1, "Priority one: quotation engine", "Make quotations the commercial centre of the app. It should work for every showroom, then activate the right calculator and fields for the selected industry.", "quote",
        "Persist a draft quote, line items, pricing rules, taxes, discounts, delivery, validity, approval status and a branded PDF. Quote data must use real customer and product records, not mock data.",
        ["Lead with customer and product selection; keep calculation details visible but compact.", "Show price units clearly: INR per sq ft, piece, box, set or service.", "Use a single total card and one primary action: save draft or send quote.", "For tiles, reveal area, waste and boxes. For furniture, reveal delivery and assembly. For lighting, reveal installation."],
        ["Draft-to-sent conversion rate", "Quote turnaround time", "Accepted quote value", "Share-to-view and view-to-approval rate"],
        "Reference intent: one familiar quote layout that changes calculation sections by industry. Do not make a separate application for each vertical."
    )

    visual_page(
        story, 2, "Priority two: lead pipeline and next actions", "The CRM must make the next sale action obvious. Do not turn customer cards into a dense contact database.", "pipeline",
        "Use a simple shared pipeline: New, Follow-up, Quote sent, Won and Lost. Store next_action_at, assigned user, source, project type and last interaction. Keep quote status separate.",
        ["The next action and due date appear before phone, WhatsApp and quote shortcuts.", "Use status chips and filter chips, not a dormant filter icon.", "Support assigned salesperson and overdue views without adding a complex Kanban board on mobile.", "Show contextual quick actions only when the data exists: call, WhatsApp, create quote or schedule visit."],
        ["Overdue follow-ups", "First-response time", "Lead-to-quote conversion", "Quote-to-won conversion by salesperson"],
        "Reference intent: a card is a work item, not just a customer profile. The user should know what must happen next in less than two seconds."
    )

    visual_page(
        story, 3, "Priority three: adaptable catalogue and product cards", "Products must support visual comparison, variant-rich specification and fast quote building across multiple showroom types.", "catalog",
        "Build universal product, variant, price and stock records. Add a typed industry attribute template and product units. Keep Add to quote as the strongest product-card action.",
        ["Show image, availability, primary variant/specification, price unit and stock state on every card.", "Use selected filters as visible chips; preserve working filters and avoid an extra filter icon unless it opens real advanced filtering.", "Show a configurable secondary line: tile size/finish, sofa fabric, light wattage or appliance warranty.", "Use product comparison and shortlists for consultative sales; do not overload the card with every possible field."],
        ["Product-to-quote add rate", "Search-to-product-view rate", "Low-stock reorder completion", "Dead-stock age and clearance conversion"],
        "Reference intent: one card system, industry-specific fields. Store common product data relationally and define the additional fields from the selected showroom template."
    )

    visual_page(
        story, 4, "Priority four: customer-facing catalogue and saved selections", "A branded link turns a showroom consultation into a continuing buying journey rather than a lost WhatsApp conversation.", "client_catalog",
        "Let staff create a customer shortlist, share it through a signed branded link and track views, quote requests and requests for changes. Link saved visual designs and PDFs to the same customer/project.",
        ["The customer sees a curated selection, not the entire internal catalogue by default.", "Availability and prices are configurable per showroom; sales staff decide whether price is public, request-only or quote-only.", "Keep Request quote and WhatsApp as the two primary customer actions.", "Show an optional saved room concept for visual categories, then allow it to convert into a quote."],
        ["Shared catalogue opens", "Catalogue-view-to-quote-request rate", "Shortlist-to-order conversion", "Average time from visit to customer response"],
        "Reference intent: the external page should feel like the showroom brand, not an admin export. Use signed access, expiry controls and clear consent for customer data."
    )

    visual_page(
        story, 5, "Priority five: real operational dashboard", "Replace decorative metrics with a decision surface built from the showroom's actual leads, quotes, stock and fulfillment workload.", "dashboard",
        "The dashboard should query tenant-scoped data and lead with two actions: Add lead and Create quote. Metrics must be defined, live and drill into the relevant list.",
        ["Keep the hero small and action-led; do not consume the screen with generic welcome copy.", "Show only four core metrics: follow-ups due, active leads, open quote value and low stock or operational workload.", "Use industry widgets only when enabled: tile boxes required, furniture deliveries, installations due, warranty claims or supplier reorders.", "Every row and card navigates to the exact customer, quote or filtered list that explains the number."],
        ["Daily active sales users", "Follow-ups completed before due date", "Open pipeline value", "Inventory issue resolution time"],
        "Reference intent: a sales manager should be able to open the app, see today's risks and take the right action without interpreting a generic analytics dashboard."
    )

    visual_page(
        story, 6, "Priority six: industry and module onboarding", "Use onboarding to configure the workspace, not merely collect a shop name. This is how the same product feels relevant to different showrooms.", "onboarding",
        "Choose a showroom template, the sales units and optional operational modules. Save configuration in a tenant-safe settings model and let an owner change it later with migration-safe guidance.",
        ["Start with tiles, furniture, bathware and lighting as first-class templates. Add electronics, jewellery and fashion after the core flows are proven.", "Allow module activation for inventory, quotations, delivery, installation, site measurement, warranty and supplier management.", "Never remove existing business data when a module is switched off; hide it safely and explain the effect.", "Use guided empty states after setup: add product, add customer, create quote and send first quote."],
        ["Onboarding completion", "Time to first product", "Time to first customer", "Time to first sent quote"],
        "Reference intent: configuration should be short, reversible and human. Avoid forcing a tiny electronics showroom to complete tile-specific fields."
    )

    story.append(PageBreak())
    story.append(p("Suggested release plan", "ShowH1"))
    story.append(p("Build the commercial loop first. AI becomes genuinely useful only when it can work from secure, reliable customer, product and quote data.", "ShowLead"))
    release_data = [[p("Phase", "ShowTableHead"), p("Outcome", "ShowTableHead"), p("Scope", "ShowTableHead"), p("Do not defer", "ShowTableHead")],
                    [p("1. Core showroom loop", "ShowTableCell"), p("A showroom can take a lead to a sent quote.", "ShowTableCell"), p("Tenant safety, onboarding template, leads, catalogue, quotations, PDF, WhatsApp delivery, follow-ups and live dashboard.", "ShowTableCell"), p("RLS, authentication, rate limits, data minimisation and audit trail.", "ShowTableCell")],
                    [p("2. Operational modules", "ShowTableCell"), p("A showroom can fulfil and measure sales operations.", "ShowTableCell"), p("Stock thresholds, suppliers, delivery/install tracking, payments, customer catalogue links and reporting.", "ShowTableCell"), p("Quote status, orders, payments and customer communication history.", "ShowTableCell")],
                    [p("3. Industry intelligence", "ShowTableCell"), p("Each vertical feels native without separate codebases.", "ShowTableCell"), p("Tile calculator, room visualisation, furniture delivery planner, lighting calculator, warranty/serial module and AI recommendations.", "ShowTableCell"), p("Configurable attribute templates, role permissions and monitoring.", "ShowTableCell")]]
    rt = Table(release_data, colWidths=[28 * mm, 38 * mm, 70 * mm, 38 * mm], repeatRows=1)
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(rt)
    story.append(Spacer(1, 10 * mm))
    story.append(p("Design system direction", "ShowH2"))
    for item in [
        "Keep the calm, premium showroom feel: warm neutral background, navy structure, terracotta accent and real product materials/swatches.",
        "Make branding configurable per showroom: logo, primary colour, catalogue cover, quote template and client portal domain or subdomain.",
        "Use a shared component system for status chips, product cards, metric cards, quote lines, empty states and action buttons.",
        "On mobile, retain a stable bottom navigation and one clear primary action per screen. On desktop, add detail panes and comparison views rather than simply scaling mobile cards.",
    ]:
        story.append(bullet(item))
    story.append(Spacer(1, 6 * mm))
    final_note = Table([[rich(
        "<b>Recommended first market</b><br/>Launch the common platform with tiles, bathware and furniture. These categories naturally validate consultation, product visualisation, quote calculations, delivery and installation. Expand only after the core commercial loop is reliable and secure.",
        "ShowBody",
    )]], colWidths=[174 * mm])
    final_note.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#B9DFCF")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(final_note)

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
