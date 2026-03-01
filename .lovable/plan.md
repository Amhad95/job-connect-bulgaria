

## Issues and Fixes

### 1. Hero illustration hidden on mobile
**Line 90 in Index.tsx**: `className="hidden md:flex ..."` — the illustration is intentionally hidden below `md` breakpoint. Fix: change to show on mobile too, but smaller.

### 2. Language toggle too big on mobile, should be in side menu
**Header.tsx lines 61-78**: The language toggle sits in the main navbar bar (visible on all sizes). On mobile it takes up significant space. Fix: hide it from the top bar on mobile (`hidden md:inline-flex`) and add it inside the mobile side menu (`mobileOpen` section, lines 121-161).

### 3. Job cards overflow on mobile
**Index.tsx line 117**: The grid `className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"` is fine, but the parent `<section>` uses `container` which should constrain width. The real issue is likely the JobCard itself — it has no `overflow-hidden` and contains `min-w-0` only on the inner div but the outer card div has no width constraint. Fix: add `overflow-hidden min-w-0` to the JobCard root div, and ensure the trending jobs section has `overflow-hidden` on its container.

### 4. Logo SVG flickers on navigation
The logo is imported as `import logo from "@/assets/bachkam-logo.svg"` — Vite bundles this as a hashed URL. The flicker happens because each page wraps content in `<Layout>` which includes `<Header>`, and since each page is a separate component, React unmounts and remounts `Layout`/`Header` on every route change. 

Fix: Move `Header` and `Footer` outside individual page routes in `App.tsx` so they persist across navigations. Create a shared layout route wrapper, or restructure so `Layout` wraps `<Routes>` at the top level instead of being called inside each page.

Actually, looking more carefully — the `DashboardLayout`, `AdminLayout`, and `EmployerLayout` already use `<Layout>` internally. The issue is that every page individually renders `<Layout>`. When navigating between `/` and `/jobs`, React unmounts the Index `<Layout>` and mounts the Jobs `<Layout>`, causing the Header to remount and the logo `<img>` to re-render (brief flash).

**Best fix**: Extract `Header` and `Footer` into a top-level layout route in `App.tsx` so they never unmount during client-side navigation. Pages that currently wrap in `<Layout>` will need that wrapper removed. The nested layouts (`DashboardLayout`, etc.) also use `<Layout>` internally — they'll need updating too.

---

## Implementation Plan

### Task 1: Persistent layout — fix logo flicker
- In `App.tsx`, wrap all routes in a new layout `Route` element that renders `Header`, `<Outlet>`, `Footer`
- Remove `<Layout>` wrapper from individual pages: `Index.tsx`, `Jobs.tsx`, `JobDetail.tsx`, `Auth.tsx`, `Employers.tsx`, `OptOut.tsx`, `Privacy.tsx`, `Terms.tsx`, `NotFound.tsx`, `About.tsx`, `Contact.tsx`, `Blog.tsx`, `BlogPost.tsx`
- Remove `<Layout>` from `DashboardLayout.tsx`, `EmployerLayout.tsx`, `AdminLayout.tsx`
- Wrap the `<main>` content directly

### Task 2: Mobile hero illustration
- In `Index.tsx` line 90, change `hidden md:flex` to `flex` and add responsive sizing (smaller on mobile)

### Task 3: Language toggle — mobile-friendly
- In `Header.tsx`, hide the language toggle from the top bar on mobile: add `hidden md:inline-flex` to the button
- Make the toggle smaller on mobile with compact classes
- Add the language toggle inside the mobile menu section

### Task 4: Job cards overflow
- Add `overflow-hidden` to the JobCard root div
- Add `overflow-hidden` to the trending jobs section container in Index.tsx

### Technical details

**App.tsx** restructure:
```tsx
// New top-level layout
function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}

// Routes wrapped:
<Route element={<AppLayout />}>
  <Route path="/" element={<Index />} />
  ...
</Route>
```

**Header.tsx** language toggle changes:
- Top bar: `className="hidden md:inline-flex ..."` 
- Mobile menu: Add compact toggle with `px-2 py-1 text-xs`

**Index.tsx** hero illustration:
- Change `hidden md:flex` → `flex` with `max-w-[200px] md:max-w-md`

**JobCard.tsx**:
- Add `overflow-hidden` to root div

