# Preview and Test How the Activity Player Sizes an Interactive

**Jira**: https://concord-consortium.atlassian.net/browse/AP-153

**Status**: **In Development**

## Overview

How big the Activity Player (AP) makes an interactive depends on settings an author picks in LARA and on the size of the student's window. Today a designer can see those sizes only by authoring an activity in LARA for each combination. This story adds a sizing preview: a page on any AP deploy where a designer enters an interactive's URL, picks the settings, resizes the real browser window, and reads the iframe's width and height. Playwright tests use the same page to check the sizes across a table of setting combinations.

It is about sizing. Saving the interactive's work and the other ways an interactive talks to the AP are out of scope, except for "Clear & start over", whose button changes the interactive's height and, with "Use all available space", the iframe's.

Two things drive the design:
- **Settings changes must apply quickly.** The tests run through many combinations, and a designer flips between settings to compare them. A change re-renders the page in place, with no reload and no repeated Firestore setup. Only a new interactive URL starts a new interactive.
- **The sizes must be the ones a student gets.** The preview renders the AP's real page components and stylesheets, not a model of them. Where it has to copy something App does, a test checks that the copy still matches.

## Requirements

### Opening the page

- The preview is its own page, `sizing-preview.html`, next to `index.html` on every AP deploy, including the dev server.
- It is a second webpack entry, `src/sizing-preview/index.tsx`, with its own `HtmlWebpackPlugin` page. [webpack.config.js](../webpack.config.js) changes to match:
  - The entries are named, `index` and `sizing-preview`, and the JS and CSS output filenames use `[name]` in place of the fixed `index`, so the main bundle keeps its `assets/index.*` name.
  - Each HTML page lists its own chunk: `index.html` and `index-top.html` load only `index`, and `sizing-preview.html` loads only `sizing-preview`.
  - No preview code goes into the main bundle, and [src/index.tsx](../src/index.tsx) is unchanged.
- The page's template is `src/sizing-preview/index.html`, a copy of `src/index.html` trimmed to what the preview needs.
- The Playwright coverage code counts the app's `assets/*.js` bundles on the app's own origin (`isAppBundle` in [coverage.ts](../playwright/lib/coverage.ts)), so the preview's bundle is covered. Chromium also measures the interactive's iframe, whose bundle can sit in an `assets` folder too, so bundles from other origins are left out. The shared page the sizing cases use adds its coverage through the same function as the per-test fixture.
- The settings live in the URL's hash, as `URLSearchParams` (see "Settings"). A link to the page reproduces the preview. Changing a control updates the hash with `history.replaceState`, so the back button doesn't step through each change. Changing the hash yourself, by editing the address bar or from a test, applies the new settings without reloading (the preview listens for `hashchange`).
- An unknown or missing setting falls back to its default, value by value, so a partial or hand-edited link still opens.

### What the page shows

From top to bottom:

```
Sizing controls panel                 ← in normal flow; scrolls up out of the way
div.sizing-preview-page               ← a centered row, as #app is in App
  div.app
    div.activity.fixed-width-1100px   ← or .fixed-width-ipad-friendly or .responsive
      ActivityPageContent, title row off
        main.page-content > div.sections > Section > Embeddable > the interactive
```

- **Not shown:** the AP's header (project logo, activity title, account), the page navigation above and below the page, the page title and read-aloud toggle, the bottom buttons, the footer, the sidebar and other activity-level plugins, the version info and the idle warning.
- The page has one section, holding the interactive. In a two-column layout, the other column holds a block of text (see "The other column's text").
- The interactive's own title bar is shown when "has a name" is on (it is one of the settings).
- `#app` is `position: fixed`, a flex row, and the page's scroll container ([app.scss](../src/components/app.scss)). The preview renders the panel and `.app` inside a flex column (`.sizing-preview`) in `#app`, with `.app` in a centered row as it is in App. Otherwise the panel would sit beside `.app` and narrow the page. Because `#app` scrolls, the panel scrolls away inside it.
- The panel sits above `.app`, outside the activity, and spans the window. It doesn't change the interactive's size. The AP sizes the iframe from the window (`window.innerHeight` in [managed-interactive.tsx](../src/components/activity-page/managed-interactive/managed-interactive.tsx), which passes it to [use-aspect-ratio.ts](../src/hooks/use-aspect-ratio.ts), and `98vh` in [section.scss](../src/components/activity-page/section.scss)), not from the space left on the page, so the panel only pushes the interactive down, as the AP's header does.

