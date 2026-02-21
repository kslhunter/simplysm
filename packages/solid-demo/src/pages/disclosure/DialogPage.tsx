import { createSignal } from "solid-js";
import { Button, Dialog, useDialog, useDialogInstance } from "@simplysm/solid";

function SampleDialogContent() {
  const dialog = useDialogInstance<string>();
  return (
    <div class="space-y-4 p-4">
      <p class="text-sm">이것은 프로그래매틱으로 열린 다이얼로그입니다.</p>
      <div class="flex gap-2">
        <Button theme="primary" variant="solid" onClick={() => dialog?.close("확인")}>
          확인
        </Button>
        <Button onClick={() => dialog?.close()}>취소</Button>
      </div>
    </div>
  );
}

export default function ModalPage() {
  const dialog = useDialog();

  // 기본 다이얼로그
  const [basicOpen, setBasicOpen] = createSignal(false);

  // 프로그래매틱 다이얼로그 결과
  const [programmaticResult, setProgrammaticResult] = createSignal<string | undefined>();

  // 닫기 옵션 다이얼로그
  const [closeOptionOpen, setCloseOptionOpen] = createSignal(false);

  // Float 다이얼로그
  const [floatOpen, setFloatOpen] = createSignal(false);

  // Fill 다이얼로그
  const [fillOpen, setFillOpen] = createSignal(false);

  // 리사이즈/이동 다이얼로그
  const [resizableOpen, setResizableOpen] = createSignal(false);

  const handleProgrammaticOpen = async () => {
    const result = await dialog.show<string>(() => <SampleDialogContent />, {
      title: "프로그래매틱 다이얼로그",
      closeOnBackdrop: true,
      closeOnEscape: true,
    });
    setProgrammaticResult(result);
  };

  return (
    <div class="space-y-8 p-6">
      {/* 기본 다이얼로그 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 다이얼로그</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          선언적으로 Dialog 컴포넌트를 사용합니다. 버튼을 클릭하여 다이얼로그를 열고 닫습니다.
        </p>
        <Button theme="primary" variant="solid" onClick={() => setBasicOpen(true)}>
          다이얼로그 열기
        </Button>
        <Dialog open={basicOpen()} onOpenChange={setBasicOpen} title="기본 다이얼로그">
          <div class="p-4">
            <p class="text-sm">이것은 기본 다이얼로그입니다.</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              헤더의 X 버튼으로 닫을 수 있습니다.
            </p>
          </div>
        </Dialog>
      </section>

      {/* 프로그래매틱 다이얼로그 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          프로그래매틱 다이얼로그
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          useDialog().show()를 사용하여 코드에서 다이얼로그를 열고, close() 호출 시 결과값을
          Promise로 받습니다.
        </p>
        <div class="flex items-center gap-4">
          <Button theme="primary" variant="solid" onClick={handleProgrammaticOpen}>
            프로그래매틱 다이얼로그 열기
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">닫기 옵션</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          closeOnBackdrop과 closeOnEscape를 활성화하여, 백드롭 클릭이나 Escape 키로 다이얼로그를
          닫을 수 있습니다.
        </p>
        <Button theme="info" variant="solid" onClick={() => setCloseOptionOpen(true)}>
          닫기 옵션 다이얼로그 열기
        </Button>
        <Dialog
          open={closeOptionOpen()}
          onOpenChange={setCloseOptionOpen}
          title="닫기 옵션"
          closeOnBackdrop
          closeOnEscape
        >
          <div class="p-4">
            <p class="text-sm">백드롭을 클릭하거나 Escape 키를 눌러 닫을 수 있습니다.</p>
          </div>
        </Dialog>
      </section>

      {/* Float 다이얼로그 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Float 다이얼로그</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          float=true로 백드롭 없이 플로팅 형태의 다이얼로그를 표시합니다. 뒤의 컨텐츠와 상호작용이
          가능합니다.
        </p>
        <Button theme="success" variant="solid" onClick={() => setFloatOpen(!floatOpen())}>
          {floatOpen() ? "Float 다이얼로그 닫기" : "Float 다이얼로그 열기"}
        </Button>
        <Dialog
          open={floatOpen()}
          onOpenChange={setFloatOpen}
          title="Float 다이얼로그"
          float
          width={320}
        >
          <div class="p-4">
            <p class="text-sm">백드롭이 없는 플로팅 다이얼로그입니다.</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              뒤의 페이지와 상호작용할 수 있습니다.
            </p>
          </div>
        </Dialog>
      </section>

      {/* Fill 다이얼로그 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Fill 다이얼로그</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          fill=true로 전체 화면을 차지하는 다이얼로그를 표시합니다.
        </p>
        <Button theme="warning" variant="solid" onClick={() => setFillOpen(true)}>
          Fill 다이얼로그 열기
        </Button>
        <Dialog
          open={fillOpen()}
          onOpenChange={setFillOpen}
          title="Fill 다이얼로그"
          fill
          closeOnEscape
        >
          <div class="flex flex-1 flex-col items-center justify-center p-4">
            <p class="text-lg font-bold">전체 화면 다이얼로그</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              Escape 키 또는 X 버튼으로 닫을 수 있습니다.
            </p>
          </div>
        </Dialog>
      </section>

      {/* 리사이즈/이동 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">리사이즈 / 이동</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          resizable과 movable을 활성화하여, 다이얼로그의 크기를 조절하고 헤더를 드래그하여 이동할 수
          있습니다.
        </p>
        <Button theme="danger" variant="solid" onClick={() => setResizableOpen(true)}>
          리사이즈 가능 다이얼로그 열기
        </Button>
        <Dialog
          open={resizableOpen()}
          onOpenChange={setResizableOpen}
          title="리사이즈 / 이동"
          resizable
          movable
          width={400}
          height={300}
          minWidth={250}
          minHeight={200}
          closeOnEscape
        >
          <div class="p-4">
            <p class="text-sm">다이얼로그의 가장자리를 드래그하여 크기를 조절할 수 있습니다.</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              헤더를 드래그하여 위치를 이동할 수 있습니다.
            </p>
          </div>
        </Dialog>
      </section>
    </div>
  );
}
