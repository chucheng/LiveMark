# LiveMark Light Theme — GitHub-Aligned Design Review

## 1. Design Direction Summary

The goal is to bring LiveMark's light theme to **80–90% visual parity with GitHub's Primer design system** — the clean, restrained, developer-friendly aesthetic that millions of users already recognize. Where our current design is already stronger or more distinctive (code blocks, live-render UX), we keep it. Everything else — backgrounds, borders, text hierarchy, form controls, interactive states — should feel like "this could be a GitHub product."

This is a **baseline alignment**, not a clone. We adopt GitHub's color temperature, contrast ratios, and interaction patterns as our foundation, then layer our identity on top.

---

## 2. What Should Match GitHub Closely

### Color System

Our current palette is slightly cooler/grayer than GitHub's warm-neutral tone. Key shifts needed:

| Role | Current (LiveMark) | GitHub Primer | Delta |
|------|-------------------|---------------|-------|
| Page background | `#fafafa` | `#ffffff` | Warmer, pure white |
| Surface/muted bg | `#f4f4f6` | `#f6f8fa` | Slightly warmer |
| Primary text | `#1c1c22` | `#1f2328` | Very close, slightly warmer |
| Muted text | `#7c818c` | `#59636e` | **GitHub is significantly darker** |
| Faint/disabled text | `#a0a4ad` | `#818b98` | **GitHub is darker here too** |
| Accent/link | `#4a8ed0` | `#0969da` | **GitHub is more saturated blue** |
| Border | `#e8e9ec` | `#d1d9e0` | **GitHub is noticeably darker** |
| Subtle border | `#f0f0f2` | `#d1d9e0b3` (70% opacity) | GitHub uses opacity |
| Hover | `rgba(0,0,0,0.035)` | `#818b981a` (~10% gray) | Similar approach |
| Selection | `rgba(74,142,208,0.14)` | `#0969da33` (~20% blue) | GitHub is more visible |

**Key insight:** Our current palette is too low-contrast for secondary text and borders. GitHub's muted text (`#59636e`) is much more readable than ours (`#7c818c`). This is the single biggest visual difference.

### Form Components & Interactive States

GitHub uses a consistent pattern:
- **Rest**: `#f6f8fa` bg, `#d1d9e0` border
- **Hover**: `#eff2f5` bg
- **Active/Pressed**: `#e6eaef` bg
- **Disabled**: `#eff2f5` bg, `#818b98` text at reduced opacity
- **Focus**: 2px solid `#0969da` outline

We currently lack this level of state granularity.

### Borders & Surface Hierarchy

GitHub uses **3 clear border levels**:
- Default: `#d1d9e0`
- Muted: `#d1d9e0b3` (same color, reduced opacity)
- Emphasis: `#818b98`

We have 2 levels (`#e8e9ec` and `#f0f0f2`) which are both too light.

### Shadows

GitHub's shadow system is more structured:
- Resting: Very subtle (`rgba(31,35,40,0.04)`)
- Floating small: Ring + shadow combo
- Floating medium/large: Multi-layer depth

Our shadows are reasonable but should adopt the ring + shadow pattern for overlays.

---

## 3. What Can Keep Our Own Style

### Code Blocks
Our code block styling with the highlight.js overlay, language badge, and dual-layer approach is distinctive. The syntax highlighting colors (keywords in red, strings in green, comments in gray) work well. Keep these.

### Horizontal Rules
Our gradient lines with ornament symbol are more interesting than GitHub's plain `<hr>`.

### Live-Render Syntax Hints
The muted mono syntax markers are unique to our editor paradigm. No GitHub equivalent — keep as-is but ensure they use the new muted text color.

### Typography & Content Spacing
Our `line-height: 1.7` and content width (`720px`) create a more readable editing experience than GitHub's tighter spacing. Keep these for the editor area.

### Review Panel
The slide-in panel with severity colors is our own feature. Just update the base colors to align with Primer's semantic palette.

---

## 4. Recommended Light Theme Design Tokens

