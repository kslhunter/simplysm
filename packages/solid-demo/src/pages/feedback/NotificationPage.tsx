import { type Component } from "solid-js";
import { useNotification, Button } from "@simplysm/solid";

const NotificationDemo: Component = () => {
  const notification = useNotification();

  return (
    <div class="space-y-8">
      {/* Theme-specific notification test */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">테마별 알림</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          각 버튼을 클릭하면 해당 테마의 알림이 발생합니다. 상단 배너와 우측 상단의 벨 아이콘에서
          확인할 수 있습니다.
        </p>
        <div class="flex flex-wrap gap-2">
          <Button
            theme="info"
            variant="solid"
            onClick={() => notification.info("정보", "일반 정보 알림입니다.")}
          >
            Info 알림
          </Button>
          <Button
            theme="success"
            variant="solid"
            onClick={() => notification.success("성공", "작업이 완료되었습니다.")}
          >
            Success 알림
          </Button>
          <Button
            theme="warning"
            variant="solid"
            onClick={() => notification.warning("경고", "주의가 필요합니다.")}
          >
            Warning 알림
          </Button>
          <Button
            theme="danger"
            variant="solid"
            onClick={() => notification.danger("에러", "오류가 발생했습니다.")}
          >
            Danger 알림
          </Button>
        </div>
      </section>

      {/* Notification with action button */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">액션 버튼 포함</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          알림에 액션 버튼을 포함할 수 있습니다. 배너에서 버튼을 클릭해 보세요.
        </p>
        <Button
          theme="primary"
          variant="solid"
          onClick={() =>
            notification.info("파일 업로드", "file.png 업로드가 완료되었습니다.", {
              action: {
                label: "보기",
                onClick: () => alert("파일 보기 클릭!"),
              },
            })
          }
        >
          액션 포함 알림
        </Button>
      </section>

      {/* Multiple notifications */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">연속 알림</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          여러 개의 알림을 연속으로 발생시킵니다. 벨 아이콘을 클릭하면 모든 알림 목록을 확인할 수
          있습니다.
        </p>
        <Button
          theme="base"
          variant="outline"
          onClick={() => {
            notification.info("1번째 알림", "첫 번째 알림입니다.");
            setTimeout(() => notification.success("2번째 알림", "두 번째 알림입니다."), 100);
            setTimeout(() => notification.warning("3번째 알림", "세 번째 알림입니다."), 200);
          }}
        >
          3개 연속 알림 발생
        </Button>
      </section>

      {/* Clear all */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">알림 관리</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">모든 알림을 삭제합니다.</p>
        <Button theme="danger" variant="outline" onClick={() => notification.clear()}>
          전체 알림 삭제
        </Button>
      </section>
    </div>
  );
};

export default function NotificationPage() {
  return (
    <div class="space-y-8 p-6">
      <NotificationDemo />
    </div>
  );
}
