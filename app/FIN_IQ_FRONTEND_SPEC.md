# Q_Intel Frontend Design Specification

**IEEE Software Requirements Specification (SRS)**  
**Version:** 1.0  
**Date:** 2026-03-26  
**Classification:** Fintech Professional Dashboard UI/UX  

---

## 1. Introduction

### 1.1 Purpose

This document provides an exhaustive specification for recreating the visual design system, component architecture, and styling conventions of the q_intel market intelligence platform. It serves as a comprehensive guide enabling developers to construct equally polished, professional-grade fintech interfaces.

### 1.2 Scope

The specification covers:
- Technology stack and dependencies
- Design tokens (colors, typography, spacing, radii)
- Component architecture and styling patterns
- Layout system and navigation
- Data visualization standards
- Interactive patterns and micro-interactions
- Responsive design considerations

### 1.3 Design Philosophy

Q_intel embodies **information density without visual clutter**—a Bloomberg-inspired dark mode interface optimized for:
- Rapid data scanning (tabular numerics, sparklines)
- Professional credibility (muted palette, precise typography)
- Cognitive efficiency (consistent patterns, predictable interactions)

---

## 2. Technology Stack

### 2.1 Core Framework

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Animations | tw-animate-css | 1.x |

### 2.2 UI Component Libraries

| Library | Purpose | Version |
|---------|---------|---------|
| @base-ui/react | Unstyled accessible primitives | 1.3+ |
| shadcn/ui | Component patterns | 4.x |
| class-variance-authority | Variant management | 0.7+ |
| clsx + tailwind-merge | Class composition | Latest |
| lucide-react | Icon system | 0.577+ |

### 2.3 Data Visualization

| Library | Use Case |
|---------|----------|
| recharts | Area charts, bar charts, treemaps, composed charts |
| lightweight-charts | TradingView-style candlestick/OHLC charts |
| Custom SVG | Sparklines, Sankey diagrams, mini-charts |
| react-simple-maps | 2D geographic visualizations |
| react-globe.gl | 3D globe visualizations |
| cesium + resium | Advanced 3D tactical maps |

### 2.4 State Management

| Library | Scope |
|---------|-------|
| zustand | Global UI state (sidebar, theme) |
| @tanstack/react-table | Table state, sorting, pagination |
| React useState/useCallback | Local component state |

### 2.5 Package.json Dependencies

