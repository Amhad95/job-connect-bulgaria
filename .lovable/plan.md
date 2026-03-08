

## Plan: Fix Date Picker Layout

### Problem
The Calendar uses `captionLayout="dropdown-buttons"` which renders both month/year dropdown selectors AND left/right navigation arrows simultaneously. This makes the calendar header too wide, causing it to overflow and get cropped — especially on mobile.

### Fix
Change `captionLayout="dropdown-buttons"` to `captionLayout="dropdown"` in both files. This keeps the month/year dropdowns (essential for picking birth years across a wide range) but removes the redundant navigation arrows, resulting in a compact, single-row header.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` (line 208) | `captionLayout="dropdown-buttons"` → `captionLayout="dropdown"` |
| `src/pages/CompleteProfile.tsx` (line 104) | `captionLayout="dropdown-buttons"` → `captionLayout="dropdown"` |

