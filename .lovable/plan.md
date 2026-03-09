

## Plan: Show "бачкам" logo text on mobile

### Problem
The brand text "бачкам" has `hidden md:inline` classes, which hides it on screens below 768px.

### Fix
**`src/components/Header.tsx` (line 50)** — Remove `hidden` and `md:inline` so the text is always visible:

```tsx
<span className="text-2xl text-primary">бачкам</span>
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Remove `hidden md:inline lg:inline` from the brand text span |