```json
{
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "@tanstack/react-table": "^8.21.3",
    "cesium": "^1.139.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "lightweight-charts": "^5.1.0",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-globe.gl": "^2.37.0",
    "react-simple-maps": "^3.0.0",
    "recharts": "^3.8.0",
    "resium": "^1.19.4",
    "shadcn": "^4.0.8",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 3. Design Tokens

### 3.1 Color System

The color system uses **OKLCH color space** for perceptual uniformity and accessibility.

#### 3.1.1 Dark Mode (Primary)

```css
/* ===== DARK MODE PALETTE ===== */
:root.dark {
  /* Base surfaces */
  --background: oklch(0.12 0.005 250);      /* Deep navy-black */
  --foreground: oklch(0.93 0 0);            /* Near-white text */
  
  /* Card & container surfaces */
  --card: oklch(0.16 0.005 250);            /* Elevated surface */
  --card-foreground: oklch(0.93 0 0);
  
  /* Popover/dropdown surfaces */
  --popover: oklch(0.16 0.005 250);
  --popover-foreground: oklch(0.93 0 0);
  
  /* Brand/accent color (blue) */
  --primary: oklch(0.55 0.15 250);          /* Muted blue */
  --primary-foreground: oklch(0.98 0 0);
  
  /* Secondary surfaces */
  --secondary: oklch(0.20 0.005 250);
  --secondary-foreground: oklch(0.88 0 0);
  
  /* Muted/subdued elements */
  --muted: oklch(0.20 0.005 250);
  --muted-foreground: oklch(0.55 0 0);      /* Gray text */
  
  /* Interactive accent */
  --accent: oklch(0.22 0.01 250);
  --accent-foreground: oklch(0.93 0 0);
  
  /* Destructive/error */
  --destructive: oklch(0.60 0.20 25);       /* Soft red */
  
  /* Borders & inputs */
  --border: oklch(0.25 0.005 250);          /* Subtle dividers */
  --input: oklch(0.22 0.005 250);
  --ring: oklch(0.55 0.15 250);             /* Focus ring */
  
  /* Semantic colors */
  --positive: oklch(0.70 0.17 160);         /* Green - gains */
  --negative: oklch(0.65 0.20 25);          /* Red - losses */
  
  /* Chart palette */
  --chart-1: oklch(0.55 0.15 250);          /* Blue */
  --chart-2: oklch(0.70 0.17 160);          /* Green */
  --chart-3: oklch(0.65 0.20 25);           /* Red */
  --chart-4: oklch(0.70 0.15 80);           /* Amber */
  --chart-5: oklch(0.65 0.18 300);          /* Purple */
  
  /* Sidebar (darker variant) */
  --sidebar: oklch(0.10 0.005 250);
  --sidebar-foreground: oklch(0.88 0 0);
  --sidebar-primary: oklch(0.55 0.15 250);
  --sidebar-accent: oklch(0.18 0.005 250);
  --sidebar-border: oklch(0.22 0.005 250);
  
  /* Globe/map backgrounds */
  --globe-bg: oklch(0.08 0.005 250);
  --globe-surface: oklch(0.10 0.005 250);
}
```

#### 3.1.2 Light Mode

```css
:root {
  --background: oklch(0.97 0.002 250);
  --foreground: oklch(0.15 0.005 250);
  --card: oklch(1.0 0 0);
  --card-foreground: oklch(0.15 0.005 250);
  --popover: oklch(1.0 0 0);
  --popover-foreground: oklch(0.15 0.005 250);
  --primary: oklch(0.45 0.18 250);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.94 0.003 250);
  --secondary-foreground: oklch(0.25 0.005 250);
  --muted: oklch(0.94 0.003 250);
  --muted-foreground: oklch(0.45 0.01 250);
  --accent: oklch(0.94 0.006 250);
  --accent-foreground: oklch(0.15 0.005 250);
  --destructive: oklch(0.55 0.22 25);
  --border: oklch(0.88 0.005 250);
  --input: oklch(0.92 0.003 250);
  --ring: oklch(0.45 0.18 250);
  --positive: oklch(0.45 0.18 160);
  --negative: oklch(0.50 0.22 25);
  --chart-1: oklch(0.45 0.18 250);
  --chart-2: oklch(0.45 0.18 160);
  --chart-3: oklch(0.50 0.22 25);
  --chart-4: oklch(0.55 0.18 80);
  --chart-5: oklch(0.50 0.20 300);
  --sidebar: oklch(0.98 0.002 250);
  --sidebar-foreground: oklch(0.25 0.005 250);
  --sidebar-border: oklch(0.90 0.003 250);
  --globe-bg: oklch(0.94 0.003 250);
  --globe-surface: oklch(0.90 0.005 250);
}
```

#### 3.1.3 Semantic Status Colors

| Status | Dark Mode | Light Mode | Usage |
|--------|-----------|------------|-------|
| Positive/Gain | `oklch(0.70 0.17 160)` | `oklch(0.45 0.18 160)` | Price increases, bullish |
| Negative/Loss | `oklch(0.65 0.20 25)` | `oklch(0.50 0.22 25)` | Price decreases, bearish |
| Warning | `bg-amber-500/15 text-amber-400` | Similar | Elevated risk |
| Critical | `bg-red-500/15 text-red-400` | Similar | High severity |
| Info | `bg-blue-500/15 text-blue-400` | Similar | Neutral information |
| Success | `bg-emerald-500/15 text-emerald-400` | Similar | Normal status |

### 3.2 Typography

#### 3.2.1 Font Stack

```css
/* Primary sans-serif */
--font-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;

/* Monospace for data */
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

**Font Loading (Next.js):**

```typescript
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
```

#### 3.2.2 Type Scale

| Element | Size | Weight | Line Height | Use Case |
|---------|------|--------|-------------|----------|
| Page title | `text-base` (16px) | `font-medium` | snug | Card titles |
| Section header | `text-sm` (14px) | `font-semibold` | normal | Section labels |
| Body text | `text-sm` (14px) | `font-normal` | relaxed | Descriptions |
| Table header | `text-[10px]`–`text-[11px]` | `font-medium` | normal | Column headers |
| Table cell | `text-xs`–`text-[13px]` | `font-normal` | normal | Data values |
| Label | `text-[10px]` | `font-medium` | normal | KPI labels |
| Caption | `text-[9px]` | `font-medium` | normal | Sparkline labels |
| Ticker symbol | `text-xs` | `font-semibold` | normal | Stock symbols |

#### 3.2.3 Font Feature Settings

