import { createSignal } from "solid-js";
import { BusyContainer, Button, useNotification } from "@simplysm/solid";
import { useAppService } from "../providers/AppServiceProvider";
import { useAppStructure } from "../providers/AppStructureProvider";

export function DevDialog() {
  const serv = useAppService();
  const noti = useNotification();
  const appStructure = useAppStructure();
  const [busyCount, setBusyCount] = createSignal(0);

  const handleInitDb = async () => {
    setBusyCount((c) => c + 1);
    try {
      const permCodes = appStructure.allFlatPerms.map((p) => p.code);
      await serv.dev.initDb(permCodes);
      noti.success("DB 초기화 완료");
    } catch (err) {
      noti.error(err, "오류");
    }
    setBusyCount((c) => c - 1);
  };

  return (
    <BusyContainer busy={busyCount() > 0}>
      <div class="inline-flex flex-row gap-2 p-2">
        <Button onClick={handleInitDb} theme="primary" variant="solid">
          DB 초기화
        </Button>
        <Button onClick={() => location.reload()}>새로고침</Button>
      </div>
    </BusyContainer>
  );
}