```css
:root {
  /* ── Canvas / Background ── */
  --lm-bg:              #ffffff;     /* GitHub: canvas.default */
  --lm-bg-surface:      #f6f8fa;     /* GitHub: canvas.subtle */
  --lm-bg-elevated:     #ffffff;     /* GitHub: overlay.bgColor */
  --lm-bg-inset:        #f6f8fa;     /* GitHub: canvas.inset */
  --lm-bg-emphasis:     #25292e;     /* GitHub: canvas.emphasis (for inverted) */

  /* ── Foreground / Text ── */
  --lm-text:            #1f2328;     /* GitHub: fg.default */
  --lm-text-muted:      #59636e;     /* GitHub: fg.muted — BIG change from #7c818c */
  --lm-text-faint:      #818b98;     /* GitHub: fg.disabled */
  --lm-text-on-emphasis: #ffffff;    /* GitHub: fg.onEmphasis */

  /* ── Accent / Primary ── */
  --lm-accent:          #0969da;     /* GitHub: accent.fg — more saturated than #4a8ed0 */
  --lm-accent-emphasis: #0550ae;     /* Darker accent for text on colored bg */
  --lm-accent-muted:    #54aeff66;   /* Light accent for subtle backgrounds */

  /* ── Border ── */
  --lm-border:          #d1d9e0;     /* GitHub: border.default — darker than #e8e9ec */
  --lm-border-muted:    #d1d9e0b3;   /* GitHub: border.muted (70% opacity) */
  --lm-border-emphasis: #818b98;     /* GitHub: border.emphasis */

  /* ── Semantic: Success ── */
  --lm-success:         #1a7f37;     /* GitHub: success.fg */
  --lm-success-emphasis:#1f883d;     /* GitHub: success.emphasis (button bg) */
  --lm-success-muted:   #dafbe1;     /* Light green background */

  /* ── Semantic: Warning ── */
  --lm-warning:         #9a6700;     /* GitHub: attention.fg */
  --lm-warning-emphasis:#9a6700;     /* GitHub: attention.emphasis */
  --lm-warning-muted:   #fff8c5;     /* Light yellow background */

  /* ── Semantic: Danger ── */
  --lm-danger:          #d1242f;     /* GitHub: danger.fg */
  --lm-danger-emphasis: #cf222e;     /* GitHub: danger.emphasis */
  --lm-danger-muted:    #ffebe9;     /* Light red background */

  /* ── Semantic: Info ── */
  --lm-info:            #0969da;     /* Same as accent */
  --lm-info-muted:      #ddf4ff;     /* Light blue background */

  /* ── Interactive States ── */
  --lm-hover:           #f3f4f6;     /* Close to GitHub's #eff2f5 */
  --lm-active:          #e6eaef;     /* GitHub: control.bgColor.active */
  --lm-selected:        #f6f8fa;     /* GitHub: control.bgColor.selected */
  --lm-disabled-bg:     #eff2f5;     /* GitHub: control.bgColor.disabled */
  --lm-disabled-fg:     #818b98;     /* GitHub: fg.disabled */

  /* ── Focus ── */
  --lm-focus-ring:      #0969da;     /* GitHub uses 2px solid blue outline */
  --lm-focus-ring-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); /* Optional glow */

  /* ── Selection ── */
  --lm-selection:       #0969da33;   /* GitHub: selection.bgColor (~20% blue) */

  /* ── Code (KEEP OUR STYLE) ── */
  --lm-code-bg:         #f2f2f6;     /* Keep our slightly purple-tinted code bg */
  --lm-code-text:       #c4407d;     /* Keep our inline code pink */
  --lm-blockquote-border: #d0d4dc;   /* Align closer to border default */

  /* ── Severity (Review Panel — updated to Primer palette) ── */
  --lm-severity-issue:      #d1242f; /* Danger */
  --lm-severity-warning:    #9a6700; /* Attention */
  --lm-severity-suggestion: #0969da; /* Accent */

  /* ── Control (new — for form components) ── */
  --lm-control-bg:      #f6f8fa;     /* GitHub: control.bgColor.rest */
  --lm-control-border:  #d1d9e0;     /* GitHub: control.borderColor.rest */
  --lm-control-checked: #0969da;     /* GitHub: control.checked.bgColor */

  /* ── Shadows (updated to Primer pattern) ── */
  --lm-shadow-sm: 0 1px 1px rgba(31,35,40,0.04);
  --lm-shadow-md: 0 0 0 1px #d1d9e080, 0 6px 12px -3px rgba(37,41,46,0.04), 0 6px 18px 0 rgba(37,41,46,0.12);
  --lm-shadow-lg: 0 0 0 1px #d1d9e000, 0 8px 16px -4px rgba(37,41,46,0.08), 0 4px 32px -4px rgba(37,41,46,0.08);

  /* ── Button (new) ── */
  --lm-btn-bg:          #f6f8fa;
  --lm-btn-bg-hover:    #eff2f5;
  --lm-btn-bg-active:   #e6eaef;
  --lm-btn-border:      #d1d9e0;
  --lm-btn-shadow:      0 1px 0 rgba(31,35,40,0.04);

  --lm-btn-primary-bg:       #1f883d;
  --lm-btn-primary-bg-hover: #1c8139;
  --lm-btn-primary-fg:       #ffffff;

  --lm-btn-danger-fg:         #d1242f;
  --lm-btn-danger-bg-hover:   #cf222e;
  --lm-btn-danger-fg-hover:   #ffffff;

  /* ── Overlay ── */
  --lm-overlay-backdrop: #c8d1da66;  /* GitHub: overlay.backdrop */

  /* ── Keep existing ── */
  --lm-font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --lm-font-mono: "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace;
  --lm-font-size: 16px;
  --lm-line-height: 1.7;
  --lm-content-width: 720px;
  --lm-editor-padding-x: 48px;
  --lm-editor-padding-y: 32px;
  --lm-heading-1: 1.875em;
  --lm-heading-2: 1.4em;
  --lm-heading-3: 1.2em;
  --lm-heading-4: 1.05em;
  --lm-heading-5: 1em;
  --lm-heading-6: 0.9em;
  --lm-radius-sm: 6px;      /* Bumped from 4px — GitHub uses 6px */
  --lm-radius-md: 6px;
  --lm-radius-lg: 12px;     /* Bumped from 10px */
  --lm-transition-fast: 120ms ease;
  --lm-transition-base: 160ms ease;
}
```