```css
body {
  font-feature-settings: "tnum" 1, "ss01" 1;
}

/* Tabular numerics for financial data */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Data display utility */
.font-data {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

### 3.3 Spacing System

Follows Tailwind's default 4px base unit with specific patterns:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-0.5` | 2px | Tight icon spacing |
| `gap-1` | 4px | Inline element spacing |
| `gap-1.5` | 6px | Button icon gap |
| `gap-2` | 8px | Standard element gap |
| `gap-2.5` | 10px | Nav item gap |
| `gap-3` | 12px | Card content gap |
| `gap-4` | 16px | Section spacing |
| `p-2` | 8px | Compact padding |
| `p-3` | 12px | Standard card padding |
| `p-4` | 16px | Generous card padding |
| `px-2.5` | 10px | Button horizontal padding |
| `py-1.5` | 6px | Nav item vertical padding |
| `py-2.5` | 10px | Table cell vertical padding |

### 3.4 Border Radius

```css
--radius: 0.375rem;  /* 6px base */

/* Computed variants */
--radius-sm: calc(var(--radius) * 0.6);   /* ~4px */
--radius-md: calc(var(--radius) * 0.8);   /* ~5px */
--radius-lg: var(--radius);               /* 6px */
--radius-xl: calc(var(--radius) * 1.4);   /* ~8px */
--radius-2xl: calc(var(--radius) * 1.8);  /* ~11px */
--radius-3xl: calc(var(--radius) * 2.2);  /* ~13px */
--radius-4xl: calc(var(--radius) * 2.6);  /* ~16px */
```

**Usage Patterns:**

| Element | Radius | Tailwind Class |
|---------|--------|----------------|
| Buttons | 8px | `rounded-lg` |
| Cards | 12px | `rounded-xl` |
| Inputs | 8px | `rounded-lg` |
| Badges | Full | `rounded-4xl` |
| Small buttons | 5px | `rounded-[min(var(--radius-md),10px)]` |
| Table cells | 2-3px | `rounded-sm` |

### 3.5 Shadows & Elevation

```css
/* Card shadow (subtle) */
ring-1 ring-foreground/10

/* Popover/dropdown shadow */
shadow-lg ring-1 ring-foreground/10

/* Focus ring */
focus-visible:ring-3 focus-visible:ring-ring/50

/* Invalid state ring */
aria-invalid:ring-3 aria-invalid:ring-destructive/20
```

---

## 4. Layout System

### 4.1 Application Shell

```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar]  │ [Top Header with Search]                    │
│  48px/192px │ h-12 (48px)                                │
├────────────┼─────────────────────────────────────────────┤
│            │ [Market Ticker Strip] h-8 (32px)            │
│            ├─────────────────────────────────────────────┤
│            │                                             │
│  Nav       │                                             │
│  Items     │          [Main Content Area]                │
│            │              padding: 16px                  │
│            │                                             │
│            │                                             │
│            │                                             │
│ [Theme]    │                                             │
│ [Collapse] │                                             │
└────────────┴─────────────────────────────────────────────┘
```

#### 4.1.1 Sidebar

```typescript
// Collapsed: w-12 (48px)
// Expanded: w-48 (192px)
// Transition: duration-200

const sidebarClasses = cn(
  "fixed left-0 top-0 bottom-0 z-40",
  "flex flex-col border-r border-sidebar-border bg-sidebar",
  "transition-all duration-200",
  sidebarExpanded ? "w-48" : "w-12"
);
```

**Sidebar Structure:**
1. Logo area (h-12) with gradient icon
2. Scrollable nav items
3. Theme toggle + collapse button at bottom

#### 4.1.2 Top Header

```typescript
// Fixed position, height h-12 (48px)
// Left offset matches sidebar width
const headerClasses = cn(
  "fixed top-0 right-0 z-30 h-12",
  "border-b border-border bg-background/95 backdrop-blur-sm",
  "flex items-center justify-between px-4 gap-3",
  "transition-all duration-200",
  sidebarExpanded ? "left-48" : "left-12"
);
```

**Header Components:**
- Global search input (max-w-lg)
- Market status indicator (live dot + time)
- Notifications dropdown
- User menu dropdown

#### 4.1.3 Market Ticker Strip

```typescript
// Below header, height h-8 (32px)
// Horizontally scrollable
const tickerClasses = cn(
  "fixed top-12 right-0 z-20 h-8",
  "border-b border-border bg-card/80 backdrop-blur-sm",
  "flex items-center overflow-x-auto",
  "transition-all duration-200",
  sidebarExpanded ? "left-48" : "left-12"
);
```

**Ticker Item Pattern:**
```jsx
<div className="flex items-center gap-1.5 px-3 text-xs whitespace-nowrap border-l border-border/50">
  <span className="text-muted-foreground font-medium">{symbol}</span>
  <span className="tabular-nums text-foreground font-medium">{value}</span>
  <span className={cn("tabular-nums font-medium", change > 0 ? "text-positive" : "text-negative")}>
    {change > 0 ? "+" : ""}{change.toFixed(2)}%
  </span>
</div>
```

