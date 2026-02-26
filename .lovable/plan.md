

## Plan: Revert hero to centered text with smaller SVG accent

The current layout splits the hero into a 2-column grid (text left, large SVG right). The user wants:
1. Text content back in the center (single column, centered)
2. SVG still visible but smaller — used as a decorative accent rather than a full-width illustration

### Changes (single file: `src/pages/Index.tsx`)

**Hero section (lines 23-75):**
- Remove the `md:grid-cols-2` grid layout, go back to single centered column
- Keep all text content centered (`text-center`)
- Place the SVG as a small decorative element above or below the headline — roughly `max-w-[200px]` or similar, centered, with reduced opacity or as a subtle accent
- Remove the `hidden md:flex` wrapper so the SVG is visible on all screen sizes but stays small and decorative
- Keep `animate-fade-in` and `drop-shadow-lg` on the image

Result: centered hero text with the SVG as a small illustration accent (around 180–220px wide), not dominating the section.

