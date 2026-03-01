

## Job Preview: Bottom Drawer for Smaller Screens

**Problem**: The job preview panel is only visible on `lg` screens (`hidden ... lg:flex` at line 234). On any smaller screen, clicking a job card selects it visually but shows no preview — nothing happens.

**Solution**: When a job is selected on screens below `lg`, show the preview content in a bottom **Drawer** (using the existing `vaul` Drawer component) that the user can swipe down or tap outside to dismiss.

### Changes

**`src/pages/Jobs.tsx`**:
1. Import `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` from `@/components/ui/drawer` and `useIsMobile` from `@/hooks/use-mobile`.
2. Extract the preview panel content (lines 235-305) into a shared `<JobPreviewContent />` inline component to avoid duplication.
3. Keep the existing `<aside>` for `lg` screens (desktop sidebar) — no change there.
4. Add a `<Drawer>` that:
   - Is `open` when `selectedJob` is not null AND screen is below `lg` (use a media query hook or the existing `useIsMobile` — but since the breakpoint here is `lg` not `md`, we need a small adjustment or a new check).
   - `onOpenChange` sets `selectedJob` to `null` when closed.
   - Contains `<DrawerContent>` with the same preview content, scrollable, max height ~85vh.
5. Since `useIsMobile` uses 768px but we need 1024px (lg), we'll use a simple `useState` + `matchMedia` inline for the `lg` breakpoint, or just always render the Drawer and control visibility: the Drawer opens when `selectedJob` is set and the `aside` is hidden (below lg). On lg+ the aside is visible and the Drawer won't interfere because we only open it when not lg.

**Approach**: Use a `useIsLg` check (inline `matchMedia` for `min-width: 1024px`). When `!isLg && selectedJob`, open the Drawer. When the user dismisses it, clear `selectedJob`.

### Technical detail

```text
Desktop (>=1024px):  sidebar preview (existing, unchanged)
Tablet/Mobile (<1024px):  bottom Drawer with swipe-to-dismiss
```

The Drawer will reuse the exact same preview content (company header, badges, description, action buttons) wrapped in a scrollable container with `max-h-[85vh]`.