#### 4.1.4 Main Content Area

```typescript
// Offset for header (12) + ticker (8) = 20 units
// pt-20 = 80px top padding
<main className={cn(
  "pt-20 min-h-screen",
  "transition-all duration-200",
  sidebarExpanded ? "pl-48" : "pl-12"
)}>
  <div className="p-4">{children}</div>
</main>
```

### 4.2 Grid Patterns

#### 4.2.1 Dashboard Grid

```jsx
{/* KPI Row - 6 columns on large screens */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
  {kpiCards}
</div>

{/* Main workspace - 12-column grid */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
  {/* Primary content - 8 columns */}
  <div className="lg:col-span-8 space-y-4">{mainContent}</div>
  
  {/* Sidebar panels - 4 columns */}
  <div className="lg:col-span-4 space-y-4">{sidePanels}</div>
</div>
```

#### 4.2.2 Responsive Breakpoints

| Breakpoint | Width | Typical Layout |
|------------|-------|----------------|
| Default | <640px | Single column, stacked |
| `sm:` | ≥640px | 2-3 columns |
| `md:` | ≥768px | Show secondary columns |
| `lg:` | ≥1024px | Full 12-column grid |
| `xl:` | ≥1280px | Extended density |

---

## 5. Component Specifications

### 5.1 Cards

#### 5.1.1 Base Card

```tsx
function Card({ className, size = "default", ...props }) {
  return (
    <div
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden",
        "rounded-xl bg-card py-4 text-sm text-card-foreground",
        "ring-1 ring-foreground/10",
        // Size variants
        "data-[size=sm]:gap-3 data-[size=sm]:py-3",
        className
      )}
      data-size={size}
      {...props}
    />
  );
}
```

**Card Sub-components:**

```tsx
// Header with optional action slot
function CardHeader({ className, ...props }) {
  return (
    <div className={cn(
      "grid auto-rows-min items-start gap-1 rounded-t-xl px-4",
      "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
      className
    )} {...props} />
  );
}

// Title - medium weight, base size
function CardTitle({ className, ...props }) {
  return (
    <div className={cn(
      "text-base leading-snug font-medium",
      "group-data-[size=sm]/card:text-sm",
      className
    )} {...props} />
  );
}

// Content with consistent padding
function CardContent({ className, ...props }) {
  return (
    <div className={cn(
      "px-4 group-data-[size=sm]/card:px-3",
      className
    )} {...props} />
  );
}

// Footer with muted background
function CardFooter({ className, ...props }) {
  return (
    <div className={cn(
      "flex items-center rounded-b-xl border-t bg-muted/50 p-4",
      className
    )} {...props} />
  );
}
```

### 5.2 Buttons

#### 5.2.1 Button Variants

```tsx
const buttonVariants = cva(
  // Base styles
  "group/button inline-flex shrink-0 items-center justify-center " +
  "rounded-lg border border-transparent bg-clip-padding " +
  "text-sm font-medium whitespace-nowrap transition-all outline-none select-none " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 " +
  "active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem]",
        lg: "h-9 gap-1.5 px-2.5",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 5.3 Badges

#### 5.3.1 Badge Variants

```tsx
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 " +
  "overflow-hidden rounded-4xl border border-transparent " +
  "px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all " +
  "[&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

#### 5.3.2 Status Badges (Custom)

```tsx
// Severity badge pattern
function SeverityBadge({ severity }) {
  const colors = {
    critical: "bg-red-500/15 text-red-400",
    high: "bg-orange-500/15 text-orange-400",
    medium: "bg-yellow-500/15 text-yellow-400",
    low: "bg-gray-500/15 text-gray-400",
  };
  return (
    <span className={cn(
      "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm",
      colors[severity]
    )}>
      {severity}
    </span>
  );
}

// Status badge pattern
function StatusBadge({ status }) {
  const colors = {
    normal: "bg-emerald-500/15 text-emerald-400",
    elevated: "bg-amber-500/15 text-amber-400",
    critical: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={cn(
      "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm",
      colors[status]
    )}>
      {status}
    </span>
  );
}
```

### 5.4 Tables

#### 5.4.1 Base Table Components

```tsx
function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }) {
  return (
    <tr className={cn(
      "border-b transition-colors",
      "hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )} {...props} />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th className={cn(
      "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
      className
    )} {...props} />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td className={cn(
      "p-2 align-middle whitespace-nowrap",
      className
    )} {...props} />
  );
}
```

#### 5.4.2 Financial Table Pattern

