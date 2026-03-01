

## Fix бачкам text color

The user wants the "бачкам" text to use the existing `text-primary` class (which maps to the project's blue `hsl(221 83% 53%)` ≈ `#2563EB`), not a custom arbitrary hex value. The current code already uses `text-primary` in both Header and Footer — so actually the color is already correctly set to the project's blue.

Looking at the current code:
- **Header.tsx line 44**: `<span className="text-2xl text-primary">бачкам</span>` — already correct
- **Footer.tsx line 15**: `<span className="font-display text-xl font-bold text-primary">бачкам</span>` — already correct

The `text-primary` class resolves to `hsl(221 83% 53%)` which is `#2563EB` — the same blue used for buttons and other UI elements throughout the app. This is the correct approach; no changes are needed.

**No code changes required.** The бачкам text is already using `text-primary`, which is the same blue as buttons and other primary elements. The icon is also correctly imported and displayed.