### Settings

Each control that has a LARA counterpart uses LARA's label, so the settings read as an author sees them. The "Clear & start over" control takes its label from LARA's authoring form for `show_delete_data_button`.

| Control | Hash key | Values | Default |
|---|---|---|---|
| Interactive URL | `interactive` | any absolute http(s) URL | the sizing demo interactive (see "The default interactive") |
| Activity Page Fixed Width | `fixed_width_layout` | `1100px` "Standard (1100px)", `ipad_friendly` "iPad Friendly (960px)" | `1100px` |
| Layout | `layout` | `full-width`, `60-40`, `40-60`, `70-30`, `30-70`, `responsive-30-70`, `responsive-50-50`, `responsive-full-width`, with LARA's display text (e.g. "60-40 (primary on left)") | `full-width` |
| Interactive's column | `column` | `primary`, `secondary`; shown only for a two-column layout | `primary` |
| Interactive kind | `kind` | `mw` "Basic iframe interactive", `library` "Library interactive", `library-custom` "Library interactive, customized" | `library` |
| Aspect Ratio | `aspect_ratio_method` | `DEFAULT` "Default aspect ratio, or set by interactive", `MANUAL` "Manually set the native width & height", `MAX` "Use all available space for the interactive" | `DEFAULT` |
| Width, Height | `native_width`, `native_height` | positive whole numbers; shown only for `MANUAL` | 576, 435 (LARA's defaults) |
| Has a name | `name` | `1` or `0` | `1` |
| Show "Clear & start over" button | `show_delete_data_button` | `1` or `0` | `0` |
| Other column's text | `other_text` | `tall` "Taller than the window", `short` "A short paragraph"; shown only for a two-column layout | `tall` |

- The hash holds only the settings that apply: `column` and `other_text` only for two-column layouts, the native size only for `MANUAL`, and `interactive` only when it isn't the default.
- "Activity Page Fixed Width" stays visible but is disabled for a responsive layout, with a note that a responsive section makes the page full width.
- The native width and height inputs keep what is typed as a draft and apply it on blur or Enter, so typing 800 doesn't pass through 8 and make the iframe thousands of pixels tall. A draft that isn't a positive whole number isn't applied: the field keeps it and shows an error, and the last valid value stays applied, so the designer can correct what they typed. The interactive URL input works the same way.
- The AP loads a blank page for any interactive URL that isn't absolute http(s) (`isHttpUrl` in [iframe-runtime.tsx](../src/components/activity-page/managed-interactive/iframe-runtime.tsx)). The URL input says so when what was typed isn't one, and keeps the last valid URL.

### The generated activity

The preview builds a version 2 `Activity` from the settings, in a pure function with unit tests. It has one visible page with one section.

- The activity: `layout` Multiple Pages, `fixed_width_layout` from the setting, no `id`, no plugins, `font_size` normal, a name (it isn't shown).
- The section: `layout` from the setting, `secondary_column_display_mode: "stacked"` and `secondary_column_collapsible: false`, as nearly all the bundled samples have.
- The interactive, by `kind`:
  - `mw`: an `MwInteractive` with `url`, `aspect_ratio_method`, `native_width` and `native_height` set from the settings.
  - `library`: a `ManagedInteractive` whose `library_interactive.data` holds `base_url`, `aspect_ratio_method`, `native_width` and `native_height`, with `inherit_aspect_ratio_method`, `inherit_native_width` and `inherit_native_height` all true, and the `custom_` fields null, as LARA exports them. This is a library interactive embedded as is. The `custom_` fields must stay null: [section.tsx](../src/components/activity-page/section.tsx) reads `custom_aspect_ratio_method` without checking the inherit flag, so filling it in would make an inheriting interactive stretch and hide AP-151.
  - `library-custom`: a `ManagedInteractive` with the three `inherit_` flags false and the settings in `custom_aspect_ratio_method`, `custom_native_width` and `custom_native_height`. This is LARA's "Customize". The library's own data keeps LARA's defaults, so the inheriting and customized paths can't accidentally agree.
  - "Clear & start over": the AP shows the button only when the interactive both saves state and has the button turned on ([managed-interactive.tsx](../src/components/activity-page/managed-interactive/managed-interactive.tsx), `setShowDeleteDataButton`). So the setting sets `enable_learner_state` and `show_delete_data_button` together: on the `MwInteractive` itself for `mw`, and on `library_interactive.data` for both managed kinds, which is the only place the AP reads them.
  - With the button on, the interactive counts as a question: its title bar reads "Question #1: <name>", and the AP watches Firestore for its saved answer (see "The preview app"). With it off, both flags are false, the title bar shows the name alone, and no answer is watched.
  - `click_to_play` is false.
  - `name`: a fixed name when "Has a name" is on; an empty string when it's off, which drops the title bar (and, for `mw`, the border). With "Clear & start over" on, an unnamed interactive keeps a title bar reading "Question #1", because the AP shows the bar for a numbered question.
  - `column` from the setting, for a two-column layout.

### The other column's text

- In a two-column layout, the column without the interactive holds an `Embeddable::Xhtml` text block.
- By default the text is taller than the window, so the page scrolls and the AP's pinning shows: a primary column shorter than the window sticks while the page scrolls ([section.tsx](../src/components/activity-page/section.tsx), `isPinned`). That makes the preview useful for checking pinning by hand.
- "Tall" means taller than any window the tests or a designer are likely to use, even in the widest column the text can be in, where it is shortest. Generated paragraphs of filler text are enough: it is 25. It doesn't need to follow the window's height.
- "Short" is one short paragraph, for checking a layout without pinning.
- Testing pinning across layouts is not part of this story. The page makes it possible to check by hand. The Playwright tests check only that a primary column added or replaced by a settings change is measured again, which the preview's in-place changes need (see "Changes to App's code").

### The size readout

- A small readout fixed to a corner of the window shows the iframe's width and height in CSS pixels, to one decimal (the two-column widths are fractional, e.g. 622.4), and the window's `innerWidth` × `innerHeight`.
- The window size is `innerWidth`, which includes `#app`'s scrollbar when there is one. The sizing docs' W leaves that scrollbar out.
- It updates whenever the iframe's box changes: from settings changes, window resizes, or the interactive asking for a new aspect ratio or height. It observes the iframe element, which the AP's document can read even though the interactive is cross-origin. A re-render that replaces the iframe element must be picked up too.
- Being fixed, it never changes the page's layout.
- The sizes include anything the interactive itself asks for through the interactive API (an aspect ratio or a height), as they would for a student. The page doesn't stop a real interactive from doing that.

### The default interactive

- The default is the sizing demo interactive used in the bundled sizing demo activities (`sample-activity-interactive-sizing.json` and `Interactive-Sizing-Demo-Question-Interactives.json`): `https://models-resources.concord.org/sizing-demo-interactive/index.html`. The Playwright tests use it too.
- It is a separate project, [concord-consortium/sizing-demo-interactive](https://github.com/concord-consortium/sizing-demo-interactive): a small React app built with webpack into `index.html`, one JS bundle and one CSS file. It isn't copied into this repo.
- It shows its own size, which helps a designer see the iframe's edges. It has "Request Height" and "Request Aspect Ratio" buttons that ask the AP for a new size through iframe-phone.
- When the AP sends `initInteractive`, it answers with `supportedFeatures` with no aspect ratio. So until someone presses its buttons, the AP uses the authored settings alone, which is what the sizing tests check.
- The tests load it from models-resources over the network, as the Cypress tests already load the interactives in the bundled sample activities. If that turns out flaky in CI, a fallback is to serve a copy of its built files with `page.route`. That fallback isn't built now.

### Changes to App's code

- **ActivityPageContent** gets a prop that turns off its title row (the `<h1>` page title and the read-aloud toggle). It defaults to showing it, so App is unchanged. The preview passes it, `enableReportButton={false}`, and the generated page.
- **The `.activity` classes.** The code in `App.renderActivity` that picks `responsive` or `fixed-width-<layout>` (from `hasResponsiveSection`, `fixed_width_layout` and `kDefaultFixedWidthLayout`) moves into `pageHasResponsiveSection` and `activityClassName` in [activity-utils.ts](../src/utilities/activity-utils.ts), which App and the preview both call, with `kDefaultFixedWidthLayout`. App's behavior doesn't change.
- **Section** measures its primary column's embeddable wrapper, to decide whether to pin it, through an element held in state rather than a ref. `useResizeObserver` subscribes to the element a ref holds at mount, and the preview changes a section's layout while it is mounted, which can add the wrapper or replace it. App's behavior doesn't change.
- **IframeRuntime** uses the anonymous run's portal data that `initializeAnonymousDB` stored (`getPortalData`) for the interactive's object storage and jobs. Before, it worked the data out again with `anonymousPortalData`, which reads `?preview` from the URL. The preview sets up Firestore in preview mode without `?preview` in its URL, so the runtime made a new run and added a `runKey` parameter to the URL. In App the stored data is the same as what the runtime worked out, since both read the same flags, so App's behavior doesn't change. The runtime still works the data out if nothing is stored.
- **The contexts.** The nested providers App renders around its content move into `AppContextProviders` in [app-context-providers.tsx](../src/components/app-context-providers.tsx), which takes one value per context. App and the preview both render it, so a context App adds later reaches the preview too. App passes the same values as before, so its behavior doesn't change.
- Nothing else in App changes. The preview doesn't remount App, so the Firestore and IdleDetector issues found during design don't arise.

### The preview app

- It provides the contexts App provides through `AppContextProviders`, with simple values: `LaraGlobalContext`, `PortalDataContext`, `LaraDataContext` (the generated activity), `AccessibilityContext` (normal font size), `MediaLibraryContext`, `QuestionInfoContext` (an empty question map), `DynamicTextContext` and `ReadAloudContext` (read aloud off).
- It sets up offline Firestore once when the page loads, as App does with `?preview` (`initializeAnonymousDB(true)`). ManagedInteractive reads Firestore for every interactive: it looks up feedback through `getAnswer`, and with "Clear & start over" on it watches the saved answer through `watchAnswer`, which throws during render if Firestore isn't set up. Setting it up once keeps settings changes free of it. Nothing is saved: preview mode keeps Firestore offline.
- It sets the `window.React` and `window.ReactDOM` globals as [src/index.tsx](../src/index.tsx) does for plugin scripts. The preview loads none, but keeps them so the page runs as it does in App.
- It doesn't start the IdleDetector, load plugin scripts, initialize the Logger, run `initializeAuthorization`, or read the portal or overrides.
- A settings change replaces the generated activity in state and re-renders. The interactive keeps its `ref_id`, so React keeps it and its iframe across a change, except a new interactive URL: the page content is keyed by the URL, so a new one starts a new interactive, which doesn't keep the size the old one asked for.

### Tests

- **Unit tests** (Jest) for parsing and formatting the hash, and for building the activity from the settings: each `kind`, with "Clear & start over" on and off, and the other column's text tall and short.
- **Jest tests** for the hash hook (an edit to a setting the formatted hash leaves out is applied, and an unchanged hash keeps the same settings), the controls (each control and its labels, which controls show for which layout, and the drafts), the draft input, and the new `activity-utils` functions. A Jest test checks that the parity sample (below) is the activity the preview builds from the parity test's settings.
- **A Jest test** that ActivityPageContent leaves out the title row when asked, and shows it by default.
- **Playwright sizing tests**, using the setup from AP-152 (tests import the shared fixture from `playwright/lib/base-url`):
  - Each case is a set of settings, a window size, and the expected iframe width and height.
  - The window size is set with the viewport. The iframe's size is read from its element's box.
  - The cases are a table, not hand-written tests. The full cross product is large (2 page widths × 8 layouts × columns × 3 aspect ratios × 3 kinds × named or not × "Clear & start over" on or off × several window sizes). So the table covers each setting's effect and their interactions without running every combination. Choosing the table is left to the builder, but it covers at least:
    - every layout in each column on both fixed pages;
    - every aspect ratio in each kind;
    - named and unnamed;
    - "Clear & start over" on, with each aspect ratio;
    - a window narrower than the fixed page;
    - the DEFAULT height cap;
    - each responsive layout at two window widths.
  - Expected sizes come from the rules in [docs/activity-player-sizing.md](../docs/activity-player-sizing.md), which the tests' oracle, `playwright/lib/ap-sizing.ts`, computes. A comment names the AP commit it was checked against.
  - Those rules assume no "Clear & start over" button. `use-aspect-ratio.ts` can take 44 px off the DEFAULT height cap for the button, but [managed-interactive.tsx](../src/components/activity-page/managed-interactive/managed-interactive.tsx) always passes it `showDeleteDataButton: false` (since a January 2025 refactor), so today the button doesn't change a DEFAULT or MANUAL iframe's size. That looks like an accident of the refactor: the code before it took the 44 px off.
    - The tests expect the 44 px cut. A DEFAULT case whose height hits the cap with the button on expects the cap 44 px lower, and is marked as an expected failure (`test.fail`), like AP-151's cases, with a comment saying the AP no longer leaves room for the button. Like them, the case first checks the size the AP gives today. A DEFAULT case under the cap and a MANUAL case are unaffected and pass.
    - Where CSS stretches the iframe to fill 98vh (MAX), the button already takes its room: the iframe loses the button's height and its 5 px bottom margin. The oracle covers that, taking the button's height from its rendered box. That measures the button, not the iframe, so it doesn't check the preview against itself.
  - Unnamed cases follow from the same rules: no title bar, and no border for `mw`, unless "Clear & start over" is on, which keeps the "Question #1" title bar and the border. Every expected size comes from the rules, the measurements and the AP's code, never from measuring the preview, which would check the preview against itself.
  - **AP-151's cases** are the cases where "Use all available space" leaves the iframe at its 300 px default: a responsive-full-width section, a secondary column, and a primary column whose embed inherits the setting from its library interactive.
    - They are written with the height AP-151 says they should have, the same as in a full-width section.
    - Each first checks the size the AP gives today, then is marked as an expected failure (`test.fail`), with a comment saying why, and checked against the size it should have. AP-151's fix makes the first check fail, which flags the case for updating.
    - The secondary column is one of these cases, expecting the stretched height, even though AP-151 may yet decide to keep 300 px there. If it does, AP-151 updates that case.
  - For speed, the tests share one loaded page and change settings through the hash, waiting for the iframe's box to settle before reading it. Each case is still its own `test()`, because `test.fail` marks a whole test. The cases run in order on one shared page, opened in `beforeAll` (`playwright/lib/shared-page.ts`), with `test.describe.configure({ mode: "default" })`, so an unexpected failure reopens the page in a new worker rather than skipping the rest. Each case sets its own viewport. `playwright/lib/iframe-box.ts` reads the iframe's box once it settles.
- **A parity test** (Playwright): open a bundled sample activity in the real App and the same settings in the preview, at the same window size, and check that the iframe sizes match. This guards the wrappers the preview copies from App.
  - It uses a new small sample, `sample-sizing-parity` (`src/data/version-2/sample-new-sections-sizing-parity.json`), with the sizing demo interactive. Its cases are a fixed page, the same page in a window narrower than it, and a responsive page.
- **Playwright tests of the page** (`playwright/sizing-preview.test.ts`): its default settings, a hash change applied without a reload, controls that don't add history entries, the readout (also after the iframe is replaced), a new interactive URL starting a new interactive, and pinning after a layout change in place.

### Documentation

The README gets a short section on the sizing preview:
- how to open it (`sizing-preview.html`, with an example link);
- what it covers: the settings above, a Multiple Pages activity, the real window, and checking pinning by hand;
- what it doesn't: the other activity layouts, saving state, teacher feedback, and an interactive talking to the AP beyond sizing;
- how the Playwright sizing tests use it.

[docs/activity-player-sizing.md](../docs/activity-player-sizing.md) describes the sizing rules the tests check.

## Approaches

We considered where the controls go and how the page is built.

- **Controls as an introduction section of the activity.** This was the original wish, since it looks most like an activity. It needs a new internal embeddable type in Embeddable's dispatch and a path for settings to flow from inside a section up to App. The intro section's layout would also have to follow the chosen layout's responsiveness. Not chosen: a panel above the page scrolls away the same way and gives the same sizes, for less change to the AP.
- **A panel beside App, remounting App with a new `key` on each change.** No App wiring is needed, because App rereads the URL on mount. Not chosen, for three reasons:
  - Each remount reruns App's whole setup, which is slow when the tests run many combinations.
  - App assumes it mounts once. `initializeDB` reruns Firestore's `clearPersistence` and `enablePersistence`, which Firestore only allows before it starts, and the IdleDetector App starts is never stopped.
  - Reloading the whole page instead avoids those problems, but is slower again and drops keyboard focus from the control just changed.
- **A preview app in place of App, rendering ActivityPageContent directly. Chosen.** A settings change is a re-render. The idle and plugin setup are dropped, and Firestore is set up once. The cost is that the preview copies the wrappers App draws around a page, so it could drift from App. The shared `.activity` class function and the parity test guard against that.
- **The preview as its own HTML page,** not a query parameter on `index.html`. Chosen by Scott. It keeps the preview's code out of the main bundle and leaves `src/index.tsx` alone, at the cost of a second webpack entry.
- **Dropping the page title.** We chose a prop on ActivityPageContent over rendering Sections inside a copy of `main.page-content > div.sections`. The prop changes a production component slightly, but keeps the page's wrappers and its two providers (`EmbeddableVisibilityProvider`, `DisabledQuestionsProvider`) the same code students run.

## Out of Scope

- The Single Page and Notebook activity layouts, which size interactives differently. A control for them was an optional extra in the story; it is left out.
- Saving the interactive's state, teacher feedback, and an interactive talking to the AP beyond asking for a size. Pressing "Clear & start over" isn't tested; only the button's effect on the size is.
- Automated tests of pinning for each layout.
- Sequences, and a sequence's `fixed_width_layout` overriding the activity's.
- Fixing AP-151. Its cases are expected failures here.

## Decisions

Calls made during design, for review:

- **Settings in the hash**, not the query: changing the hash doesn't reload, and `hashchange` gives tests and hand-edited links a way in.
- **Hash keys are the activity JSON's field names** (`fixed_width_layout`, `aspect_ratio_method`, `show_delete_data_button`, ...) where there is one, so a link reads like the activity it builds. `interactive`, `kind`, `name` and `other_text` are the exceptions.
- **Three interactive kinds in one control** (`mw`, `library`, `library-custom`), because inherit-versus-customize changes the size only for managed interactives (see AP-151).
- **Native size defaults to LARA's 576 × 435.**
- **The button's 44 px is expected.** The tests expect the DEFAULT cap 44 px lower with "Clear & start over" on, as the AP did before its January 2025 refactor, and mark those cases as expected failures. Chosen by Scott.
- **"Clear & start over" sets `enable_learner_state` too**, because the AP shows the button only for an interactive that saves state. That also makes it a numbered question.
- **The other column's text defaults to tall,** with a short option, so pinning shows by default.
- **The readout is fixed to a corner** rather than in the panel, so it stays visible after the panel scrolls away.
- **The sizing demo interactive is loaded from models-resources,** in the page and the tests, not copied into this repo.
- **Offline Firestore is set up once** rather than stubbed: stubbing would mean mocking `firebase-db` in production code.

## Left to the builder

These were left to the builder; what was chosen is noted.

- The look of the panel and the readout, within the AP's existing styles. The panel's controls need labels and keyboard access.
- Where the corner readout sits, and what it does on a narrow window: the bottom right.
- Whether React keeps the iframe across a settings change, and whether it needs to: it does, except for a new URL.
- The exact case table, within the coverage listed under "Tests", and whether to compute the expected sizes with an oracle or write them into the table: an oracle, `playwright/lib/ap-sizing.ts`, computes them.
- Which bundled sample (or a new small one) the parity test uses: a new one, `sample-sizing-parity`.
- The page's HTML template, and how much filler text "tall" uses: a trimmed copy, and 25 paragraphs.