```tsx
// Header row styling
<TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
  <TableHead className="h-8 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    {/* Sortable header button */}
    <button className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <SortIcon column={column} />
    </button>
  </TableHead>
</TableRow>

// Data row styling
<TableRow className="border-b border-border/50 hover:bg-muted/20 transition-colors">
  {/* Symbol cell - sticky left */}
  <TableCell className="h-9 px-2 py-1 sticky left-0 z-10 bg-background">
    <span className="font-semibold text-foreground font-mono text-xs">{symbol}</span>
  </TableCell>
  
  {/* Numeric cell - right aligned */}
  <TableCell className="h-9 px-2 py-1">
    <span className="font-mono text-xs text-foreground tabular-nums text-right block">
      ${formatPrice(price)}
    </span>
  </TableCell>
  
  {/* Change cell - colored */}
  <TableCell className="h-9 px-2 py-1">
    <ChangeBadge value={change} format="percent" />
  </TableCell>
</TableRow>
```

### 5.5 Inputs

#### 5.5.1 Text Input

```tsx
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg",
        "border border-input bg-transparent",
        "px-2.5 py-1 text-base md:text-sm",
        "transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}
```

#### 5.5.2 Search Input Pattern

```tsx
<div className="relative flex-1 max-w-lg">
  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
  <input
    type="text"
    placeholder="Search tickers... (e.g. AAPL, MSFT)"
    className="w-full h-8 rounded-sm border border-border bg-input pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
  />
  {/* Autocomplete dropdown */}
  {focused && results.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-sm border border-border bg-popover shadow-lg overflow-hidden z-50">
      {results.map(item => (
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
          <span className="font-semibold text-foreground w-14">{item.symbol}</span>
          <span className="text-muted-foreground truncate">{item.name}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

### 5.6 Select/Dropdown

```tsx
function SelectTrigger({ className, size = "default", children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex w-fit items-center justify-between gap-1.5",
        "rounded-lg border border-input bg-transparent",
        "py-2 pr-2 pl-2.5 text-sm whitespace-nowrap",
        "transition-colors outline-none select-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[size=default]:h-8 data-[size=sm]:h-7",
        "dark:bg-input/30 dark:hover:bg-input/50",
        className
      )}
      data-size={size}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-4 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  );
}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5",
        "rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none",
        "focus:bg-accent focus:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
