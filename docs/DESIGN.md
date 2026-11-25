# Song and Scripture: Design

Agreed on 25 November 2026. The mockups discussed in the planning chat are the target. Build to match them, and compare real screenshots against them at each milestone.

## Principles

- Mostly black and white, with blue as the accent. Colour must always mean something.
- Colour never carries meaning alone: every colour has a label or an icon beside it.
- High contrast everywhere. Church projectors and laptops are often dim or washed out.
- The audience screen is always plain: white text on black, or black text on white. No accent colours on the audience screen.
- Two themes, dark and light. The operator screen and the audience screen are set separately.
- Large, labelled buttons. No unlabelled icon-only controls for important actions.

## Palette

| Token | Role | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | Window background | `#0A0A0A` | `#FFFFFF` |
| `--panel` | Panels, toolbar, tray header | `#171717` | `#F5F5F5` |
| `--border` | Hairlines and dividers | `#2E2E2E` | `#E5E5E5` |
| `--border-control` | Button borders | `#2E2E2E` | `#D4D4D4` |
| `--text` | Main text | `#FFFFFF` | `#0A0A0A` |
| `--text-2` | Secondary text | `#A3A3A3` | `#737373` |
| `--blue` | Accent, selection, Go live | `#3B82F6` | `#2563EB` |
| `--blue-text` | Blue used as text | `#60A5FA` | `#2563EB` |
| `--select` | Selected row background | `#1E3A8A` | `#DBEAFE` |
| `--select-text` | Text on selected row | `#FFFFFF` | `#1E3A8A` |
| `--live` | Live on screen (red) | `#E5484D` | `#DC2626` |
| `--ready` | Ready, connected (green) | `#30A46C` | `#15803D` |
| `--warn` | Warnings, alerts, Bridge (amber) | `#F5A524` | `#B45309` |
| `--warn-text` | Text on an amber fill | `#0A0A0A` | `#FFFFFF` |
| `--chorus` | Chorus (purple) | `#A78BFA` | `#7C3AED` |
| `--scripture` | Scripture (teal) | `#2DD4BF` | `#0F766E` |
| `--output-bg` | Output preview background | `#000000` | `#FFFFFF` |
| `--output-text` | Output preview text | `#FFFFFF` | `#0A0A0A` |

## Colour meanings

- **Blue:** selection, focus, Go live, Verse labels, songs.
- **Red:** only for what is live on screen.
- **Green:** an item is ready, or the projector is connected.
- **Amber:** warnings (for example a missing video file), the active alert, and Bridge labels.
- **Purple:** Chorus labels.
- **Teal:** scripture: the Scriptures tab, verse references, verse thumbnails.

## Layout

Modelled on the familiar four-zone arrangement used by church presentation software, with our own look.

1. **Toolbar (top):** New, Open, Save, Remote on the left. Alerts, Logo, Black, Clear and Go live on the right.
2. **Schedule (left):** The order of service. Songs expand to show sections, each with a coloured bar. Status icons on the right of each item (ready tick, warning triangle).
3. **Preview (middle):** The next item. A row of slide thumbnails, then the preview output, then slide navigation.
4. **Live (right):** What is on screen now, with a LIVE badge. Section list with the active section outlined in red, then the live output and slide navigation.
5. **Tray (bottom):** Tabs for Songs, Scriptures, Media and Themes, with a search box. Scriptures shows a Bible version list and verse rows.
6. **Status bar (very bottom):** Projector connected, any alert currently on screen, autosave state.

## Typography

- Interface: the system UI font.
- Verse text on the audience screen: a serif face. Lyrics: a bold sans-serif face.
- Minimum interface text size: 11 px.

## Milestone checks

At each milestone, compare a real screenshot of the running app, in both themes, with the matching mockup before moving on.
