import { lazy } from "solid-js";
import { createAppStructure } from "@simplysm/solid";
import {
  IconBell,
  IconCards,
  IconForms,
  IconHome,
  IconLayoutList,
  IconLayoutSidebar,
  IconPlug,
  IconWindowMaximize,
} from "@tabler/icons-solidjs";
import { MainPage } from "./pages/main/MainPage";

export const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items: [
    {
      code: "home",
      title: "Home",
      children: [
        {
          code: "main",
          title: "Main",
          icon: IconHome,
          component: MainPage,
        },
        {
          code: "form-control",
          title: "Form Control",
          icon: IconForms,
          children: [
            {
              code: "button",
              title: "Button",
              component: lazy(() => import("./pages/form-control/ButtonPage")),
            },
            {
              code: "select",
              title: "Select",
              component: lazy(() => import("./pages/form-control/SelectPage")),
            },
            {
              code: "combobox",
              title: "Combobox",
              component: lazy(() => import("./pages/form-control/ComboboxPage")),
            },
            {
              code: "field",
              title: "Field",
              component: lazy(() => import("./pages/form-control/FieldPage")),
            },
            {
              code: "color-picker",
              title: "ColorPicker",
              component: lazy(() => import("./pages/form-control/ColorPickerPage")),
            },
            {
              code: "checkbox-radio",
              title: "Checkbox & Radio",
              component: lazy(() => import("./pages/form-control/CheckBoxRadioPage")),
            },
            {
              code: "checkbox-radio-group",
              title: "CheckboxGroup & RadioGroup",
              component: lazy(() => import("./pages/form-control/CheckBoxRadioGroupPage")),
            },
            {
              code: "date-range-picker",
              title: "DateRangePicker",
              component: lazy(() => import("./pages/form-control/DateRangePickerPage")),
            },
            {
              code: "rich-text-editor",
              title: "RichTextEditor",
              component: lazy(() => import("./pages/form-control/RichTextEditorPage")),
            },
            {
              code: "numpad",
              title: "Numpad",
              component: lazy(() => import("./pages/form-control/NumpadPage")),
            },
            {
              code: "state-preset",
              title: "StatePreset",
              component: lazy(() => import("./pages/form-control/StatePresetPage")),
            },
            {
              code: "theme-toggle",
              title: "ThemeToggle",
              component: lazy(() => import("./pages/form-control/ThemeTogglePage")),
            },
          ],
        },
        {
          code: "layout",
          title: "Layout",
          icon: IconLayoutSidebar,
          children: [
            {
              code: "sidebar",
              title: "Sidebar",
              component: lazy(() => import("./pages/layout/SidebarPage")),
            },
            {
              code: "topbar",
              title: "Topbar",
              component: lazy(() => import("./pages/layout/TopbarPage")),
            },
            {
              code: "form-group",
              title: "FormGroup",
              component: lazy(() => import("./pages/layout/FormGroupPage")),
            },
            {
              code: "form-table",
              title: "FormTable",
              component: lazy(() => import("./pages/layout/FormTablePage")),
            },
          ],
        },
        {
          code: "data",
          title: "Data",
          icon: IconLayoutList,
          children: [
            { code: "list", title: "List", component: lazy(() => import("./pages/data/ListPage")) },
            {
              code: "table",
              title: "Table",
              component: lazy(() => import("./pages/data/TablePage")),
            },
            {
              code: "pagination",
              title: "Pagination",
              component: lazy(() => import("./pages/data/PaginationPage")),
            },
            {
              code: "sheet",
              title: "DataSheet",
              component: lazy(() => import("./pages/data/SheetPage")),
            },
            {
              code: "sheet-full",
              title: "DataSheet (Full)",
              component: lazy(() => import("./pages/data/SheetFullPage")),
            },
            {
              code: "kanban",
              title: "Kanban",
              component: lazy(() => import("./pages/data/KanbanPage")),
            },
            {
              code: "calendar",
              title: "Calendar",
              component: lazy(() => import("./pages/data/CalendarPage")),
            },
            {
              code: "permission-table",
              title: "PermissionTable",
              component: lazy(() => import("./pages/data/PermissionTablePage")),
            },
            {
              code: "crud-sheet",
              title: "CrudSheet",
              component: lazy(() => import("./pages/data/CrudSheetPage")),
            },
          ],
        },
        {
          code: "disclosure",
          title: "Disclosure",
          icon: IconWindowMaximize,
          children: [
            {
              code: "collapse",
              title: "Collapse",
              component: lazy(() => import("./pages/disclosure/CollapsePage")),
            },
            {
              code: "dropdown",
              title: "Dropdown",
              component: lazy(() => import("./pages/disclosure/DropdownPage")),
            },
            {
              code: "modal",
              title: "Dialog",
              component: lazy(() => import("./pages/disclosure/DialogPage")),
            },
            {
              code: "tab",
              title: "Tabs",
              component: lazy(() => import("./pages/disclosure/TabPage")),
            },
          ],
        },
        {
          code: "display",
          title: "Display",
          icon: IconCards,
          children: [
            {
              code: "card",
              title: "Card",
              component: lazy(() => import("./pages/display/CardPage")),
            },
            {
              code: "icon",
              title: "Icon",
              component: lazy(() => import("./pages/display/IconPage")),
            },
            {
              code: "label",
              title: "Tag",
              component: lazy(() => import("./pages/display/TagPage")),
            },
            {
              code: "note",
              title: "Alert",
              component: lazy(() => import("./pages/display/AlertPage")),
            },
            {
              code: "link",
              title: "Link",
              component: lazy(() => import("./pages/display/LinkPage")),
            },
            {
              code: "barcode",
              title: "Barcode",
              component: lazy(() => import("./pages/display/BarcodePage")),
            },
            {
              code: "echarts",
              title: "Echarts",
              component: lazy(() => import("./pages/display/EchartsPage")),
            },
          ],
        },
        {
          code: "feedback",
          title: "Feedback",
          icon: IconBell,
          children: [
            {
              code: "notification",
              title: "Notification",
              component: lazy(() => import("./pages/feedback/NotificationPage")),
            },
            {
              code: "busy",
              title: "Busy",
              component: lazy(() => import("./pages/feedback/BusyPage")),
            },
            {
              code: "progress",
              title: "Progress",
              component: lazy(() => import("./pages/feedback/ProgressPage")),
            },
            {
              code: "print",
              title: "Print",
              component: lazy(() => import("./pages/feedback/PrintPage")),
            },
          ],
        },
        {
          code: "service",
          title: "Service",
          icon: IconPlug,
          children: [
            {
              code: "client",
              title: "ServiceClient",
              component: lazy(() => import("./pages/service/ServiceClientPage")),
            },
            {
              code: "shared-data",
              title: "SharedData",
              component: lazy(() => import("./pages/service/SharedDataPage")),
            },
          ],
        },
      ],
    },
  ],
}));
