# Layout

## FormGroup

```typescript
interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}
```

Groups form fields vertically (default) or horizontally with `inline`.

**Sub-component:** `FormGroup.Item` — `{ label?: JSX.Element } & JSX.HTMLAttributes<HTMLDivElement>`

---

## FormTable

```typescript
interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}
```

Arranges form fields in a label-value table layout.

**Sub-components:**
- `FormTable.Row` — table row
- `FormTable.Item` — `{ label?: JSX.Element } & JSX.TdHTMLAttributes<HTMLTableCellElement>`

---

## Sidebar

```typescript
interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

Collapsible sidebar navigation. Must be wrapped in `Sidebar.Container`.

**Sub-components:**
- `Sidebar.Container` — layout wrapper that includes both sidebar and main content
- `Sidebar.Menu` — `{ menus: AppMenu[] }` — renders navigation tree from `AppMenu` data
- `Sidebar.User` — `{ name: string; icon?: Component; description?: string; menus?: SidebarUserMenu[] }` — user profile section with optional dropdown menus

**Hook:** `useSidebar()` — access sidebar state (collapsed, toggle, etc.)

---

## Topbar

```typescript
interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

Top navigation bar. Must be wrapped in `Topbar.Container`.

**Sub-components:**
- `Topbar.Container` — layout wrapper
- `Topbar.Menu` — `{ menus: TopbarMenuItem[] }` — renders top-level navigation
- `Topbar.User` — `{ menus?: TopbarUserMenu[]; children: JSX.Element }` — user section with dropdown

**Hooks:**
- `useTopbarActionsAccessor()` — access topbar actions element
- `useTopbarActions(accessor)` — register topbar actions from child components

---

## Usage Examples

```typescript
import { Sidebar, FormGroup, FormTable } from "@simplysm/solid";

// Sidebar layout
<Sidebar.Container>
  <Sidebar>
    <Sidebar.User name="John" description="Admin" />
    <Sidebar.Menu menus={appMenus} />
  </Sidebar>
  <main>Content</main>
</Sidebar.Container>

// Form with labeled fields
<FormGroup>
  <FormGroup.Item label="Name">
    <TextInput value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="Email">
    <TextInput value={email()} onValueChange={setEmail} type="email" />
  </FormGroup.Item>
</FormGroup>
```
