

## Fix: Preview panel feels squeezed vertically

The preview panel is `w-96` (384px) wide but the main container height is `calc(100vh - 13rem)`. The "showing X jobs" text sits outside the flex container, eating into available height. Additionally, the job count line and its padding add unnecessary vertical space.

### Changes

1. **`Jobs.tsx`** — Merge the "showing X jobs" line into the flex container (inside the job list column) and increase the viewport height allocation from `13rem` to `~10rem` so the preview panel gets more vertical space. Widen preview panel from `w-96` to `w-[28rem]` for less horizontal squeeze.

Specifically:
- Move the `<p>` showing job count into the job list column (above the scrollable area)
- Remove the separate `<div className="container py-3">` wrapper for that line
- Change the height calc from `13rem` to `10rem` to reclaim ~48px of vertical space
- Widen the preview aside from `w-96` to `w-[28rem]`

