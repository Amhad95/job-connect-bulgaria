

## Push Footer Down on Jobs Page

The Jobs page is inside `AppLayout` which renders Header → `<main>` (flex-1) → Footer. The 3-column container uses `height: calc(100vh - 8rem)` which leaves too little breathing room.

### Change

**`src/pages/Jobs.tsx` line 225**: Reduce the subtracted value from `8rem` to `7rem` so the columns get more vertical space, pushing the footer further down:

```tsx
// from
style={{ height: "calc(100vh - 8rem)" }}
// to
style={{ height: "calc(100vh - 7rem)" }}
```

Additionally, reduce vertical padding from `py-6` to `py-4` to reclaim even more space for the columns themselves while still maintaining a gap before the footer.

