# solid-demo Design Refresh

Reference: `simplysm-opus/packages/client-admin` design patterns

## Scope

Apply design improvements from client-admin to solid-demo, focusing on visual design only (not business logic).

## 1. LoginPage

### Before
- Manual `div` styling with gradient background
- No input icons
- Raw `<span>` with `alert()` for links
- No animations

### After
- Use `Card` component with `rounded-2xl p-8`
- Neutral background: `bg-base-100 dark:bg-base-900`
- Add `prefixIcon={IconMail}` and `prefixIcon={IconLock}` to TextInput fields
- Add `animate-fade-in` to logo, `animate-fade-in [animation-delay:0.3s]` to Card
- Use `Link` component instead of raw spans
- Login button inside `FormGroup.Item` (not separate `div`)
- `ThemeToggle` stays at `fixed bottom-4 right-4`

## 2. Home Layout (Home.tsx)

### Before
```
Sidebar [Logo + ThemeToggle | User | Menu | v13.0(absolute)]
  main > Suspense > children
```

### After
```
Sidebar [Logo | User | Menu | v13.0(flow)]
  Topbar.Container
    Topbar [breadcrumb title | flex-1 | ThemeToggle]
    main > Suspense > children
```

Changes:
- Add `Topbar.Container` + `Topbar` in Home.tsx
- Breadcrumb title via `appStructure.getTitleChainByHref(location.pathname)`
- Move `ThemeToggle` from Sidebar to Topbar right side
- Version info: Remove `absolute` positioning, use normal flow

## 3. All Demo Pages (~48 pages)

### Before
Each page wraps content in its own `Topbar.Container` + `Topbar`:
```tsx
<Topbar.Container>
  <Topbar>
    <h1 class="m-0 text-base">Page Title</h1>
  </Topbar>
  <div class="flex-1 overflow-auto p-6">
    <div class="space-y-8">{/* sections */}</div>
  </div>
</Topbar.Container>
```

### After
Pages render content only (Topbar handled by Home.tsx):
```tsx
<div class="space-y-8 p-6">
  {/* sections */}
</div>
```

### Section Header Style
Before:
```tsx
<h2 class="mb-4 text-xl font-bold">Section Title</h2>
```

After:
```tsx
<h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Section Title</h2>
```

## Files to Modify

1. `packages/solid-demo/src/pages/LoginPage.tsx` - Login redesign
2. `packages/solid-demo/src/pages/Home.tsx` - Add Topbar, move ThemeToggle
3. `packages/solid-demo/src/pages/**/*.tsx` (~48 files) - Remove Topbar wrapper, update section headers
4. `packages/solid-demo/src/main.tsx` - May need route adjustment if page structure changes
