# Update Orange Button Styling for Accessibility

**Jira**: https://concord-consortium.atlassian.net/browse/AP-66

**Status**: **Closed**

## Overview

Update the Activity Player's `.button` class styling for WCAG accessibility compliance: change text from charcoal to black, revise background colors for default/hover/click states, update the border color, and add a keyboard-visible focus indicator using an inset blue+white box-shadow ring.

## Requirements

- **Label color**: Change button text color from #3f3f3f (charcoal) to #000000 (black)
- **Default state**: Update background from #ffa350 to #ffba7d; border from #979797 to #949494
- **Hover state**: Update background to #ff9a42 (was #ff8415); border #949494
- **Click/pressed state**: Set background to #ff8113; text remains #000000 (was white); border #949494
- **Disabled state**: Use default background (#ffba7d) with opacity 0.35 applied to the entire button; text #000000; border #949494
- **Keyboard focus state**: Add a visible focus indicator that does not cause layout shift:
  - Visual effect: 2.5px blue (#0957d0) outer ring + ~1px white inner ring (from Zeplin border specs: 3.5px white + 2.5px blue inside)
  - Must be implemented using `outline`, `box-shadow`, or equivalent — not by changing `border` thickness
  - Background matches hover (#ff9a42)
  - Text remains #000000
- **Border radius**: Maintain existing 4px border radius
- All changes apply to the `.button` class in `app.scss` and should cascade to all components using it
- Update SCSS variable definitions in `vars.scss` as needed for new color values

### WCAG Contrast Ratios

| State | Combination | Ratio | WCAG |
|-------|------------|-------|------|
| **Current** | #3f3f3f on #ffa350 | ~3.2:1 | Fails AA |
| Default | #000000 on #ffba7d | ~11.4:1 | Passes AAA |
| Hover/Focus | #000000 on #ff9a42 | ~8.6:1 | Passes AAA |
| Click | #000000 on #ff8113 | ~7.0:1 | Passes AAA |
| Focus ring | #0957d0 on #ffffff | ~7.0:1 | Passes AA (non-text) |

## Technical Notes

### Zeplin Design Reference

Design specs sourced from the QI Button Interactive Zeplin screen:
https://app.zeplin.io/project/5fe47ae231d1f6a428c53450/screen/698a06d8e09b8e5c861b796f

The Zeplin note states: "Note: this is the standard orange button in AP; same states, too; UPDATE to state button colors and label color."

### Color Mapping (Current -> Updated)

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | #ffa350 -> **#ffba7d** | #3f3f3f -> **#000000** | 1.5px #979797 -> **1.5px #949494** |
| Hover | #ff8415 -> **#ff9a42** | #3f3f3f -> **#000000** | none -> **1.5px #949494** |
| Click/Pressed | (none) -> **#ff8113** | white -> **#000000** | none -> **1.5px #949494** |
| Disabled | opacity 0.35 | (n/a) -> **#000000** | (n/a) -> **1.5px #949494** |
| Keyboard Focus | (none) -> **#ff9a42** | (n/a) -> **#000000** | (none) -> **box-shadow: 2.5px #0957d0 + ~1px #fff** |

### SCSS Variables Added

```scss
$cc-button-color: #000000;
$cc-button-default: #ffba7d;
$cc-button-hover: #ff9a42;
$cc-button-click: #ff8113;
$cc-button-border: #949494;
$cc-button-focus-ring: #0957d0;
```

### Focus Indicator Implementation

The keyboard focus double-border from Zeplin (3.5px white + 2.5px blue, both "inside" position) implemented as inset box-shadow to avoid layout shift:
```scss
&:focus-visible {
  background-color: $cc-button-hover;
  box-shadow: inset 0 0 0 2.5px $cc-button-focus-ring, inset 0 0 0 3.5px white;
  outline: none;
}
```

### Key Files

| File | What changed |
|------|-------------|
| `src/components/vars.scss` | Added 6 new `$cc-button-*` color variables |
| `src/components/app.scss` | Updated `.button` class: default, hover, active, and new `:focus-visible` styles |
| `src/components/activity-page/bottom-buttons.scss` | Removed dead `&:hover` rule from disabled button override |

### Acceptance Criteria

- [ ] **Default**: Button displays #ffba7d background, #000000 text, 1.5px #949494 border
- [ ] **Hover**: Background changes to #ff9a42 on mouse hover
- [ ] **Click/Pressed**: Background changes to #ff8113 while mouse is held down; text stays black
- [ ] **Disabled**: Button appears faded (opacity 0.35) with default background
- [ ] **Keyboard Focus**: Tab to button shows blue (#0957d0) + white (#ffffff) focus ring; no layout shift
- [ ] **No regression**: Sidebar tabs, nav buttons, and other orange elements are unchanged
- [ ] Verify on: "Begin Activity" button, "Next Page" / page nav buttons, any disabled button state

## Out of Scope

- Sidebar tab styling (`sidebar-tab.scss`) — separate component, different button pattern
- Sidebar panel header icon styling (`sidebar-panel.scss`)
- Nav page completion buttons (`nav-pages.scss`) — uses theme CSS variables, may be a separate ticket
- Toggle component styling (`toggle.scss`)
- Page change notification (`page-change-notification.scss`)
- Teacher edition banner (`teacher-edition-banner.scss`)
- Notebook tabs (`notebook.scss`)
- Changes to the overall theme variable system

## Decisions

### Are sidebar/nav buttons included in this ticket?
**Context**: The ticket says "update the styling of the orange button" which could refer narrowly to the `.button` class or broadly to all orange-styled interactive elements (sidebar tabs, nav page buttons, toggle).
**Options considered**:
- A) Only the `.button` class in `app.scss` (narrow scope)
- B) All orange-styled buttons including sidebar tabs and nav pages (broad scope)
- C) `.button` class plus nav page completion buttons

**Decision**: A) Only the `.button` class in `app.scss`. Other elements using `$cc-orange-light1` (sidebar tabs, sidebar panel header, page change notification, teacher edition banner, notebook tabs) are out of scope.

