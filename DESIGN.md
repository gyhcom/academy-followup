# Academy Follow-up Design Direction

## Primary Reference

The active visual reference is the Figma community file:

- `Customer Relationship Management Design Kit (Community)`
- Key screens: `Customers`, `Documents`

This project should not look like a generic KPI dashboard. Use the CRM kit as the product baseline:

- Light app shell, white work surfaces, subtle borders.
- Compact left navigation with a soft active state.
- Search, filter, table/list, and detail-panel workflows.
- Small semantic badges instead of large colorful cards.
- Record-list first: choose a student/class/date, then act in the adjacent panel.

## Product Shape

Academy Follow-up is an operating console, not a marketing dashboard.

- Owner/manager: academy operations console.
- Teacher/assistant: class processing tool.
- Super admin: separate `/platform` console.

PC-first screens should prefer:

- Left navigation.
- Top context bar.
- Main record list or table.
- Right work/detail panel.
- Thin dividers and row rhythm.

Mobile keeps the bottom tab and simple list flow.

## Color System

Use a restrained CRM palette:

- App background: `#F6F5F8`
- Surface: `#FFFFFF`
- Muted surface: `#FAFAFC`
- Border: `#E4E2EA`
- Strong border: `#D4D1DE`
- Text: `#1E1F28`
- Muted text: `#6F7280`
- Accent: `#7C3AED`
- Accent soft: `#F1EAFF`

Semantic colors are only for state:

- Success: green.
- Warning: amber.
- Danger: red.
- Info/shared: blue/violet.

Avoid large colored panels, pastel board stacks, thick side rails, oversized rounded tiles, and repeated KPI cards unless the number is directly actionable.

## Component Rules

- Active navigation: soft tint + text weight + thin outline. No thick vertical rail.
- Rows: title, metadata, small badge, optional right action.
- Panels: white surface, subtle border, 8px radius maximum.
- Buttons: one primary action per work area; secondary actions are outline/ghost.
- Badges: small lozenge, not pill-heavy decoration.
- Icons: utility icons only; avoid decorative 3D icons in core work screens.

## Implementation Scope

The current design reset should be applied screen by screen:

1. Design tokens and shell.
2. Student/management CRM record workspace.
3. Message workspace.
4. Attendance calendar and ledger.
5. Home overview.

Do not change API, DB schema, auth, message sending logic, or Spring/Railway deployment as part of visual work.
