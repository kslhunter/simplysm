import { For } from "solid-js";
import { Icon, Topbar } from "@simplysm/solid";
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
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Icon</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic Usage */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 사용법</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Icon 컴포넌트는 @tabler/icons-solidjs의 아이콘을 래핑합니다.
            </p>
            <div class="flex items-center gap-4">
              <Icon icon={IconHome} />
              <Icon icon={IconUser} />
              <Icon icon={IconSettings} />
            </div>
          </section>

          {/* Sizes */}
          <section>
            <h2 class="mb-4 text-xl font-bold">크기</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              size prop으로 아이콘 크기를 조절할 수 있습니다. 기본값은 1.25em입니다.
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
            <h2 class="mb-4 text-xl font-bold">색상</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              class prop으로 색상을 지정할 수 있습니다.
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
            <h2 class="mb-4 text-xl font-bold">아이콘 갤러리</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              자주 사용되는 아이콘 목록입니다. @tabler/icons-solidjs에서 더 많은 아이콘을 사용할 수
              있습니다.
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
            <h2 class="mb-4 text-xl font-bold">텍스트와 함께</h2>
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <Icon icon={IconMail} class="text-base-500" />
                <span>contact@example.com</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon icon={IconPhone} class="text-base-500" />
                <span>010-1234-5678</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon icon={IconMap} class="text-base-500" />
                <span>서울특별시 강남구</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
