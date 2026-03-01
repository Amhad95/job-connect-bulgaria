
## Fix: Restore contained scrolling for the 3-column layout

The previous fix changed `height` to `minHeight`, which broke the contained layout. The 3-column Jobs page (filters | job list | preview) needs a **fixed height** container so each column scrolls independently — otherwise the entire page scrolls and the preview panel becomes unusable.

### Change

**`src/pages/Jobs.tsx` line 225**: Revert to a fixed `height` but use a taller calculation that leaves proper space from the footer. Change from:

```tsx
<div className="container flex gap-6 py-6" style={{ minHeight: "calc(100vh - 10rem)" }}>
```

to:

```tsx
<div className="container flex gap-6 py-6" style={{ height: "calc(100vh - 8rem)" }}>
```

This gives the container a fixed height (enabling independent column scrolling for the preview panel) while using `8rem` instead of `10rem` to provide more vertical space for content — the previous `10rem` subtraction was too aggressive and squeezed the view.

The `py-6` padding already adds bottom spacing from the footer.
