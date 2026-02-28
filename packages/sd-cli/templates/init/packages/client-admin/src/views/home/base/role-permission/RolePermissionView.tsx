import { createSignal, Show } from "solid-js";
import { Button, Icon, SharedDataSelectList, useDialog, useSharedData } from "@simplysm/solid";
import type { AppSharedData, RoleSharedItem } from "../../../../providers/configureSharedData";
import { RolePermissionDetail } from "./RolePermissionDetail";
import { RoleSheet } from "./RoleSheet";
import { IconExternalLink } from "@tabler/icons-solidjs";

export function RolePermissionView() {
  const dialog = useDialog();
  const sharedData = useSharedData<AppSharedData>();
  const [selectedRole, setSelectedRole] = createSignal<RoleSharedItem>();

  return (
    <div class="flex h-full flex-row">
      <SharedDataSelectList
        class={"border-r border-base-200 p-1.5 py-3"}
        data={sharedData.role}
        value={selectedRole()}
        onValueChange={setSelectedRole}
        header={
          <div class={"flex flex-row p-1"}>
            <div class={"flex-1 font-bold text-base-400"}>권한그룹</div>
            <Button
              variant={"ghost"}
              theme={"primary"}
              size={"xs"}
              onClick={() => dialog.show(() => <RoleSheet />, { header: "권한그룹", closeOnBackdrop: true })}
            >
              <Icon icon={IconExternalLink} />
            </Button>
          </div>
        }
        required
      >
        <SharedDataSelectList.ItemTemplate<RoleSharedItem>>
          {(item) => <>{item.name}</>}
        </SharedDataSelectList.ItemTemplate>
      </SharedDataSelectList>

      <Show
        when={selectedRole()}
        fallback={
          <div class="flex flex-1 items-center justify-center text-4xl leading-relaxed text-base-300">
            권한그룹을 선택하세요.
          </div>
        }
      >
        <RolePermissionDetail roleId={selectedRole()!.id} />
      </Show>
    </div>
  );
}