---

## 5. Component-by-Component Recommendations

### Button

**Visual direction:** Follow GitHub's default button exactly — `#f6f8fa` bg, `#d1d9e0` border, subtle bottom shadow.

**States:**

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Rest | `#f6f8fa` | `#d1d9e0` | `#25292e` |
| Hover | `#eff2f5` | `#d1d9e0` | `#25292e` |
| Active | `#e6eaef` | `#d1d9e0` | `#25292e` |
| Disabled | `#eff2f5` | `#818b981a` | `#818b98` |
| Focus | + `0 0 0 3px #0969da4d` | — | — |

**Primary button:** Green (`#1f883d`) bg, white text. Not blue — this is a key GitHub pattern.
**Danger button:** Default bg at rest, red text. On hover, fills red with white text.

**Match GitHub:** Closely. Our current buttons (borderless hover in status bar, accent bg in about modal) need alignment.

### Input / Textarea

**Visual direction:** White bg, 1px `#d1d9e0` border, `6px` radius.

**States:**

| State | Background | Border |
|-------|-----------|--------|
| Rest | `#ffffff` | `#d1d9e0` |
| Hover | `#ffffff` | `#d1d9e0` |
| Focus | `#ffffff` | `#0969da` + `0 0 0 3px #0969da4d` shadow |
| Error | `#ffffff` | `#cf222e` |
| Disabled | `#f6f8fa` | `#818b981a` |

**Placeholder:** `#59636e` (not faint — GitHub uses muted color).

**Match GitHub:** Very closely. Our find-replace input (`200px`, `13px` font, accent border on focus) is already close but needs the focus ring shadow.

### Select

