# Stitch → full app apply

Source design: `northlight-components.html` / `.png` (Northlight booking kit).

Also applied to **baseline + chrome**: `BaselineConcertApp`, `BookingWorkspace` header, guided coach, adaptation modal, gallery index (hostile 16px/32px targets kept on baseline).

Applied to **all 8** GenUI registry components in `src/components/booking/registry/`:

| Component | Visual change |
|-----------|---------------|
| `ZoneCardSelector` | Radio indicators, “Most Popular” badge, large price, seats-left |
| `InteractiveSeatMap` | Stage ribbon, VIP/floor/balcony palette, legend |
| `CompactRadialZoneHub` | Center hub card, accent dots per zone |
| `DropdownSelect` + `TicketCountDropdown` | Labeled dropdown, amber chevron, larger targets |
| `LargeStepperControl` | Unified stepper bar on surface container |
| `RadioPillGrid` | Solid amber selected pills in surface card |
| `CompactCenterStepper` | Compact center ticket row |
| `ConfirmActionButton` | Order summary drawer + HCI fee + lock line |

Tokens: `--nl-*` in `globals.css`, Space Grotesk via `--font-space-grotesk`.

Stitch MCP `generate_screen_from_text` / REST OAuth were unavailable this session (schema / 401); apply used the already-downloaded kit assets under `docs/stitch/`.
