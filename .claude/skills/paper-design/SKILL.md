---
name: paper-design
description: Design UI prototypes in Paper MCP following the Talkient design system. Use when the user wants to create, update, or explore UI designs, mockups, or component prototypes on the Paper canvas.
argument-hint: [component or page to design]
allowed-tools: Read, Glob
---

Create or update a UI prototype in Paper following the Talkient design system.

## Design System Reference

**Colors (dark mode defaults)**
- Background: `#09090b` · Card surface: `rgba(255,255,255,0.04)`
- Foreground: `#ffffff` · Secondary text: `rgba(255,255,255,0.4)`
- Brand blue (primary/accent): `#2563EB`
- Destructive: `rgb(239,68,68)`
- Borders: `rgba(255,255,255,0.08–0.12)`

**Typography**
- Headings/labels: `Work Sans` · Body/UI text: `Open Sans`
- Section labels: 11px, 600 weight, uppercase, letter-spacing 0.1em, color `#2563EB`
- Row labels: 14px, 600 weight, white
- Descriptions: 12–13px, `rgba(255,255,255,0.4)`
- Values/numbers: Work Sans 16px, 700 weight, `#2563EB`

**Spacing (4px base)**
- Row internal padding: `16px 20px` · Section gap: `40px`
- Control gap: `8px` · Element gap: `6–8px`

**Radius**
- Cards/rows: `10px` · Controls (inputs, selects): `8px`
- Chips/badges: `6px` · Toggles/pills: `9999px`

**Shadows** — subtle only: `0 1px 2px rgba(0,0,0,0.3)`

## Workflow

1. Call `get_basic_info` to understand the file and available artboards.
2. Call `get_screenshot` on relevant artboards to understand the existing visual context.
3. Create a new artboard with `create_artboard` if building something new. Use dark background `#09090b`.
4. Build incrementally — **one visual group per `write_html` call** (header, one section, one row, one button group). Never batch the entire design into one call.
5. Use `update_styles` for targeted fixes — never rewrite a whole section to change one color.
6. **Mandatory review**: after every 2–3 `write_html` calls, take a `get_screenshot` and evaluate spacing, contrast, alignment, clipping, and typography before continuing.
7. Call `finish_working_on_nodes` when done.

## HTML Rules

- All styles inline. Layout via `display: flex` only (no grid, no margins, no `display: block` on containers).
- Font references: `'Work Sans', sans-serif` and `'Open Sans', sans-serif` (both available via Google Fonts).
- No emojis as icons — use inline SVG only.
- Assume `box-sizing: border-box`.
- Use `rgba` or hex colors; oklch is supported but hex is preferred for readability.

## Component Patterns

**Toggle (on):** 44×24px pill, bg `#2563EB`, white 18px thumb at right (3px inset)
**Toggle (off):** same pill, bg `rgba(255,255,255,0.12)`, thumb at left, color `rgba(255,255,255,0.6)`
**Select/dropdown:** bg `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.12)`, radius 8px, chevron SVG
**Stepper (number input):** minus | value | plus, each cell separated by `rgba(255,255,255,0.08)` border
**Slider:** 4px track `rgba(255,255,255,0.1)`, fill `#2563EB`, 14px white thumb with shadow
**Tag chip (selected):** bg `rgba(37,99,235,0.2)`, border `rgba(37,99,235,0.5)`, text `#93b8fd`
**Tag chip (unselected):** bg `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.1)`, text `rgba(255,255,255,0.55)`
**Primary button:** bg `#2563EB`, radius 8px, white text, Open Sans 13px 600
**Destructive button:** transparent bg, border `rgba(239,68,68,0.5)`, text `rgba(239,68,68,0.8)`
**Kbd key:** bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.15)`, radius 6px, Work Sans 11px 600