**Visual direction:** Same as input, with a chevron icon (`#59636e`) right-aligned. Background `#f6f8fa` (matches GitHub's control bg pattern — select has a tinted bg unlike input).

**Match GitHub:** Closely.

### Checkbox

**Visual direction:** GitHub checkboxes are `16x16`, `#ffffff` bg, `#d1d9e0` border, `3px` radius. Checked state: `#0969da` blue bg with white checkmark.

**States:**

| State | Background | Border |
|-------|-----------|--------|
| Unchecked | `#ffffff` | `#d1d9e0` |
| Checked | `#0969da` | `#0969da` |
| Hover (unchecked) | `#ffffff` | `#d1d9e0` (cursor: pointer) |
| Disabled | `#eff2f5` | `#818b981a` |

Our current task list checkboxes use text characters. For any native-style checkboxes in UI chrome, use the GitHub pattern. The editor task list symbols can remain.

**Match GitHub:** Closely for UI chrome.

### Radio

**Visual direction:** `16x16` circle, same color pattern as checkbox. Checked: blue outer ring + filled blue dot inside.

**Match GitHub:** Closely (if/when we add radio inputs).

### Switch / Toggle

**Visual direction:** GitHub's toggle track:
- Off: `#e6eaef` track, white knob, `#d1d9e0` knob border
- On: `#0969da` track, white knob
- Track size: ~32x16px, fully rounded

**Match GitHub:** Closely.

### Tabs

**Visual direction:** GitHub uses an **underline tab** pattern:
- Default text: `#59636e` (muted)
- Active text: `#1f2328` (default)
- Active indicator: `#fd8c73` (salmon/orange underline, 2px) — distinctive Primer touch
- Hover: `#d1d9e0b3` bottom border

**Match GitHub:** Closely.

### Table

**Visual direction:** GitHub tables:
- Header: `#f6f8fa` bg, `#d1d9e0` border-bottom (2px)
- Rows: `#ffffff` bg, 1px `#d1d9e0` border-bottom
- Hover: `#f6f8fa` bg on row
- Padding: `6px 13px`

Our editor tables already have styling in `editor.css`. For data tables in UI panels, follow GitHub's pattern.

**Match GitHub:** Closely for chrome tables. Editor markdown tables can keep their current look.

### Dropdown / Popover

**Visual direction:** GitHub overlay pattern:
- `#ffffff` bg
- `1px #d1d9e080` border (with opacity!)
- Multi-layer shadow (ring + depth)
- Items: `8px 16px` padding, `6px` radius on hover

Our command palette already uses this pattern loosely. Align the shadow and border to match Primer.

**Match GitHub:** Closely.

### Modal

**Visual direction:**
- `#c8d1da66` backdrop (GitHub's warm gray, not pure black)
- `#ffffff` bg, `12px` radius
- Header with bottom border
- Multi-layer shadow (large)

Our about modal and command palette overlay should adopt this backdrop color and shadow.

**Match GitHub:** Closely. Our current backdrop should become `#c8d1da66`.

### Tooltip

**Visual direction:** GitHub tooltips:
- `#25292e` bg (dark emphasis)
- `#ffffff` text
- `6px` radius
- `6px 10px` padding
- Small shadow
- 10px arrow

**Match GitHub:** Closely.

### Badge / Label

**Visual direction:** GitHub uses tinted labels:
- Background: light tint of semantic color (e.g., `#dafbe1` for success)
- Text: darker version of same color (e.g., `#1a7f37`)
- Border: transparent
- Radius: `2em` (fully rounded pill)

Our review panel badges (issue/warning/suggestion) should follow this pattern.

**Match GitHub:** Closely.

### Alert

**Visual direction:** Full-width banner with:
- Tinted background (e.g., `#fff8c5` for warning)
- Left border accent (4px, semantic color)
- Icon in semantic color
- Text in `#1f2328` (default)

**Match GitHub:** Closely.

### Card

**Visual direction:** GitHub cards:
- `#ffffff` bg
- `1px #d1d9e0` border
- `6px` radius
- No shadow at rest (border-only)
- Hover: subtle shadow appearance (optional)

**Match GitHub:** Closely.

### Link

**Visual direction:**
- Color: `#0969da`
- Hover: underline
- No color change on hover (stays same blue)

Our current `--lm-accent: #4a8ed0` is less saturated. The shift to `#0969da` will make links feel more GitHub-like.

**Match GitHub:** Closely.

### Pagination

**Visual direction:** (future component)
- Current page: `#0969da` bg, white text, `6px` radius
- Other pages: transparent bg, `#1f2328` text
- Hover: `#f6f8fa` bg
- Disabled: `#818b98` text

**Match GitHub:** Closely.

---

## 6. Enhancement Ideas (Front-End Plugin Thinking)

### 1. Standardize Focus Ring Across All Interactive Elements
**Current:** Only find-replace input has visible focus. Status bar buttons, command palette items, and other interactive elements lack consistent focus indicators.
**Proposal:** Apply `0 0 0 3px rgba(9,105,218,0.3)` outline to all focusable elements. Both a GitHub alignment and accessibility improvement.

### 2. Add Transition to State Changes
**Current:** Some hover states are instant, others use `--lm-transition-fast`.
**Proposal:** Standardize all interactive state transitions to `80ms ease-out` for hover bg changes, and `0ms` for focus ring (focus should be instant). GitHub uses very fast transitions that feel crisp.

### 3. Replace Opacity-Based Disabled States with Dedicated Colors
**Current:** Some disabled elements use `opacity: 0.5`.
**Proposal:** Use `--lm-disabled-bg` and `--lm-disabled-fg` tokens instead. Opacity affects the entire element including borders, which looks muddy. GitHub never uses opacity for disabled states.

### 4. Adopt Ring + Shadow Pattern for Elevated Surfaces
**Current:** Shadows are standalone drop shadows.
**Proposal:** For overlays (command palette, modals), use GitHub's pattern: `0 0 0 1px border-color` (ring) + depth shadow. The ring provides crispness at the edge even when the shadow is subtle.

### 5. Warmer Backdrop for Overlays
**Current:** Likely using `rgba(0,0,0,...)` black overlay.
**Proposal:** Switch to `#c8d1da66` — GitHub's warm gray backdrop. Feels less oppressive and more integrated with the light theme.

### 6. Consistent Padding/Spacing Scale
**Current:** Mixed padding values (4px, 6px, 8px, 10px, 12px, 16px, etc.).
**Proposal:** Adopt a 4px base grid: `4, 8, 12, 16, 24, 32, 48`. Establishing the scale as a convention improves visual consistency.

### 7. Improve Command Palette Item Density
**Current:** Items have `gap: 10px` and mixed padding.
**Proposal:** Match GitHub's command palette density: `8px 16px` per item, `4px` gap between items, `6px` radius on hover highlight. Tighter density = more visible items.

### 8. Status Bar Polish
**Current:** `11.5px` text, borderless buttons.
**Proposal:** Keep minimal approach but: (a) use `--lm-text-faint` for non-interactive text, (b) add subtle `--lm-hover` background on button hover with `4px` radius, (c) ensure keyboard accessibility with focus ring.

### 9. Scrollbar Styling
**Current:** Thin 4px scrollbar in review panel.
**Proposal:** Standardize: `6px` width, `--lm-border` track, `--lm-text-faint` thumb, rounded. Hide track until hover.

### 10. Skeleton/Loading States
**Proposal:** For future async operations, add a `--lm-skeleton` token (`#e6eaef`) for placeholder shimmer animations. Prevents layout shift.

---

## 7. Final Recommendation

### Nearly Identical to GitHub (90%+)
- **Background/canvas system** — pure white base, `#f6f8fa` surface
- **Text hierarchy** — the shift to `#59636e` muted text is the single highest-impact change
- **Borders** — moving to `#d1d9e0` will make everything feel more GitHub
- **Accent color** — `#0969da` saturated blue
- **Focus rings** — `2px solid #0969da` + glow
- **Button patterns** — bg, border, shadow, state machine
- **Form controls** — input/select/checkbox/switch
- **Overlay/modal** — backdrop, shadow, border
- **Selection** — `#0969da33`
- **Severity/semantic colors** — danger/warning/success from Primer

### Brand-Differentiated (Keep Our Style)
- **Code blocks** — our `#f2f2f6` purple-tinted bg + pink inline code + highlight.js palette
- **Horizontal rules** — gradient + ornament
- **Typography** — `line-height: 1.7`, `720px` width, heading sizes
- **Live-render UX** — syntax hints, dual-mode NodeViews (no GitHub equivalent)
- **Fonts** — Inter + JetBrains Mono (GitHub uses their own system stack)

### Balance Strategy

The philosophy is: **GitHub is the ocean, our product identity is the island.** Users should feel the familiar GitHub water everywhere (backgrounds, borders, controls, states), but when they look at the actual content — the editor, the code, the typography — they see LiveMark's personality. This gives us instant credibility and familiarity while maintaining distinctiveness where it matters: the editing experience itself.

### Highest-ROI Changes (implement first)
1. Update `--lm-text-muted` from `#7c818c` → `#59636e` (biggest visual impact)
2. Update `--lm-border` from `#e8e9ec` → `#d1d9e0`
3. Update `--lm-accent` from `#4a8ed0` → `#0969da`
4. Update `--lm-bg` from `#fafafa` → `#ffffff`
5. Add focus ring token and apply globally
6. Update overlay backdrop to warm gray

These 6 changes alone will get you to ~70% GitHub alignment. The component-level work (buttons, inputs, etc.) brings it to 80–90%.

---

## Appendix: GitHub Primer Token Reference

Source: `@primer/primitives` light theme CSS (`unpkg.com/@primer/primitives/dist/css/functional/themes/light.css`)

### Canvas & Background
| Token | Value |
|-------|-------|
| `--bgColor-default` | `#ffffff` |
| `--bgColor-muted` | `#f6f8fa` |
| `--bgColor-emphasis` | `#25292e` |

### Foreground
| Token | Value |
|-------|-------|
| `--fgColor-default` | `#1f2328` |
| `--fgColor-muted` | `#59636e` |
| `--fgColor-disabled` | `#818b98` |
| `--fgColor-accent` | `#0969da` |
| `--fgColor-success` | `#1a7f37` |
| `--fgColor-danger` | `#d1242f` |
| `--fgColor-attention` | `#9a6700` |

### Border
| Token | Value |
|-------|-------|
| `--borderColor-default` | `#d1d9e0` |
| `--borderColor-muted` | `#d1d9e0b3` |
| `--borderColor-emphasis` | `#818b98` |

### Control (Form Inputs)
| Token | Value |
|-------|-------|
| `--control-bgColor-rest` | `#f6f8fa` |
| `--control-bgColor-hover` | `#eff2f5` |
| `--control-bgColor-active` | `#e6eaef` |
| `--control-borderColor-rest` | `#d1d9e0` |
| `--control-checked-bgColor-rest` | `#0969da` |
| `--control-fgColor-placeholder` | `#59636e` |

### Button (Default)
| Token | Value |
|-------|-------|
| `--button-default-bgColor-rest` | `#f6f8fa` |
| `--button-default-bgColor-hover` | `#eff2f5` |
| `--button-default-bgColor-active` | `#e6eaef` |
| `--button-default-borderColor-rest` | `#d1d9e0` |
| `--button-default-shadow-resting` | `0 1px 0 0 #1f23280a` |

### Button (Primary)
| Token | Value |
|-------|-------|
| `--button-primary-bgColor-rest` | `#1f883d` |
| `--button-primary-bgColor-hover` | `#1c8139` |
| `--button-primary-fgColor-rest` | `#ffffff` |

### Button (Danger)
| Token | Value |
|-------|-------|
| `--button-danger-fgColor-rest` | `#d1242f` |
| `--button-danger-bgColor-hover` | `#cf222e` |
| `--button-danger-fgColor-hover` | `#ffffff` |

### Focus & Selection
| Token | Value |
|-------|-------|
| `--focus-outlineColor` | `#0969da` |
| `--selection-bgColor` | `#0969da33` |

### Overlay
| Token | Value |
|-------|-------|
| `--overlay-bgColor` | `#ffffff` |
| `--overlay-borderColor` | `#d1d9e080` |
| `--overlay-backdrop-bgColor` | `#c8d1da66` |

### Shadows
| Token | Value |
|-------|-------|
| `--shadow-resting-small` | `0 1px 1px 0 #1f23280a, 0 1px 2px 0 #1f232808` |
| `--shadow-floating-small` | `0 0 0 1px #d1d9e080, 0 6px 12px -3px #25292e0a, 0 6px 18px 0 #25292e1f` |
| `--shadow-floating-medium` | `0 0 0 1px #d1d9e000, 0 8px 16px -4px #25292e14, 0 4px 32px -4px #25292e14, 0 24px 48px -12px #25292e14, 0 48px 96px -24px #25292e14` |
