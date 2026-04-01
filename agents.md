# Finance Tools Notes

## Scope
- Current tools in this thread:
  - `mortgage.html`
  - `income.html`
- Shared chrome/styles were refactored into:
  - `shared-tools.css`

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

## Interaction / Process Preferences
- Edit files directly.
- Make incremental edits.
- Do not use wrapper shell snippets, python one-offs, awk tricks, or `node -e` for simple inspection or calculation.
- Read files directly with normal file tools.
- Use `apply_patch` for edits.
- When fixing UI issues, inspect the exact file sections and patch the actual cause instead of guessing.

## Shared Styling Direction
- Both tools should feel like one suite.
- Shared palette/page chrome should live in `shared-tools.css`.
- Keep app-specific styles inline in each HTML file only when they are truly specific to that tool.
- Current shared pieces:
  - palette
  - page shell
  - background and left accent rail
  - top nav
  - header chrome
  - shared button/tab styling
  - shared surface container styling

## Top Nav
- Use the top nav bar as the actual tool switcher.
- Do not duplicate old header links if the nav already provides switching.
- Keep the nav simple.
- Small hover motion is acceptable.
- Avoid over-styled “juiced” chrome.

## Mortgage Tool Findings
- Loan comparison is row-based.
- Each loan row owns its own values.
- Clicking a row makes it active.
- A separate compare control selects the comparison row.
- Current loan set:
  - `30-year fixed`
  - `7/1 ARM`
  - `10/1 ARM`
- Removed from the tool:
  - `15-year fixed`
  - `5/6 ARM`
  - PMI controls / PMI calculation
  - planned sale snapshot
- ARM behavior:
  - reset rate is optional
  - blank reset rate means “same as initial”
  - placeholder should show the numeric initial-rate value, not text like `same`
- ARM input row should fit on one line:
  - initial rate
  - reset rate
  - term
- Chart layout issues came from inconsistent plot geometry; use one plotting frame for axes/labels/marks.
- The estimated monthly payment block should not clip/trail off and should have clean top/bottom edges.

## Income Tool Findings
- Purpose is monthly take-home / cashflow, not total annual savings planning.
- Backdoor Roth IRA was removed because the user front-loads it and does not want it treated as monthly cashflow.
- HSA is a direct contribution input.
- HSA slider max should match the single-filer limit being used.
- Savings controls should be sliders in a 2x2 grid:
  - employee 401(k)
  - employer match rate
  - mega backdoor amount
  - HSA contribution
- Mega backdoor must not crowd out employer match.
  - Cap mega by remaining room after employee 401(k) plus employer match.
- Tax assumptions belong in a collapsed section.
- Limits can live in that collapsed section too.
- Remove empty-looking rows caused by doubled section/child dividers.

## Tax / Calculation Assumptions Captured In Thread
- Employer match should be modeled as applying to the regular employee 401(k) deferral, not mega backdoor.
- California bracket values in `income.html` were updated to the user-provided schedule during the thread.
- HSA is treated as pre-tax for federal income tax and FICA in the calculator logic.

## Editing Guardrails
- When changing shared styles, avoid breaking the app-specific layouts.
- Prefer minimal, targeted visual changes.
- If the user reacts negatively to a styling direction, revert that specific pass instead of defending it.
