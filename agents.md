# Finance Tools Guide

## Scope

- Current tools in this thread:
  - `/mortgage`
  - `/income`
  - `/assets`
  - `/expenses`
  - `/projection`
  - `/taxes`
- App architecture is now:
  - single-entry React/Vite app
  - React Router routes instead of per-tool HTML files
  - shared UI primitives under `src/components/`
  - shared styling constants under `src/lib/ui.js`

## User Preferences

- This is a local tool suite, not a marketing site.
- Keep the UI dense, readable, and utilitarian.
- Avoid decorative filler:
  - no useless copy
  - no tags / landing-page style labels
  - no decorative swoops / ticks / blobs
  - no extra explanation text unless it materially helps use the tool
- Prefer fewer containers/cards. Do not wrap everything in cards.
- No rounded-corner-heavy “AI demo” styling.
- Avoid massive side whitespace.
- Keep layouts compact and direct.

## Engineering Principles

- Before abstracting, identify the canonical case and make everything conform to it first.
  - Only introduce a broader abstraction when there is a repeated, durable reason not to.
- Every simplification should reduce future decisions.
  - Good cleanup makes the next edit more obvious by reducing modes, flags, styling choices, and places where the same concern can live.
- Shared components should remove decisions from call sites, not relocate them.
  - If a page still needs one-off variants, selector blobs, or special-case props, the shared primitive is probably not pulling its weight.
- Preserve behavioral invariants during refactors.
  - Code cleanup is not a win if it changes focus behavior, calculation semantics, displayed defaults, toggle meaning, or other interaction contracts.
- Verify the real workflow, not just the edited file.
  - Cross-page data flow, persistence, imported summaries, and shared config changes matter as much as local rendering.

## Interaction / Process Preferences

- Edit files directly.
- Make incremental edits.
- Do not use wrapper shell snippets, python one-offs, awk tricks, or `node -e` for simple inspection or calculation.
- Read files directly with normal file tools.
- Use `apply_patch` for edits.
- When fixing UI issues, inspect the exact file sections and patch the actual cause instead of guessing.

## Shared Styling Direction

- All tools should feel like one suite.
- Shared palette/page chrome should live in React-owned styling primitives, not HTML style blocks.
- Prefer named shared style constants or opinionated shared components over repeated inline utility strings.
- Keep tool-specific styling local only when it is truly specific to that tool.
- Current shared pieces:
  - palette
  - page shell
  - background and left accent rail
  - top nav
  - header chrome
  - shared button/tab styling
  - shared surface container styling
  - shared field shells
  - shared segmented toggles
  - shared disclosure/item cards
  - shared summary/result list patterns

## Product Constraints

- Use the top nav bar as the actual tool switcher.
- Keep the nav simple.
- Small hover motion is acceptable.
- Avoid over-styled “juiced” chrome.
- Mortgage is a row-based comparison tool.
  - Each loan row owns its own values.
  - Clicking a row makes it active.
  - A separate compare control selects the comparison row.
  - Current loan set is `30-year fixed`, `7/1 ARM`, and `10/1 ARM`.
  - ARM reset rate is optional; blank means “same as initial”.
  - If a blank value is still modeled, show the numeric fallback visibly as a placeholder.
- Income is annual-first take-home modeling.
  - Monthly numbers are secondary views, not the primary framing.
  - Backdoor Roth IRA should not be treated as monthly cashflow.
  - HSA is a direct contribution input.
  - Mega backdoor must not crowd out employer match.
- Time-based modeling belongs on Projection.
  - Keep per-year growth, overrides, horizon, and projection visuals on the Projection page rather than scattering them across input pages.
- Advanced or less-frequent assumptions should live behind disclosure sections.
- Use one consistent plotting frame for charts so axes, labels, and marks line up across tools.

## Tax And Modeling Assumptions

- Employer match should be modeled as applying to the regular employee 401(k) deferral, not mega backdoor.
- HSA is treated as pre-tax for federal income tax and FICA in the calculator logic.

## Editing Guardrails

- When changing shared styles, avoid breaking the app-specific layouts.
- Prefer minimal, targeted visual changes.
- If the user reacts negatively to a styling direction, revert that specific pass instead of defending it.
