📐 Visa Acceptance Agent Toolkit - Visual & Branding Design Guide
🎨 Brand Identity
Brand Name
Visa Acceptance Agent Toolkit

Tagline
"Payment processing made simple"

Brand Mark
Icon: Letter "V" in a rounded square badge
Style: Bold, minimal, modern
Implementation: h-8 w-8 rounded-lg bg-gradient-primary
🎨 Color System
Primary Colors (Light Mode)
All colors use HSL format for consistency and flexibility.

Token	HSL Value	Hex Equivalent	Usage
--primary	214 84% 56%	#3b82f6	Primary actions, links, focus states
--primary-foreground	0 0% 100%	#ffffff	Text on primary backgrounds
--primary-hover	214 84% 48%	#2563eb	Hover states for primary elements
Primary Colors (Dark Mode)
Token	HSL Value	Hex Equivalent	Usage
--primary	214 100% 70%	#60a5fa	Lighter blue for better dark contrast
--primary-foreground	240 10% 4%	#0a0b10	Text on primary (dark background)
--primary-hover	214 100% 75%	#93c5fd	Hover states
Background Colors
Light Mode:

--background: 240 10% 98% → Off-white (#fafbfc)
--foreground: 240 10% 9% → Near black (#171719)
--card: 0 0% 100% → Pure white (#ffffff)
Dark Mode:

--background: 240 10% 4% → Deep navy (#090a0d)
--foreground: 240 5% 96% → Off-white (#f4f5f6)
--card: 240 4% 8% → Dark slate (#131419)
Semantic Colors
State	Light Mode HSL	Dark Mode HSL	Usage
Success	142 76% 36%	142 76% 45%	Success messages, paid status
Warning	45 93% 47%	45 93% 55%	Draft status, warnings
Destructive	0 84% 60%	0 84% 65%	Errors, cancel actions
Status Badge Colors
Invoice Statuses:

Draft: bg-warning/10 text-warning-foreground border-warning/20
Sent: bg-primary/10 text-primary border-primary/20
Paid: bg-success/10 text-success-foreground border-success/20
Cancelled: bg-muted text-muted-foreground border-border
📏 Typography
Font Stack

font-family: Inter, ui-sans-serif, system-ui, -apple-system, 
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, 
             sans-serif;
Font Sizes & Weights
Element	Size	Weight	Usage
Page Title	text-xl (20px)	font-bold (700)	Main header
Card Title	text-lg (18px)	font-semibold (600)	Section headers
Body Text	text-sm (14px)	font-normal (400)	Default text
Captions	text-xs (12px)	font-normal (400)	Metadata, timestamps
Labels	text-sm (14px)	font-medium (500)	Form labels
Monospace Font (IDs)

font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 
             "Roboto Mono", monospace;
Used for: Invoice IDs, payment link IDs

🎭 Spacing & Layout
Container
Max Width: 1400px (2xl breakpoint)
Padding: px-4 (16px horizontal)
Vertical Spacing: py-6 (24px)
Component Spacing
Between rows: space-y-6 (24px)
Card internal spacing: p-6 (24px)
Form field spacing: space-y-4 (16px)
Button gap: gap-2 (8px)
Grid System

/* Responsive 2-column layout */
grid-cols-1 lg:grid-cols-2 gap-6
Breakpoints:

Mobile: < 640px (sm)
Tablet: 640px - 1023px (sm-lg)
Desktop: ≥ 1024px (lg)
Wide: ≥ 1400px (2xl)
🎯 Component Specifications
Header

className: "border-b bg-card shadow-sm sticky top-0 z-50"
Height: auto (padding-based)
Logo Badge:

Size: h-8 w-8 (32×32px)
Border radius: rounded-lg (8px)
Background: bg-gradient-primary
Title:

Font: text-xl font-bold (20px, weight 700)
Subtitle: text-sm text-muted-foreground (hidden on mobile)
Cards

className: "rounded-lg border bg-card text-card-foreground shadow-sm"
Card Header:

Padding: p-6 (24px)
Title size: text-lg font-semibold (18px)
Card Content:

Padding: p-6 pt-0 (24px horizontal/bottom, 0 top)
Shadows:

Default: shadow-sm
Enhanced: shadow-card (custom token)
Buttons
Primary Button:


className: "bg-primary text-primary-foreground hover:bg-primary/90"
Height: h-10 (40px)
Padding: px-4 py-2
Border radius: rounded-md (6px)
Outline Button:


className: "border border-input bg-background hover:bg-accent"
Size Variants:

Default: h-10 px-4 (40px × 16px)
Small: h-9 px-3 (36px × 12px)
Large: h-11 px-8 (44px × 32px)
Form Inputs
Text Input:


className: "h-10 w-full rounded-md border border-input 
           bg-background px-3 py-2"
Font size: text-base (16px) on mobile, text-sm (14px) on desktop
Textarea:


min-height: 80px (AI Agent), 64px (forms)
resize: none (most cases)
Select Dropdown:

Height: h-10 (40px)
Same styling as text inputs
Tables
Table Header:

Background: Slightly darker than card
Font weight: font-semibold
Padding: px-4 py-3
Table Cells:

Padding: Standard cell padding
Font: font-medium for amounts
Monospace: For IDs (font-mono text-xs)
Responsive Behavior:

Hide columns on smaller screens with hidden sm:table-cell
Show critical info inline on mobile
Badges
Status Badges:


padding: px-2 py-1
border-radius: rounded-md
font-size: text-xs
font-weight: font-medium
border: 1px solid (color-specific)
🎨 Visual Effects
Gradients

/* Primary Gradient */
--gradient-primary: linear-gradient(135deg, 
  hsl(214 84% 56%), hsl(214 84% 48%))

/* Card Gradient (subtle) */
--gradient-card: linear-gradient(145deg, 
  hsl(0 0% 100%), hsl(240 5% 98%))
Shadows

/* Card Shadow */
--shadow-card: 0 1px 3px 0 hsl(240 4% 46% / 0.1), 
               0 1px 2px -1px hsl(240 4% 46% / 0.1)

/* Elevated Shadow */
--shadow-elevated: 0 4px 6px -1px hsl(240 4% 46% / 0.1), 
                   0 2px 4px -2px hsl(240 4% 46% / 0.1)
Border Radius
Small: rounded-sm (2px)
Medium: rounded-md (6px) - default
Large: rounded-lg (8px)
Extra Large: rounded-xl (12px)
Transitions

/* Default */
transition-colors

/* Hover states */
hover:bg-primary/90
hover:bg-accent
📱 Responsive Design Strategy
Mobile First Approach
Stack vertically on mobile (grid-cols-1)
Two columns on tablets/desktop (lg:grid-cols-2)
Hide non-essential columns with hidden sm:table-cell
Full-width buttons on mobile, inline on desktop
Touch Targets
Minimum: 44×44px (iOS/Android guidelines)
Button height: h-10 (40px) default, h-9 (36px) small
Safe Areas

pb-safe /* Padding bottom with safe area inset */
🎭 Icon System
Icon Library
Lucide React - consistent, minimal, scalable

Common Icons
Icon	Component	Usage
Send	Forms	Send invoice, submit
Plus	Forms	Create new items
RefreshCw	Tables	Refresh data
Copy	Tables	Copy to clipboard
ExternalLink	Tables	Open in new tab
X	Actions	Cancel operations
Activity	Diagnostics	Health check
ChevronDown/Right	UI	Collapsible sections
Icon Sizing
Default: w-4 h-4 (16×16px)
In text: mr-2 (8px margin right)
Emoji Icons (Decorative)
🤖 AI Agent
🧾 Invoices
🔗 Pay Links
V Logo mark
🎨 Theme Switching
Implementation
Uses next-themes package
Persists to localStorage key: vite-ui-theme
Options: Light, Dark, System
Theme Toggle
Position: Top right header
Component: Dropdown menu
Icons: Sun (light), Moon (dark), Monitor (system)
✨ Animation & Interaction
Loading States

animate-spin /* For refresh icons */
animate-pulse /* For health check */
Hover States
Subtle background change: hover:bg-accent
Scale slightly: hover:scale-105 (not currently used)
Color intensify: hover:bg-primary/90
Disabled States

disabled:pointer-events-none 
disabled:opacity-50
📋 Content Guidelines
Placeholder Text
Forms: Descriptive examples (e.g., "customer@example.com")
Empty states: Helpful, actionable (e.g., "Create your first invoice below")
Button Labels
Action-first: "Create Invoice" not "Invoice Creation"
Verb + Noun: Clear actions
Loading state: Verb + "ing..." (e.g., "Creating...")
Error Messages
Toast notifications with descriptive titles
Use semantic colors (destructive for errors)
🎯 Accessibility
Color Contrast
Text on background: WCAG AA compliant
Dark mode: Higher luminosity for primary colors
Status badges: Border for non-color identification
Focus States

focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-ring
Screen Reader Support
sr-only class for icon-only buttons
Semantic HTML (<header>, <main>, <table>)
ARIA labels where needed
📐 Layout Hierarchy
Page Structure
Header (sticky)
  └─ Logo + Title + Theme Toggle
Main Container
  └─ Row 1: AI Agent (full width)
  └─ Row 2: Create Forms (2 columns)
  └─ Row 3: Data Tables (2 columns)
  └─ Row 4: Diagnostics (centered)
Visual Hierarchy
Primary: Page title, CTA buttons
Secondary: Section headers, form labels
Tertiary: Metadata, timestamps, IDs