```

### 5.7 Tabs

```tsx
function TabsList({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-muted",
    line: "gap-1 bg-transparent",
  };
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-lg p-[3px]",
        "text-muted-foreground h-8",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5",
        "rounded-md border border-transparent px-1.5 py-0.5",
        "text-sm font-medium whitespace-nowrap text-foreground/60",
        "transition-all hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        // Active state
        "data-active:bg-background data-active:text-foreground data-active:shadow-sm",
        "dark:data-active:border-input dark:data-active:bg-input/30",
        className
      )}
      {...props}
    />
  );
}
```

---

## 6. Data Visualization

### 6.1 Chart Color Palette

```typescript
const CHART_COLORS = {
  // Primary series
  primary: "oklch(0.55 0.15 250)",      // Blue
  
  // Semantic colors
  positive: "oklch(0.70 0.17 160)",     // Green
  negative: "oklch(0.65 0.20 25)",      // Red
  
  // Multi-series palette
  series: [
    "#3b82f6",  // Blue
    "#10b981",  // Emerald
    "#f59e0b",  // Amber
    "#e11d48",  // Rose
    "#8b5cf6",  // Violet
    "#06b6d4",  // Cyan
  ],
  
  // Gradient stops for area charts
  gradientOpacity: {
    start: 0.3,
    end: 0,
  },
};
```

### 6.2 Area Chart

```tsx
function AreaChart({ data, height = 300, color = "#3b82f6" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} 
          tickFormatter={(v) => `$${v.toLocaleString()}`} 
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--foreground)",
          }}
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2} 
          fillOpacity={1} 
          fill="url(#colorValue)" 
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
```

### 6.3 Sparklines

```tsx
function Sparkline({ data, color = "auto", height = 24, width = 72 }) {
  // Auto-color based on trend
  const strokeColor = color === "auto"
    ? data[data.length - 1] >= data[0]
      ? "oklch(0.70 0.17 160)"  // Positive
      : "oklch(0.65 0.20 25)"   // Negative
    : color;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

### 6.4 Treemap

```tsx
function TreemapChart({ data, height = 300, colorScheme = "blue" }) {
  const colorSchemes = {
    blue: ["#2563eb", "#3b82f6", "#60a5fa", "#1d4ed8"],
    green: ["#16a34a", "#22c55e", "#4ade80", "#15803d"],
    multi: ["#3b82f6", "#22c55e", "#f59e0b", "#e11d48", "#8b5cf6"],
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={processedData}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="var(--background)"
        content={({ x, y, width, height, name, value, fill }) => (
          <g>
            <rect
              x={x} y={y}
              width={width} height={height}
              style={{ fill, stroke: "var(--background)", strokeWidth: 2 }}
            />
            {width > 50 && height > 40 && (
              <>
                <text
                  x={x + width / 2} y={y + height / 2 - 8}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={Math.min(14, width / 10)}
                  fontWeight="600"
                >
                  {name}
                </text>
                <text
                  x={x + width / 2} y={y + height / 2 + 10}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize={Math.min(12, width / 12)}
                >
                  {formatValue(value)}
                </text>
              </>
            )}
          </g>
        )}
      />
    </ResponsiveContainer>
  );
}
```

### 6.5 Sankey Diagram

Key implementation details for custom SVG Sankey:

```tsx
// Node colors (source and target columns)
const NODE_COLORS = {
  source: [
    "rgba(59,130,246,0.8)",   // Blue
    "rgba(16,185,129,0.8)",   // Emerald
    "rgba(245,158,11,0.8)",   // Amber
    "rgba(168,85,247,0.8)",   // Purple
  ],
  target: [
    "rgba(99,102,241,0.8)",   // Indigo
    "rgba(20,184,166,0.8)",   // Teal
    "rgba(234,179,8,0.8)",    // Yellow
    "rgba(139,92,246,0.8)",   // Violet
  ],
};

// Link path (cubic bezier curves)
const linkPath = (sx, sy0, sy1, tx, ty0, ty1) => {
  const mx = (sx + tx) / 2;
  return `M ${sx} ${sy0} C ${mx} ${sy0}, ${mx} ${ty0}, ${tx} ${ty0} L ${tx} ${ty1} C ${mx} ${ty1}, ${mx} ${sy1}, ${sx} ${sy1} Z`;
};

// Gradient fill for links
<linearGradient id={`gradient-${i}`} gradientUnits="userSpaceOnUse">
  <stop offset="0%" stopColor={sourceColor} stopOpacity={0.5} />
  <stop offset="100%" stopColor={targetColor} stopOpacity={0.5} />
</linearGradient>
```

### 6.6 Tooltip Styling

```tsx
// Consistent tooltip styling across all charts
const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--foreground)",
    fontSize: "12px",
    padding: "8px 12px",
  },
  labelStyle: {
    color: "var(--muted-foreground)",
    marginBottom: "4px",
  },
};
```

---

## 7. Shared Components

### 7.1 Change Badge

```tsx
function ChangeBadge({ value, format = "percent" }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const formatted = (() => {
    const sign = isPositive ? "+" : "";
    switch (format) {
      case "percent":
        return `${sign}${value.toFixed(2)}%`;
      case "currency":
        return `${sign}$${Math.abs(value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      default:
        return `${sign}${value.toFixed(2)}`;
    }
  })();

  return (
    <span className={cn(
      "inline-flex items-center text-xs font-medium tabular-nums",
      isPositive && "text-positive",
      !isPositive && !isNeutral && "text-negative",
      isNeutral && "text-muted-foreground"
    )}>
      {formatted}
    </span>
  );
}
```

### 7.2 KPI Stat Card

```tsx
function KpiStatCard({ label, value, change, changeFormat = "percent", subtitle }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {change !== undefined && (
          <ChangeBadge value={change} format={changeFormat} />
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
```

### 7.3 Section Header

```tsx
function SectionHeader({ title }) {
  return (
    <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
  );
}
```

### 7.4 Stat Box (Detail Panels)

```tsx
function StatBox({ label, value }) {
  return (
    <div className="p-2 rounded-sm bg-accent/20 border border-border">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">
        {label}
      </span>
      <span className="text-[13px] font-mono font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}
```

### 7.5 Mini Chart

```tsx
function MiniChart({ data, color = "auto", height = 24, width = 72 }) {
  const trend = data[data.length - 1] - data[0];
  const strokeColor = color === "auto"
    ? trend >= 0 ? "#10b981" : "#ef4444"
    : color;

  return (
    <svg width={width} height={height}>
      <polyline
        points={generatePoints(data, width, height)}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
      />
    </svg>
  );
}
```

---

## 8. Navigation Patterns

### 8.1 Sidebar Navigation Item

```tsx
<Link
  href={item.href}
  className={cn(
    "flex items-center gap-2.5 rounded-sm px-2 py-1.5",
    "text-[13px] font-medium transition-colors",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
  )}
>
  <Icon className="h-4 w-4 flex-shrink-0" />
  {sidebarExpanded && <span className="truncate">{item.label}</span>}
</Link>
```

### 8.2 Dropdown Menu Pattern

```tsx
// Trigger
<button className="relative h-8 w-8 rounded-sm flex items-center justify-center hover:bg-accent transition-colors">
  <Bell className="h-4 w-4 text-muted-foreground" />
  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-negative text-[9px] font-bold text-white">
    {count}
  </span>
</button>

// Dropdown
<div className="absolute right-0 top-full mt-1 w-72 rounded-sm border border-border bg-popover shadow-lg z-50">
  {/* Header */}
  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
    <span className="text-[13px] font-semibold text-foreground">Title</span>
    <button className="text-[11px] text-primary hover:text-primary/80">Action</button>
  </div>
  
  {/* Items */}
  <div className="max-h-64 overflow-y-auto">
    {items.map(item => (
      <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 cursor-pointer border-b border-border/50 transition-colors">
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-amber-500" />
        <div>
          <p className="text-[13px] text-foreground">{item.title}</p>
          <span className="text-[11px] text-muted-foreground">{item.time}</span>
        </div>
      </div>
    ))}
  </div>
  
  {/* Footer */}
  <div className="px-3 py-2 border-t border-border">
    <button className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors">
      View all
    </button>
  </div>
</div>
```

### 8.3 User Menu

```tsx
<div className="relative">
  <button className="flex items-center gap-2 rounded-sm border border-border bg-card p-1 pr-2.5 hover:bg-accent/50 transition-colors">
    {/* Avatar */}
    <div className="h-7 w-7 rounded-sm bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <span className="text-xs font-bold text-white">{initial}</span>
    </div>
    {/* Name/role */}
    <div className="hidden sm:block text-left">
      <span className="text-[13px] font-medium text-foreground block leading-tight">{name}</span>
      <span className="text-[9px] text-muted-foreground leading-tight">{role}</span>
    </div>
    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
  </button>
</div>
```

---

## 9. Utility Functions

### 9.1 Number Formatting

```typescript
// Price formatting (adaptive precision)
export function formatPrice(n: number): string {
  if (Math.abs(n) < 1) return n.toFixed(4);
  if (Math.abs(n) < 10) return n.toFixed(3);
  return n.toFixed(2);
}

// Percentage with sign
export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// Market cap (T/B/M suffixes)
export function formatMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// Volume (compact)
export function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

// Compact notation
export function formatCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
```

### 9.2 Class Name Utility

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 9.3 Change Color Utility

```typescript
export function getChangeColor(change: number): string {
  if (change > 0) return "text-positive";
  if (change < 0) return "text-negative";
  return "text-muted-foreground";
}
```

---

## 10. Responsive Patterns

### 10.1 Mobile Considerations

- Sidebar collapses to icon-only (48px) on mobile
- Tables hide secondary columns (`hidden md:table-cell`, `hidden lg:table-cell`)
- Market ticker strip is horizontally scrollable
- Cards stack vertically on narrow screens
- Grid switches from 12-column to single column

### 10.2 Breakpoint-Specific Adjustments

```tsx
// Hide on mobile, show on sm+
<div className="hidden sm:flex">...</div>

// Hide sparkline column on mobile
<td className="py-2.5 px-3 w-28 hidden sm:table-cell">
  <Sparkline data={sparkline} />
</td>

// Responsive grid
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
  {kpiCards}
</div>

// Text size adjustments
<input className="text-base md:text-sm" />
```

---

## 11. Scrollbar Styling

```css
/* Scrollbar dimensions */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* Dark mode scrollbar */
.dark ::-webkit-scrollbar-thumb {
  background: oklch(0.30 0.005 250);
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: oklch(0.40 0.005 250);
}

/* Light mode scrollbar */
:root ::-webkit-scrollbar-thumb {
  background: oklch(0.78 0.005 250);
}

:root ::-webkit-scrollbar-thumb:hover {
  background: oklch(0.68 0.005 250);
}
```

---

## 12. Animation & Transitions

### 12.1 Standard Transitions

```css
/* Layout transitions (sidebar, header) */
transition-all duration-200

/* Color/opacity transitions */
transition-colors

/* Hover states */
hover:bg-accent transition-colors

/* Button press feedback */
active:translate-y-px
```

### 12.2 Animate-In Patterns

```tsx
// Slide-in panel
className="animate-in slide-in-from-right-4 duration-200"

// Dropdown appear
className="data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
className="data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

// Direction-based slide
className="data-[side=bottom]:slide-in-from-top-2"
className="data-[side=top]:slide-in-from-bottom-2"
```

### 12.3 Live Indicators

```tsx
// Market status pulse
<span className="relative flex h-1.5 w-1.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
</span>
```

---

## 13. Accessibility Considerations

### 13.1 Focus States

```css
/* Standard focus ring */
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50

/* Button outline focus */
focus-visible:outline-1 focus-visible:outline-ring

/* Invalid state */
aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20
```

### 13.2 Keyboard Navigation

- All interactive elements are focusable
- Dropdowns support arrow key navigation
- Tables support keyboard sorting
- Tab order follows visual layout

### 13.3 Screen Reader Support

- Semantic HTML elements (table, nav, main, header)
- ARIA labels on icon-only buttons
- Data slots for component relationships
- Hidden labels where visual context is clear

---

## 14. File Structure

```
src/
├── app/
│   ├── globals.css              # Design tokens, base styles
│   ├── layout.tsx               # Root layout, font loading
│   ├── page.tsx                 # Landing/home page
│   └── (dashboard)/
│       ├── layout.tsx           # Dashboard shell
│       ├── page.tsx             # Dashboard home
│       ├── markets/page.tsx
│       ├── portfolio/page.tsx
│       ├── screener/page.tsx
│       └── ...
├── components/
│   ├── ui/                      # Base UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── layout/                  # App shell components
│   │   ├── app-shell.tsx
│   │   ├── sidebar-nav.tsx
│   │   ├── top-header.tsx
│   │   └── market-ticker-strip.tsx
│   ├── charts/                  # Visualization components
│   │   ├── area-chart.tsx
│   │   ├── candlestick-chart.tsx
│   │   ├── treemap-chart.tsx
│   │   ├── sankey-chart.tsx
│   │   ├── sparkline.tsx
│   │   └── ...
│   ├── shared/                  # Reusable patterns
│   │   ├── change-badge.tsx
│   │   ├── kpi-stat-card.tsx
│   │   ├── mini-chart.tsx
│   │   └── section-header.tsx
│   └── [feature]/               # Feature-specific components
│       └── ...
├── lib/
│   ├── utils.ts                 # cn() helper
│   └── format.ts                # Number formatters
├── stores/
│   ├── ui-store.ts              # Sidebar, theme state
│   └── ...
├── types/
│   └── ...
└── data/
    └── ...                      # Mock data
```

---

## 15. Implementation Checklist

### 15.1 Foundation Setup

- [ ] Next.js 16+ with App Router
- [ ] Tailwind CSS 4.x with postcss
- [ ] shadcn/ui initialization
- [ ] IBM Plex Sans + JetBrains Mono fonts
- [ ] Dark mode as default (`<html className="dark">`)

### 15.2 Design Tokens

- [ ] OKLCH color variables in globals.css
- [ ] Radius scale variables
- [ ] CSS custom properties for theming
- [ ] Scrollbar styling

### 15.3 Core Components

- [ ] Button with all variants/sizes
- [ ] Card with header/content/footer
- [ ] Input with search variant
- [ ] Select/Dropdown
- [ ] Table with sorting
- [ ] Tabs (default + line variants)
- [ ] Badge with status variants

### 15.4 Layout

- [ ] AppShell with sidebar + header + ticker
- [ ] Collapsible sidebar with state
- [ ] Fixed header with search
- [ ] Market ticker strip
- [ ] Responsive main content area

### 15.5 Data Visualization

- [ ] Area chart with gradient
- [ ] Sparklines (auto-color)
- [ ] Treemap
- [ ] Candlestick chart
- [ ] Sankey diagram (optional)

### 15.6 Shared Components

- [ ] ChangeBadge
- [ ] KpiStatCard
- [ ] SectionHeader
- [ ] MiniChart

### 15.7 Utilities

- [ ] cn() class merger
- [ ] Number formatters (price, pct, marketCap, volume)
- [ ] Zustand UI store

---

## 16. Conclusion

This specification captures the complete visual and technical DNA of q_intel's professional fintech interface. By following these patterns, developers can create equally polished, information-dense dashboards suitable for trading, analytics, or any data-intensive financial application.

The key principles are:
1. **Dark-first design** with OKLCH colors for perceptual consistency
2. **Dense but readable** typography with tabular numerics
3. **Consistent component patterns** across all UI elements
4. **Professional data visualization** with semantic coloring
5. **Subtle interactions** that don't distract from data

---

**Document Version:** 1.0  
**Author:** Atlas Sage  
**Based on:** q_intel v0.1.0 codebase analysis  
**License:** Internal use only
