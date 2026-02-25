import { type Component, createSignal } from "solid-js";
import { BusyContainer, useBusy, Button } from "@simplysm/solid";

const BusyDemo: Component = () => {
  const busy = useBusy();
  const [localBusy, setLocalBusy] = createSignal(false);
  const [barBusy, setBarBusy] = createSignal(false);
  const [progressBusy, setProgressBusy] = createSignal(false);
  const [progressPercent, setProgressPercent] = createSignal(0);
  const [readyState, setReadyState] = createSignal(false);

  const handleGlobalBusy = () => {
    busy.show("Loading globally...");
    setTimeout(() => busy.hide(), 2000);
  };

  const handleLocalBusy = () => {
    setLocalBusy(true);
    setTimeout(() => setLocalBusy(false), 2000);
  };

  const handleBarBusy = () => {
    setBarBusy(true);
    setTimeout(() => setBarBusy(false), 2000);
  };

  const handleProgressBusy = () => {
    setProgressBusy(true);
    setProgressPercent(0);
    const interval = setInterval(() => {
      setProgressPercent((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setProgressBusy(false);
          return 0;
        }
        return p + 10;
      });
    }, 300);
  };

  return (
    <div class="space-y-8 p-6">
      {/* Global Busy */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Global Busy (Provider)
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Display a global loading overlay using the useBusy() hook.
        </p>
        <Button theme="primary" variant="solid" onClick={handleGlobalBusy}>
          Global Busy for 2 seconds
        </Button>
      </section>

      {/* Local Spinner */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Local BusyContainer (Spinner)
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Display a spinner-type loading indicator in a specific area.
        </p>
        <Button theme="base" variant="outline" onClick={handleLocalBusy}>
          Local Spinner for 2 seconds
        </Button>
        <BusyContainer
          busy={localBusy()}
          variant="spinner"
          message="Loading..."
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">Content area</div>
        </BusyContainer>
      </section>

      {/* Local Bar */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Local BusyContainer (Bar)
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Bar type displays a progress bar at the top.
        </p>
        <Button theme="base" variant="outline" onClick={handleBarBusy}>
          Local Bar for 2 seconds
        </Button>
        <BusyContainer
          busy={barBusy()}
          variant="bar"
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">Content area</div>
        </BusyContainer>
      </section>

      {/* Progress */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Progress Display</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          progressPercent prop으로 진행률을 표시합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handleProgressBusy}>
          진행률 테스트
        </Button>
        <BusyContainer
          busy={progressBusy()}
          variant="spinner"
          message={`${progressPercent()}% 완료`}
          progressPercent={progressPercent()}
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">콘텐츠 영역</div>
        </BusyContainer>
      </section>

      {/* Ready */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Ready 상태</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          ready가 false이면 children을 숨기고 로딩 오버레이를 표시합니다.
        </p>
        <Button theme="base" variant="outline" onClick={() => setReadyState((v) => !v)}>
          {readyState() ? "ready=false로 변경" : "ready=true로 변경"}
        </Button>
        <BusyContainer
          ready={readyState()}
          variant="spinner"
          message="데이터 준비 중..."
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">
            준비 완료된 콘텐츠
          </div>
        </BusyContainer>
      </section>
    </div>
  );
};

export default function BusyPage() {
  return <BusyDemo />;
}
