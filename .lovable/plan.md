

## Plan: Split hero into headline+SVG row on top, centered search/CTA below

The user wants a two-part hero layout:

1. **Top row**: Left-right split — headline text on the left, SVG illustration on the right (side by side on desktop, stacked on mobile)
2. **Bottom area**: Search bar, Upload CV button, and popular search badges remain **fully centered** beneath the split row

### Changes (single file: `src/pages/Index.tsx`, lines 23-71)

**Structure:**
```text
┌─────────────────────────────────────────┐
│  Headline + Subheadline  │  SVG (small) │  ← md:grid-cols-2, items-center
│  (left-aligned on md+)   │              │
├─────────────────────────────────────────┤
│        [Search bar]  (centered)         │  ← full-width centered below
│        [Upload CV]   (centered)         │
│     [badge] [badge] [badge] ...         │
└─────────────────────────────────────────┘
```

- Wrap h1 + subheadline in a `md:grid-cols-2` grid row with text left-aligned on desktop, SVG on right (~250px max, centered in its cell)
- On mobile: stack text above SVG, both centered
- Search bar, Upload CV button, and popular search badges sit **outside** the grid, in a centered flex column below it
- SVG keeps `animate-fade-in` and `drop-shadow-lg`

