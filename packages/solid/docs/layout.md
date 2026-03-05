# Layout

Structural layout components for page scaffolding and form organization.

---

## `FormGroup`

Responsive form layout wrapper. Arranges label-field pairs horizontally when `inline`.

```tsx
import { FormGroup } from "@simplysm/solid";

<FormGroup inline>
  <FormGroup.Item label="Name">
    <TextInput value={name} onValueChange={setName} />
  </FormGroup.Item>
</FormGroup>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `inline` | `boolean` | Horizontal layout |

Sub-components: `FormGroup.Item` (prop: `label?: JSX.Element`)

---

## `FormTable`

Styled HTML table for form layouts. Header cells are right-aligned.

```tsx
import { FormTable } from "@simplysm/solid";

<FormTable>
  <tbody>
    <tr>
      <th>Label</th>
      <td><TextInput value={val} onValueChange={setVal} /></td>
    </tr>
  </tbody>
</FormTable>
```

Extends `JSX.HTMLAttributes<HTMLTableElement>`.

---

## `Sidebar`

Responsive sidebar navigation. Always visible on desktop, toggleable overlay on mobile.

```tsx
import { Sidebar } from "@simplysm/solid";

<Sidebar.Container>
  <Sidebar>
    <Sidebar.Menu>{/* menu items */}</Sidebar.Menu>
    <Sidebar.User name="User" />
  </Sidebar>
  <main>{/* page content */}</main>
</Sidebar.Container>
```

Sub-components: `Sidebar.Container`, `Sidebar.Menu`, `Sidebar.User`

**`SidebarUserProps`**

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | User display name |
| `description` | `string` | Optional subtitle |

---

## `SidebarContext`

Context and utilities for the Sidebar component.

```tsx
import { SidebarContext, useSidebar, SM_MEDIA_QUERY } from "@simplysm/solid";
```

| Export | Description |
|--------|-------------|
| `SM_MEDIA_QUERY` | Media query string for small screen breakpoint |
| `SidebarContext` | SolidJS context object |
| `useSidebar()` | Hook — throws if outside Sidebar |
| `useSidebar.optional()` | Hook — returns undefined if outside Sidebar |

---

## `Topbar`

Top navigation bar with actions, menu, and user profile slots.

```tsx
import { Topbar } from "@simplysm/solid";

<Topbar.Container>
  <Topbar>
    <Topbar.Menu>{/* nav items */}</Topbar.Menu>
    <Topbar.Actions>{/* right-side actions */}</Topbar.Actions>
    <Topbar.User name="User" />
  </Topbar>
  <main>{/* page content */}</main>
</Topbar.Container>
```

Sub-components: `Topbar.Actions`, `Topbar.Container`, `Topbar.Menu`, `Topbar.User`

---

## `TopbarContext`

Context and utilities for injecting actions into the Topbar from child pages.

```tsx
import { TopbarContext, useTopbarActionsAccessor, createTopbarActions } from "@simplysm/solid";

// Inside a page component:
createTopbarActions(() => (
  <Button onClick={save}>Save</Button>
));
```

| Export | Description |
|--------|-------------|
| `TopbarContext` | SolidJS context object |
| `useTopbarActionsAccessor()` | Hook — returns accessor to current topbar actions element |
| `createTopbarActions(factory)` | Registers a reactive topbar actions element for the current page |
