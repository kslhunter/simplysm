import { For } from "solid-js";
import { Icon } from "@simplysm/solid";
import {
  IconHome,
  IconUser,
  IconSettings,
  IconBell,
  IconSearch,
  IconHeart,
  IconStar,
  IconCheck,
  IconX,
  IconPlus,
  IconMinus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconUpload,
  IconMail,
  IconPhone,
  IconCalendar,
  IconClock,
  IconMap,
} from "@tabler/icons-solidjs";

const icons = [
  { icon: IconHome, name: "Home" },
  { icon: IconUser, name: "User" },
  { icon: IconSettings, name: "Settings" },
  { icon: IconBell, name: "Bell" },
  { icon: IconSearch, name: "Search" },
  { icon: IconHeart, name: "Heart" },
  { icon: IconStar, name: "Star" },
  { icon: IconCheck, name: "Check" },
  { icon: IconX, name: "X" },
  { icon: IconPlus, name: "Plus" },
  { icon: IconMinus, name: "Minus" },
  { icon: IconEdit, name: "Edit" },
  { icon: IconTrash, name: "Trash" },
  { icon: IconDownload, name: "Download" },
  { icon: IconUpload, name: "Upload" },
  { icon: IconMail, name: "Mail" },
  { icon: IconPhone, name: "Phone" },
  { icon: IconCalendar, name: "Calendar" },
  { icon: IconClock, name: "Clock" },
  { icon: IconMap, name: "Map" },
];

export default function IconPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Basic Usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          The Icon component wraps icons from @tabler/icons-solidjs.
        </p>
        <div class="flex items-center gap-4">
          <Icon icon={IconHome} />
          <Icon icon={IconUser} />
          <Icon icon={IconSettings} />
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Sizes</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can adjust the icon size with the size prop. Default is 1.25em.
        </p>
        <div class="flex items-end gap-4">
          <div class="flex flex-col items-center gap-1">
            <Icon icon={IconStar} size="1em" />
            <span class="text-xs text-base-500">1em</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <Icon icon={IconStar} size="1.25em" />
            <span class="text-xs text-base-500">1.25em</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <Icon icon={IconStar} size="1.5em" />
            <span class="text-xs text-base-500">1.5em</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <Icon icon={IconStar} size="2em" />
            <span class="text-xs text-base-500">2em</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <Icon icon={IconStar} size="3em" />
            <span class="text-xs text-base-500">3em</span>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Colors</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can specify colors using the class prop.
        </p>
        <div class="flex items-center gap-4">
          <Icon icon={IconHeart} size="1.5em" class="text-danger-500" />
          <Icon icon={IconStar} size="1.5em" class="text-warning-500" />
          <Icon icon={IconCheck} size="1.5em" class="text-success-500" />
          <Icon icon={IconBell} size="1.5em" class="text-info-500" />
          <Icon icon={IconUser} size="1.5em" class="text-primary-500" />
        </div>
      </section>

      {/* Icon Gallery */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Icon Gallery</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          This is a list of commonly used icons. More icons are available from @tabler/icons-solidjs.
        </p>
        <div class="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
          <For each={icons}>
            {(item) => (
              <div class="flex flex-col items-center gap-1 rounded p-2 hover:bg-base-100 dark:hover:bg-base-700">
                <Icon icon={item.icon} size="1.5em" />
                <span class="text-xs text-base-500">{item.name}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* With Text */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">With Text</h2>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <Icon icon={IconMail} class="text-base-500" />
            <span>contact@example.com</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon icon={IconPhone} class="text-base-500" />
            <span>+82-10-1234-5678</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon icon={IconMap} class="text-base-500" />
            <span>Seoul, Gangnam-gu, South Korea</span>
          </div>
        </div>
      </section>
    </div>
  );
}