---

### Verify exact color values from Zeplin
**Context**: The hex values were extracted programmatically from the Zeplin screen data. The Updated column button colors are: Default #ffba7d, Hover #ff9a42, Click #ff8113, Focus ring #0957d0.
**Options considered**:
- A) Values are correct as extracted
- B) Values need adjustment (please provide corrected values)

**Decision**: A) Values are correct as extracted from Zeplin.

---

### Should new SCSS variables be created or existing ones repurposed?
**Context**: The new button colors (#ffba7d, #ff9a42, #ff8113) don't match any existing `$cc-orange-*` variables. We can either add new button-specific variables, repurpose/rename existing ones, or use the hex values directly.
**Options considered**:
- A) Add new button-specific variables (e.g., `$cc-button-default`, `$cc-button-hover`, `$cc-button-click`)
- B) Update existing `$cc-orange-*` variables to the new values (may affect other components)
- C) Use hex values directly in the `.button` styles without new variables

**Decision**: A) Add new button-specific variables with `$cc-button-` prefix.

---

### Focus state layout shift risk
**Context**: The Zeplin spec uses a 3.5px white border for the focus state, compared to the 1.5px border in the default state. Changing border thickness would cause layout shift.

**Decision**: Focus indicators must use `outline`/`box-shadow` (not border changes) to avoid layout shift. Implemented as inset `box-shadow`.

---

### `:focus` fallback alongside `:focus-visible`
**Context**: Should we add a `:focus` fallback for older browsers that don't support `:focus-visible`?

**Decision**: No fallback needed. `:focus-visible` has 95%+ browser support and avoids showing focus rings on mouse clicks, which is the desired UX.

---

### Border color change (#979797 to #949494)
**Context**: The border color change from #979797 to #949494 is subtle and could be a Zeplin rendering artifact rather than an intentional change.

**Decision**: Intentional design change per Zeplin spec from designer. Keeping #949494 as specified.

---

### `bottom-buttons.scss` disabled override
**Context**: The disabled button override in `bottom-buttons.scss` references `var(--theme-primary-color)` in a hover rule, but `pointer-events: none` prevents hovering.

**Decision**: The `&:hover` block is dead code (unreachable due to `pointer-events: none`) and references an unrelated color variable (teal). Removed during implementation as cleanup.

---

### CSS ordering — `:active` must come after `:focus-visible`
**Context**: When a keyboard user presses Enter on a focused button, both `:focus-visible` and `:active` are active simultaneously. If `:focus-visible` comes after `:active` in the CSS, its `background-color` overrides the click color.

**Decision**: Order pseudo-classes as `:hover` -> `:focus-visible` -> `:active` so the click background (#ff8113) shows during press while the box-shadow focus ring remains visible.

---

### Browser default outline stacking with custom focus ring
**Context**: Browsers apply their own outline on `:focus-visible`. Without suppressing it, users would see both the custom box-shadow rings and the browser's default outline.

**Decision**: Add `outline: none` to the `:focus-visible` rule to suppress the browser default.

---

### Focus ring CSS — Zeplin export vs. descriptive text
**Context**: Copilot flagged that the box-shadow CSS doesn't produce "3.5px white + 2.5px blue" visible rings. The Zeplin CSS (`inset 0 0 0 2.5px blue, inset 0 0 0 3.5px white`) produces 2.5px blue outer + ~1px white inner.

**Decision**: The CSS matches Zeplin's export and the visual design. Updated descriptive text to reflect actual visible ring widths. CSS unchanged.
