import { type Component, createSignal } from "solid-js";
import { BusyProvider, BusyContainer, useBusy, Button } from "@simplysm/solid";

const BusyDemo: Component = () => {
  const busy = useBusy();
  const [localBusy, setLocalBusy] = createSignal(false);
  const [barBusy, setBarBusy] = createSignal(false);
  const [progressBusy, setProgressBusy] = createSignal(false);
  const [progressPercent, setProgressPercent] = createSignal(0);
  const [readyState, setReadyState] = createSignal(false);

  const handleGlobalBusy = () => {
    busy.show("전역 로딩 중...");
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
      {/* 전역 Busy */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">전역 Busy (Provider)</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          useBusy() 훅으로 전역 로딩 오버레이를 표시합니다.
        </p>
        <Button theme="primary" variant="solid" onClick={handleGlobalBusy}>
          전역 Busy 2초
        </Button>
      </section>

      {/* 로컬 Spinner */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">로컬 BusyContainer (Spinner)</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          특정 영역에 spinner 타입 로딩을 표시합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handleLocalBusy}>
          로컬 Spinner 2초
        </Button>
        <BusyContainer
          busy={localBusy()}
          variant="spinner"
          message="로딩 중..."
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">콘텐츠 영역</div>
        </BusyContainer>
      </section>

      {/* 로컬 Bar */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">로컬 BusyContainer (Bar)</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          bar 타입으로 상단에 프로그레스 바를 표시합니다.
        </p>
        <Button theme="base" variant="outline" onClick={handleBarBusy}>
          로컬 Bar 2초
        </Button>
        <BusyContainer
          busy={barBusy()}
          variant="bar"
          class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
        >
          <div class="flex h-full items-center justify-center text-base-500">콘텐츠 영역</div>
        </BusyContainer>
      </section>

      {/* Progress */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">진행률 표시</h2>
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
        <h2 class="mb-4 text-xl font-semibold">Ready 상태</h2>
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
  return (
    <BusyProvider variant="spinner">
      <BusyDemo />
    </BusyProvider>
  );
}
