# How the Activity Player sizes an Interactive

The Activity Player sizes an Interactive's iframe from the settings an author picks in LARA. An
interactive can instead tell it an aspect ratio or a height through the interactive API; these
rules are for one that doesn't.

**Width.** The section's layout and the page's "Activity Page Fixed Width" set it.
- On a fixed page, "Standard (1100px)" or "iPad Friendly (960px)", a "full-width (single column)"
  section's iframe is the page less 56 px of padding and margin: 1044 or 904 px. The window's width
  doesn't change it. In a window narrower than the page and its 80 px of outer padding, the
  Activity Player keeps the page centered: it cuts off as much of the left side as the right, and
  only the right side can be scrolled to.
- The two-column layouts (60-40, 40-60, 70-30, 30-70) split that width into grid columns. The widest
  column, 30-70's primary on the 1100 px page, is 767 px.
- Any section whose layout starts with "responsive" makes the page as wide as the window, and the
  fixed width no longer applies. A "responsive-full-width (single column)" iframe is the window
  less 140 px: the 80 px of outer padding, the page's 40 px, and a 20 px right margin that only a
  responsive section adds. The responsive two-column layouts split the window's width between their
  columns.

**Height.** The interactive's "Aspect Ratio" sets it.
- "Default aspect ratio, or set by interactive" makes it 3/4 of the width, but no taller than 98% of
  the window's height less 15 px. When that cap applies, the width may also narrow, to 98% of the
  window's height × 4/3. The cap is on the iframe alone: the title bar, the border and the space
  below the iframe add 68 px, so a capped interactive is taller than the window.
- "Manually set the native width & height" makes it the width times height ÷ width, with no cap.
- "Use all available space for the interactive" stretches it to 98% of the window's height, less
  the title bar, the border and the space below the iframe. It does that in a full-width section,
  and in the primary column of a two-column layout when the embed sets it with Customize or the
  interactive is a basic iframe. Everywhere else the iframe stays at its 300 px default: in a
  responsive-full-width section, in a secondary column, and in a primary column when the embed
  inherits the setting from its library interactive. The 300 px cases are a known bug.

The space below the iframe is 30 px of margin. It holds "Clear & start over" when the interactive
saves the student's work and shows that button, and a teacher's feedback once there is some.
Neither one is counted in the heights above, so an interactive that shows them is taller. The
Activity Player used to lower the default aspect ratio's height cap by 44 px to leave room for the
button, but no longer does; that is a known bug too.

These sizes assume:
- **A managed interactive**, an embed of a library interactive. It always has a 1 px border; a
  basic iframe interactive has one only when it shows a title bar. The border doesn't narrow the
  iframe. Under "Use all available space", its top and bottom take 2 px of the stretched height.
- **The author gives the interactive a name.** The Activity Player shows it in a 36 px title bar
  above the iframe. Without a name there is no title bar.
- **A Multiple Pages activity.** The Single Page and Notebook layouts size Interactives differently.

The sizing preview (`sizing-preview.html`, see the README) shows the size for any of these settings.
[`playwright/lib/ap-sizing.ts`](../playwright/lib/ap-sizing.ts) computes these rules, and
[`playwright/sizing-cases.test.ts`](../playwright/sizing-cases.test.ts) checks the preview against
it, with the known bugs as expected failures.
