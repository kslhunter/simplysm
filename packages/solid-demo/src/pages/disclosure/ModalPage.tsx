import { createSignal, type Component } from "solid-js";
import {
  Button,
  Modal,
  ModalProvider,
  useModal,
  Topbar,
  TopbarContainer,
  type ModalContentProps,
} from "@simplysm/solid";

const SampleModalContent: Component<ModalContentProps<string>> = (props) => (
  <div class="space-y-4 p-4">
    <p class="text-sm">이것은 프로그래매틱으로 열린 모달입니다.</p>
    <div class="flex gap-2">
      <Button theme="primary" variant="solid" onClick={() => props.close("확인")}>
        확인
      </Button>
      <Button onClick={() => props.close()}>취소</Button>
    </div>
  </div>
);

export default function ModalPage() {
  return (
    <ModalProvider>
      <ModalPageContent />
    </ModalProvider>
  );
}

function ModalPageContent() {
  const modal = useModal();

  // 기본 모달
  const [basicOpen, setBasicOpen] = createSignal(false);

  // 프로그래매틱 모달 결과
  const [programmaticResult, setProgrammaticResult] = createSignal<string | undefined>();

  // 닫기 옵션 모달
  const [closeOptionOpen, setCloseOptionOpen] = createSignal(false);

  // Float 모달
  const [floatOpen, setFloatOpen] = createSignal(false);

  // Fill 모달
  const [fillOpen, setFillOpen] = createSignal(false);

  // 리사이즈/이동 모달
  const [resizableOpen, setResizableOpen] = createSignal(false);

  const handleProgrammaticOpen = async () => {
    const result = await modal.show(SampleModalContent, {
      title: "프로그래매틱 모달",
      useCloseByBackdrop: true,
      useCloseByEscapeKey: true,
    });
    setProgrammaticResult(result);
  };

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Modal</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 모달 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 모달</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              선언적으로 Modal 컴포넌트를 사용합니다. 버튼을 클릭하여 모달을 열고 닫습니다.
            </p>
            <Button theme="primary" variant="solid" onClick={() => setBasicOpen(true)}>
              모달 열기
            </Button>
            <Modal open={basicOpen()} onOpenChange={setBasicOpen} title="기본 모달">
              <div class="p-4">
                <p class="text-sm">이것은 기본 모달입니다.</p>
                <p class="mt-2 text-sm text-base-500 dark:text-base-400">
                  헤더의 X 버튼으로 닫을 수 있습니다.
                </p>
              </div>
            </Modal>
          </section>

          {/* 프로그래매틱 모달 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">프로그래매틱 모달</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              useModal().show()를 사용하여 코드에서 모달을 열고, close() 호출 시 결과값을 Promise로 받습니다.
            </p>
            <div class="flex items-center gap-4">
              <Button theme="primary" variant="solid" onClick={handleProgrammaticOpen}>
                프로그래매틱 모달 열기
              </Button>
              {programmaticResult() !== undefined && (
                <span class="text-sm text-base-600 dark:text-base-400">
                  결과: {programmaticResult()}
                </span>
              )}
            </div>
          </section>

          {/* 닫기 옵션 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">닫기 옵션</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              useCloseByBackdrop과 useCloseByEscapeKey를 활성화하여, 백드롭 클릭이나 Escape 키로 모달을 닫을 수 있습니다.
            </p>
            <Button theme="info" variant="solid" onClick={() => setCloseOptionOpen(true)}>
              닫기 옵션 모달 열기
            </Button>
            <Modal
              open={closeOptionOpen()}
              onOpenChange={setCloseOptionOpen}
              title="닫기 옵션"
              useCloseByBackdrop
              useCloseByEscapeKey
            >
              <div class="p-4">
                <p class="text-sm">백드롭을 클릭하거나 Escape 키를 눌러 닫을 수 있습니다.</p>
              </div>
            </Modal>
          </section>

          {/* Float 모달 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Float 모달</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              float=true로 백드롭 없이 플로팅 형태의 모달을 표시합니다. 뒤의 컨텐츠와 상호작용이 가능합니다.
            </p>
            <Button theme="success" variant="solid" onClick={() => setFloatOpen(!floatOpen())}>
              {floatOpen() ? "Float 모달 닫기" : "Float 모달 열기"}
            </Button>
            <Modal
              open={floatOpen()}
              onOpenChange={setFloatOpen}
              title="Float 모달"
              float
              widthPx={320}
            >
              <div class="p-4">
                <p class="text-sm">백드롭이 없는 플로팅 모달입니다.</p>
                <p class="mt-2 text-sm text-base-500 dark:text-base-400">
                  뒤의 페이지와 상호작용할 수 있습니다.
                </p>
              </div>
            </Modal>
          </section>

          {/* Fill 모달 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Fill 모달</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              fill=true로 전체 화면을 차지하는 모달을 표시합니다.
            </p>
            <Button theme="warning" variant="solid" onClick={() => setFillOpen(true)}>
              Fill 모달 열기
            </Button>
            <Modal
              open={fillOpen()}
              onOpenChange={setFillOpen}
              title="Fill 모달"
              fill
              useCloseByEscapeKey
            >
              <div class="flex flex-1 flex-col items-center justify-center p-4">
                <p class="text-lg font-semibold">전체 화면 모달</p>
                <p class="mt-2 text-sm text-base-500 dark:text-base-400">
                  Escape 키 또는 X 버튼으로 닫을 수 있습니다.
                </p>
              </div>
            </Modal>
          </section>

          {/* 리사이즈/이동 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">리사이즈 / 이동</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              resizable과 movable을 활성화하여, 모달의 크기를 조절하고 헤더를 드래그하여 이동할 수 있습니다.
            </p>
            <Button theme="danger" variant="solid" onClick={() => setResizableOpen(true)}>
              리사이즈 가능 모달 열기
            </Button>
            <Modal
              open={resizableOpen()}
              onOpenChange={setResizableOpen}
              title="리사이즈 / 이동"
              resizable
              movable
              widthPx={400}
              heightPx={300}
              minWidthPx={250}
              minHeightPx={200}
              useCloseByEscapeKey
            >
              <div class="p-4">
                <p class="text-sm">모달의 가장자리를 드래그하여 크기를 조절할 수 있습니다.</p>
                <p class="mt-2 text-sm text-base-500 dark:text-base-400">
                  헤더를 드래그하여 위치를 이동할 수 있습니다.
                </p>
              </div>
            </Modal>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
