from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "RetailProfile_Antigravity_Implementation_Guide.pdf"

NAVY = colors.HexColor("#0D2D4D")
INK = colors.HexColor("#17212B")
MUTED = colors.HexColor("#607080")
PAPER = colors.HexColor("#F7F5F0")
SURFACE = colors.HexColor("#FFFFFF")
BORDER = colors.HexColor("#DDE2E7")
BLUE = colors.HexColor("#EAF2FA")
GREEN = colors.HexColor("#EAF7F1")
PEACH = colors.HexColor("#FCEDE7")
GOLD = colors.HexColor("#F9F1DF")
PURPLE = colors.HexColor("#F3EDF9")
ACCENT = colors.HexColor("#C96C45")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="RP_Kicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.8, leading=11.5, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="RP_Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=33, textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="RP_H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="RP_H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.7, leading=15.5, textColor=NAVY, spaceBefore=6, spaceAfter=3))
styles.add(ParagraphStyle(name="RP_Lead", parent=styles["Normal"], fontName="Helvetica", fontSize=10.7, leading=16.3, textColor=MUTED, spaceAfter=9))
styles.add(ParagraphStyle(name="RP_Body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.15, leading=13.7, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="RP_Bullet", parent=styles["Normal"], fontName="Helvetica", fontSize=8.95, leading=13.2, leftIndent=10, firstLineIndent=-8, textColor=INK, spaceAfter=2))
styles.add(ParagraphStyle(name="RP_Small", parent=styles["Normal"], fontName="Helvetica", fontSize=7.8, leading=10.4, textColor=MUTED))
styles.add(ParagraphStyle(name="RP_TableHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.9, leading=9.8, textColor=colors.white))
styles.add(ParagraphStyle(name="RP_Table", parent=styles["Normal"], fontName="Helvetica", fontSize=7.6, leading=10.1, textColor=INK))
styles.add(ParagraphStyle(name="RP_Prompt", parent=styles["Normal"], fontName="Helvetica", fontSize=8.45, leading=12.1, textColor=INK))


def p(text, style="RP_Body"):
    return Paragraph(escape(text).replace("\n", "<br/>"), styles[style])


def rich(text, style="RP_Body"):
    return Paragraph(text.replace("\n", "<br/>"), styles[style])


def bullet(text):
    return Paragraph("- " + escape(text), styles["RP_Bullet"])


def prompt_box(title, prompt):
    content = rich("<b>ANTIGRAVITY PROMPT - " + escape(title.upper()) + "</b><br/>" + escape(prompt), "RP_Prompt")
    box = Table([[content]], colWidths=[174 * mm])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#B8D3EA")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return box


class ArchitectureDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 174 * mm
        self.height = 74 * mm

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def box(self, c, x, top, w, h, title, lines, fill):
        y = self.height - top - h
        c.setFillColor(fill)
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 9, y + h - 15, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.2)
        for i, line in enumerate(lines):
            c.drawString(x + 9, y + h - 27 - i * 8, line)

    def arrow(self, c, x1, top1, x2, top2):
        y1 = self.height - top1
        y2 = self.height - top2
        c.setStrokeColor(ACCENT)
        c.setFillColor(ACCENT)
        c.setLineWidth(1.2)
        c.line(x1, y1, x2, y2)
        c.line(x2, y2, x2 - 5, y2 + 2.5)
        c.line(x2, y2, x2 - 5, y2 - 2.5)

    def draw(self):
        c = self.canv
        self.box(c, 0, 10, 105, 48, "1. Shop config", ["profile ID", "modules, branding"], PEACH)
        self.box(c, 128, 10, 105, 48, "2. Profile registry", ["icons, copy, fields", "calculator, AI key"], GOLD)
        self.box(c, 256, 10, 105, 48, "3. Provider hook", ["load config once", "return typed profile"], PURPLE)
        self.box(c, 384, 10, 108, 48, "4. Shared screens", ["dashboard, products", "quotes, AI and theme"], GREEN)
        self.arrow(c, 105, 34, 128, 34)
        self.arrow(c, 233, 34, 256, 34)
        self.arrow(c, 361, 34, 384, 34)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 6.7)
        c.drawString(0, 3, "One codebase. One shared data model. Small configuration changes create different showroom experiences.")


class OnboardingDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 174 * mm
        self.height = 92 * mm

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def card(self, c, x, top, w, h, no, title, lines, fill):
        y = self.height - top - h
        c.setFillColor(SURFACE)
        c.setStrokeColor(BORDER)
        c.roundRect(x, y, w, h, 9, fill=1, stroke=1)
        c.setFillColor(fill)
        c.roundRect(x + 9, y + h - 29, 19, 19, 6, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(x + 18.5, y + h - 22, str(no))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 36, y + h - 19, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.1)
        for i, line in enumerate(lines):
            c.drawString(x + 12, y + h - 42 - i * 9, line)

    def arrow(self, c, x1, top1, x2, top2):
        y1 = self.height - top1
        y2 = self.height - top2
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.2)
        c.line(x1, y1, x2, y2)
        c.setFillColor(ACCENT)
        c.line(x2, y2, x2 - 4.5, y2 + 2.5)
        c.line(x2, y2, x2 - 4.5, y2 - 2.5)

    def draw(self):
        c = self.canv
        self.card(c, 0, 10, 145, 63, 1, "Choose showroom", ["Tiles, Furniture, Bathware", "Lighting, Electronics, Other"], BLUE)
        self.card(c, 174, 10, 145, 63, 2, "Confirm operations", ["Recommended modules:", "variants, projects, delivery..."], GREEN)
        self.card(c, 348, 10, 145, 63, 3, "Personalise workspace", ["Currency, language and logo.", "Create profile, open dashboard."], GOLD)
        self.arrow(c, 145, 41, 174, 41)
        self.arrow(c, 319, 41, 348, 41)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 6.6)
        c.drawString(0, 2, "Keep this setup to three short screens. Users can later edit modules in Settings without losing existing data.")


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.4)
    canvas.drawString(18 * mm, 8.5 * mm, "Retail profile implementation guide - Antigravity handoff - 18 July 2026")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def section(story, number, title, lead):
    story.append(PageBreak())
    story.append(p(f"{number:02d} / IMPLEMENTATION", "RP_Kicker"))
    story.append(p(title, "RP_H1"))
    story.append(p(lead, "RP_Lead"))


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title="Retail Profile Antigravity Implementation Guide",
        author="Codex",
    )
    story = []

    story.append(Spacer(1, 23 * mm))
    story.append(p("DEVELOPER IMPLEMENTATION BRIEF", "RP_Kicker"))
    story.append(p("Configurable retail profiles without rebuilding the app", "RP_Title"))
    story.append(p(
        "A fast, maintainable way to let each showroom choose its retail type and receive adapted UI copy, icons, graphics, product fields, calculators and AI tools - while preserving one React and Supabase codebase.",
        "RP_Lead",
    ))
    overview = Table([[rich(
        "<b>Recommended MVP decision</b><br/>Store a profile ID and enabled operation modules on the shop. Keep the definition of each profile in a versioned TypeScript registry. Load it through one provider/hook, then let existing screens consume configuration. Do not build a visual form builder, separate app themes or dynamic database schema editor in version one.",
        "RP_Body",
    )]], colWidths=[174 * mm])
    overview.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#B8D3EA")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(overview)
    story.append(Spacer(1, 9 * mm))
    story.append(p("The constraint that saves time", "RP_H2"))
    for item in [
        "The core navigation, customer identity, permissions, product ID, quote ID and order flow remain shared for all businesses.",
        "A profile may change language, icon, empty-state graphics, dashboard widgets, product attributes, calculator and AI prompt templates. It must not fork routes or duplicate components.",
        "A business can activate more than one operation module. For example, tiles uses variants plus project sales; electronics uses variants plus serialized products.",
    ]:
        story.append(bullet(item))

    section(story, 1, "Target architecture: configuration over branching", "Use one chain of responsibility. A signed-in shop provides settings, the static registry turns them into a typed profile, and screens render from that profile.")
    story.append(ArchitectureDiagram())
    story.append(Spacer(1, 5 * mm))
    story.append(p("Why this is the lowest-risk approach", "RP_H2"))
    for item in [
        "Fast: profile definitions live in one source file, so a new showroom type is mostly data/configuration rather than a new feature branch.",
        "Safe: permissions, RLS, routes and customer records do not change with the visual profile.",
        "Testable: every profile can be tested against the same set of shared screens and core user journeys.",
        "Reversible: an owner can change profile/modules later; old records still render because their core fields remain unchanged.",
    ]:
        story.append(bullet(item))
    story.append(p("Do not do in MVP", "RP_H2"))
    for item in [
        "Do not create a separate component tree, table set or theme package per industry.",
        "Do not let arbitrary client JSON define unsafe AI prompts, database access or permissions.",
        "Do not make every attribute a top-level products column. Keep universal fields structured and profile-specific display attributes contained.",
    ]:
        story.append(bullet(item))

    section(story, 2, "Data model and migration plan", "Add only the two configuration fields needed now. Keep the profile registry in source control so product behaviour is reviewable, typed and versioned.")
    data = [[p("Where", "RP_TableHead"), p("Add", "RP_TableHead"), p("Purpose", "RP_TableHead")],
            [p("shops", "RP_Table"), p("retail_profile_id text", "RP_Table"), p("Primary vertical such as tiles, furniture, bathware, lighting, electronics, pharmacy, salon or standard_retail.", "RP_Table")],
            [p("shops", "RP_Table"), p("enabled_modules text[]", "RP_Table"), p("Operation overlays such as variants, serialized, batch_expiry, project_sales, service, delivery, wholesale and multi_store.", "RP_Table")],
            [p("shops", "RP_Table"), p("branding jsonb default '{}'", "RP_Table"), p("Optional logo URL, display name and safe theme preference. Keep sensitive/permission data out of this object.", "RP_Table")],
            [p("products", "RP_Table"), p("attributes jsonb default '{}'", "RP_Table"), p("MVP display attributes such as finish, fabric, wattage or warranty. Keep name, SKU, price, stock and image as normal columns.", "RP_Table")]]
    dt = Table(data, colWidths=[29 * mm, 48 * mm, 97 * mm], repeatRows=1)
    dt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(dt)
    story.append(Spacer(1, 7 * mm))
    story.append(p("Migration rules", "RP_H2"))
    for item in [
        "Create a new timestamped migration. Do not edit the initial schema after it may have been deployed.",
        "Backfill existing shops as retail_profile_id = 'tiles' or use a temporary 'showroom' default, then show the profile selection on next sign-in.",
        "Add defaults and validation checks for supported IDs. Profile/module eligibility should be validated in the shared registry and server-side write path.",
        "Keep tenant RLS. Only the shop owner or approved role may update retail profile, modules and branding. Never allow a client to set another shop ID.",
        "Use attributes jsonb only for profile-specific metadata. Move high-volume filter/report fields to relational columns later, based on real usage.",
    ]:
        story.append(bullet(item))

    section(story, 3, "Profile registry and provider contract", "Make the static registry the single source of truth for supported profile behaviour. The database stores IDs, not a large free-form UI specification.")
    registry = [[p("Registry property", "RP_TableHead"), p("Example", "RP_TableHead"), p("Consumed by", "RP_TableHead")],
                [p("id and displayName", "RP_Table"), p("tiles / Tile showroom", "RP_Table"), p("Onboarding, header, settings and analytics labels.", "RP_Table")],
                [p("recommendedModules", "RP_Table"), p("variants, project_sales, delivery", "RP_Table"), p("Onboarding defaults and enabled feature checks.", "RP_Table")],
                [p("copy and icon", "RP_Table"), p("Project, room, sample, material icon", "RP_Table"), p("Dashboard, empty states, product/card labels.", "RP_Table")],
                [p("productFieldSchema", "RP_Table"), p("size, finish, material, colour", "RP_Table"), p("Product form and product card secondary details.", "RP_Table")],
                [p("calculatorKey", "RP_Table"), p("area_wastage", "RP_Table"), p("Quote builder calculation panel and validation.", "RP_Table")],
                [p("aiProfileKey", "RP_Table"), p("interior_sales", "RP_Table"), p("Server-generated suggested actions and prompt template.", "RP_Table")]]
    rt = Table(registry, colWidths=[43 * mm, 50 * mm, 81 * mm], repeatRows=1)
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(rt)
    story.append(Spacer(1, 7 * mm))
    story.append(p("Provider behaviour", "RP_H2"))
    for item in [
        "Create RetailProfileProvider after authentication and fetch the authenticated profile/shop once. Resolve retail_profile_id through the local registry and merge enabled modules and safe branding.",
        "Expose useRetailProfile() returning { profile, modules, hasModule, labels, productFieldSchema, calculatorKey, aiProfileKey, loading, error }.",
        "Keep a safe fallback profile called showroom. Unknown IDs should not crash the application; log a non-PII diagnostic and use the fallback.",
        "Do not fetch the shop configuration individually in every page. Existing MobileLayout and pages should read from the provider.",
    ]:
        story.append(bullet(item))

    section(story, 4, "Fast onboarding and profile switching", "Ask one meaningful business question, preselect the right operating modules and let the owner confirm. The flow should be short enough to feel like personalisation, not setup work.")
    story.append(OnboardingDiagram())
    story.append(Spacer(1, 4 * mm))
    story.append(p("Recommended profile mappings", "RP_H2"))
    mapping = [[p("Profile", "RP_TableHead"), p("Recommended modules", "RP_TableHead"), p("Initial adaptation", "RP_TableHead")],
               [p("Tiles / Bathware", "RP_Table"), p("variants, project_sales, delivery, installation", "RP_Table"), p("Area/space language, finish/size fields, room visualise and area calculator.", "RP_Table")],
               [p("Furniture", "RP_Table"), p("variants, project_sales, delivery, installation", "RP_Table"), p("Fabric/dimension fields, delivery and assembly estimator.", "RP_Table")],
               [p("Electronics", "RP_Table"), p("variants, serialized, warranty", "RP_Table"), p("Serial/warranty fields, product comparison and installation options.", "RP_Table")],
               [p("Pharmacy / Grocery", "RP_Table"), p("batch_expiry, variants", "RP_Table"), p("Batch/expiry alerts, supplier replenishment and low-stock dashboard.", "RP_Table")],
               [p("Salon / Tailoring", "RP_Table"), p("service, appointments", "RP_Table"), p("Bookings, service packages, customer history and reminders.", "RP_Table")]]
    mt = Table(mapping, colWidths=[35 * mm, 63 * mm, 76 * mm], repeatRows=1)
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(mt)
    story.append(Spacer(1, 6 * mm))
    for item in [
        "Always permit the owner to edit the profile and modules later in Settings. Explain that disabling a module hides it but does not delete existing data.",
        "Profile changes should trigger a confirmation page describing what will change: labels, optional fields, dashboard widgets and quote calculator.",
        "Do not ask the user to select from the seven operation types first. Ask the business category first, then recommend a combination of modules.",
    ]:
        story.append(bullet(item))

    section(story, 5, "Screen adaptation rules", "Make the application recognisably the same for every showroom. Adapt context, not navigation architecture.")
    screen_data = [[p("Screen", "RP_TableHead"), p("Shared structure", "RP_TableHead"), p("Profile adaptation", "RP_TableHead")],
                   [p("Top header", "RP_Table"), p("Logo, showroom name, language, notifications.", "RP_Table"), p("Small category icon, one-line workspace subtitle and selected brand assets.", "RP_Table")],
                   [p("Dashboard", "RP_Table"), p("Actions, four metrics, follow-up list.", "RP_Table"), p("Tiles: open quote area. Electronics: warranties. Pharmacy: expiry. Salon: appointments.", "RP_Table")],
                   [p("Customers", "RP_Table"), p("Pipeline, next action, owner, call/WhatsApp/quote.", "RP_Table"), p("Label Visit as consultation, booking or site measure when profile requires it.", "RP_Table")],
                   [p("Products", "RP_Table"), p("Search, availability, image, price, Add to quote.", "RP_Table"), p("Card secondary fields come from productFieldSchema; fields stay limited to three.", "RP_Table")],
                   [p("Quote", "RP_Table"), p("Customer, line items, taxes, total, send/share.", "RP_Table"), p("Calculator panel, units, delivery/install/service lines change by profile/modules.", "RP_Table")],
                   [p("AI", "RP_Table"), p("Assistant layout, chat and suggested prompts.", "RP_Table"), p("Safe profile-specific prompt suggestions and tool cards. AI data remains server-generated and minimised.", "RP_Table")]]
    st = Table(screen_data, colWidths=[29 * mm, 66 * mm, 79 * mm], repeatRows=1)
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(st)
    story.append(Spacer(1, 7 * mm))
    story.append(p("Time-saving UI rules", "RP_H2"))
    for item in [
        "Keep the current bottom navigation and shared page shells. Change labels only when the new label is more accurate, not merely different.",
        "Use existing Lucide icons and the existing neutral/navy/terracotta design system. Add a small profile graphic or material texture in heroes and empty states only.",
        "Use one ProductCard, one CustomerCard and one QuoteBuilder. Pass profile-driven props instead of copying components for tiles, furniture and electronics.",
        "Hide unavailable widgets/tools cleanly. Never show an icon, tab or form field that has no underlying workflow.",
    ]:
        story.append(bullet(item))

    section(story, 6, "Product, quote and AI implementation details", "Reuse common records and isolate the profile-specific logic behind small, typed adapters.")
    story.append(p("Product forms", "RP_H2"))
    for item in [
        "The common Product form always owns name, SKU, brand, category, price, price unit, stock status, image and description.",
        "Render additional fields from productFieldSchema. Validate values client-side for usability and validate/sanitise again in the server-side write path when business-critical.",
        "Store values under products.attributes for the first release. Do not query/filter deeply nested attributes across the whole catalogue until a real reporting need justifies extracting a field.",
    ]:
        story.append(bullet(item))
    story.append(p("Quote calculators", "RP_H2"))
    for item in [
        "Define a calculator registry: generic, area_wastage, service_booking, delivery_installation. Each returns a normalised quote draft with line items, quantities, taxes and totals.",
        "The QuoteBuilder selects calculatorKey from the profile; it must never contain profile-specific arithmetic inline in the React page.",
        "Persist the calculator key and immutable item snapshots with each saved quote so historical totals remain explainable after profile changes.",
    ]:
        story.append(bullet(item))
    story.append(p("AI", "RP_H2"))
    for item in [
        "The browser sends a user request and selected safe IDs. The authenticated Edge Function loads the shop profile and builds the allowed profile-specific instruction server-side.",
        "Examples: tiles suggests visualise a space and area estimation; electronics suggests compare products and warranty help; salon suggests appointment follow-up drafts.",
        "Do not send raw customer phone numbers or whole customer records to the AI provider. Keep consent, limits and rate-limits from the security remediation work.",
    ]:
        story.append(bullet(item))

    section(story, 7, "Lowest-time delivery sequence", "Work in small testable slices. Stop after phase 3 if you only need the profile-driven UI; phases 4 and 5 make product and AI behaviour richer.")
    phases = [[p("Phase", "RP_TableHead"), p("Deliverable", "RP_TableHead"), p("Files most likely touched", "RP_TableHead"), p("Proof", "RP_TableHead")],
              [p("1. Foundation", "RP_Table"), p("Migration, registry, provider, fallback profile.", "RP_Table"), p("new migration, retailProfiles.ts, RetailProfileProvider.tsx, App.tsx", "RP_Table"), p("Existing shop opens with safe default profile.", "RP_Table")],
              [p("2. Onboarding", "RP_Table"), p("Three-step profile/module selection and owner settings update.", "RP_Table"), p("Onboarding.tsx, Settings/More route, provider tests", "RP_Table"), p("New shop saves profile/modules and returns to dashboard.", "RP_Table")],
              [p("3. UI adaptation", "RP_Table"), p("Header, dashboard copy/widgets, product labels/fields and empty states use provider.", "RP_Table"), p("MobileLayout, Dashboard, Products, AddProductModal, shared cards", "RP_Table"), p("Tiles and electronics render different copy with same routes.", "RP_Table")],
              [p("4. Quote adapter", "RP_Table"), p("Calculator registry and profile-driven quote sections.", "RP_Table"), p("QuoteBuilder, calculator modules, quote persistence/RPC", "RP_Table"), p("Generic and area_wastage totals match tests.", "RP_Table")],
              [p("5. AI adapter", "RP_Table"), p("Server-side profile-specific suggestions and instruction builder.", "RP_Table"), p("gemini-proxy Edge Function, AI.tsx", "RP_Table"), p("No PII transfer; profile key changes suggestions safely.", "RP_Table")]]
    pt = Table(phases, colWidths=[23 * mm, 48 * mm, 61 * mm, 42 * mm], repeatRows=1)
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, PAPER]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(pt)
    story.append(Spacer(1, 7 * mm))
    story.append(p("Definition of done", "RP_H2"))
    for item in [
        "A user can select a business category, accept/edit recommended modules and see the saved profile on their next login.",
        "The same routes render safe and relevant labels/fields for at least tiles and electronics without duplicate page components.",
        "Changing a profile is owner-protected, tenant-safe and does not delete products, customers or quotations.",
        "Build, lint, migration tests and at least two profile integration tests pass.",
    ]:
        story.append(bullet(item))

    prompts = [
        ("1. Foundation and migration", "Implement the first RetailProfile foundation in the existing RetailFlow React and Supabase app. Do not create separate apps or duplicate pages. Create a new timestamped Supabase migration that adds shops.retail_profile_id, shops.enabled_modules text[] and shops.branding jsonb with safe defaults and validation. Preserve tenant RLS and ensure only an owner can change these configuration fields. Add products.attributes jsonb for profile-specific display metadata while retaining all existing common product columns. Create src/config/retailProfiles.ts as a typed static registry for tiles, furniture, bathware, lighting, electronics, pharmacy, salon and a showroom fallback. Each registry entry must define display copy, icon key, recommended modules, product field schema, calculator key and AI profile key. Add a RetailProfileProvider and useRetailProfile hook that fetch the authenticated shop once, resolves the registry and safely falls back for unknown profiles. Integrate it at the authenticated app root. Run build and lint; add focused tests for fallback, module checks and tenant-safe updates."),
        ("2. Onboarding and settings", "Extend the existing RetailFlow onboarding into a fast three-step retail profile setup. Step 1 selects business category, not an operation type. Step 2 shows preselected operation modules that the owner can edit: variants, serialized, batch_expiry, project_sales, service, delivery, installation, warranty, wholesale and multi_store. Step 3 saves name, currency, language and optional safe branding. Save retail_profile_id, enabled_modules and branding only for the authenticated owner shop. Do not allow changing another shop ID. Add a working Settings/More entry where an owner can later change profile/modules; explain that disabling modules hides UI but never deletes existing data. Use current RetailFlow visual style, responsive mobile layout, accessible controls, loading/error states and no placeholder actions. Add tests for preselection, persistence, owner protection and editing an existing shop."),
        ("3. Adapt shared UI without forking", "Make RetailFlow UI profile-aware using useRetailProfile without copying MobileLayout, Dashboard, Customers, Products, ProductCard, AddProductModal or QuoteBuilder. Keep the current navigation and visual design system. Adapt only contextual UI: header subtitle/icon, dashboard widget labels, empty-state copy, customer consultation/visit labels, product form extra fields and up to three product-card secondary attributes. Existing core fields and routes must remain stable. Tiles should show size/finish/material and project language. Electronics should show warranty/serial-oriented fields and comparison language. Pharmacy should show batch/expiry language only when its module is enabled. Hide unavailable widgets and controls completely. Preserve working customer/product filters. Add rendering tests proving two profiles use the same routes/components but display different relevant labels and field schemas."),
        ("4. Profile-driven quote calculators", "Refactor RetailFlow QuoteBuilder so profile-specific arithmetic is not written inline in the page. Create a typed calculator registry with generic, area_wastage, service_booking and delivery_installation calculators. Each calculator returns a normalised quote draft: line items, quantities, units, tax, discount, delivery, service/installation amount and total. QuoteBuilder selects calculatorKey from useRetailProfile. Tiles expose area, waste percent and boxes; furniture exposes delivery/assembly; services expose appointment/service lines; generic retail shows item/quantity/discount. Preserve the current quote UI quality. Persist calculator key and immutable item snapshots with saved quotes so historical totals remain explainable after a profile change. Add unit tests for all calculator edge cases and integration tests for generic and area_wastage quote totals."),
        ("5. Secure profile-aware AI", "Make RetailFlow AI profile-aware without trusting client-supplied system prompts. The React client may send the user message and safe selected record IDs only. In the authenticated gemini-proxy Edge Function, derive the caller user, shop and retail profile server-side, then resolve the profile AI key from a server-side allow-list. Build profile-specific suggested actions and instruction templates there: tiles can visualise spaces and explain area/waste; electronics can compare products and warranties; salons can draft appointment follow-ups. Do not send customer phone numbers, full notes or raw customer lists to Gemini. Preserve JWT verification, tenant checks, request validation, image limits and rate limits. Add tests proving a caller cannot select another shop profile or inject a raw system instruction, and that phone numbers are absent from normal AI payloads."),
        ("6. Verification and rollout", "Add a focused RetailProfile test plan and rollout guardrails to RetailFlow. Cover migration defaults, owner-only profile changes, RLS tenant isolation, unknown profile fallback, onboarding recommendations, profile persistence after sign-in, UI adaptation for tiles and electronics, conditional modules, calculator selection and profile-aware AI safety. Add browser-level checks for mobile layout so the profile header and bottom navigation do not overlap content. Run build, lint and test suite. Produce a concise implementation summary listing changed files, migration name, supported profile IDs, module IDs, any unfinished integrations and exact manual staging steps. Do not modify unrelated UI, remove working filters or weaken existing security controls."),
    ]
    for idx, (title, prompt) in enumerate(prompts, start=8):
        section(story, idx, title, "Run this prompt as a self-contained Antigravity task after completing the preceding step. Review the resulting migration and tests before moving on.")
        story.append(prompt_box(title, prompt))
        story.append(Spacer(1, 8 * mm))
        story.append(p("Review before accepting the change", "RP_H2"))
        checks = [
            "No duplicated industry page components or client-side bypass of tenant security.",
            "No operation module is visible without an implemented workflow or an explicit safe disabled state.",
            "Existing RetailFlow UI refresh, product/customer filters and quote layout remain intact.",
            "All changed code uses the shared profile provider and registry rather than hard-coded string checks scattered across pages.",
        ]
        for check in checks:
            story.append(bullet(check))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
