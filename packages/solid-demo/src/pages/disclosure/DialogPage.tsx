import { createSignal } from "solid-js";
import { Button, Dialog, useDialog, useDialogInstance } from "@simplysm/solid";

function SampleDialogContent() {
  const dialog = useDialogInstance<string>();
  return (
    <div class="space-y-4 p-4">
      <p class="text-sm">This dialog was opened programmatically.</p>
      <div class="flex gap-2">
        <Button theme="primary" variant="solid" onClick={() => dialog?.close("OK")}>
          OK
        </Button>
        <Button onClick={() => dialog?.close()}>Cancel</Button>
      </div>
    </div>
  );
}

export default function ModalPage() {
  const dialog = useDialog();

  // Basic dialog
  const [basicOpen, setBasicOpen] = createSignal(false);

  // Programmatic dialog result
  const [programmaticResult, setProgrammaticResult] = createSignal<string | undefined>();

  // Close options dialog
  const [closeOptionOpen, setCloseOptionOpen] = createSignal(false);

  // Float dialog
  const [floatOpen, setFloatOpen] = createSignal(false);

  // Fill dialog
  const [fillOpen, setFillOpen] = createSignal(false);

  // Resizable/movable dialog
  const [resizableOpen, setResizableOpen] = createSignal(false);

  const handleProgrammaticOpen = async () => {
    const result = await dialog.show<string>(() => <SampleDialogContent />, {
      header: "Programmatic Dialog",
      closeOnBackdrop: true,
      closeOnEscape: true,
    });
    setProgrammaticResult(result);
  };

  return (
    <div class="space-y-8 p-6">
      {/* Basic dialog */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Dialog</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Use the Dialog component declaratively. Click the button to open and close the dialog.
        </p>
        <Button theme="primary" variant="solid" onClick={() => setBasicOpen(true)}>
          Open Dialog
        </Button>
        <Dialog open={basicOpen()} onOpenChange={setBasicOpen}>
          <Dialog.Header>Basic Dialog</Dialog.Header>
          <div class="p-4">
            <p class="text-sm">This is a basic dialog.</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              You can close it with the X button in the header.
            </p>
          </div>
        </Dialog>
      </section>

      {/* Programmatic dialog */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Programmatic Dialog
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Use useDialog().show() to open dialogs from code, and receive the result as a Promise when close() is called.
        </p>
        <div class="flex items-center gap-4">
          <Button theme="primary" variant="solid" onClick={handleProgrammaticOpen}>
            Open Programmatic Dialog
          </Button>
          {programmaticResult() !== undefined && (
            <span class="text-sm text-base-600 dark:text-base-400">
              Result: {programmaticResult()}
            </span>
          )}
        </div>
      </section>

      {/* Close options */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Close Options</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Enable closeOnBackdrop and closeOnEscape to allow closing the dialog by clicking the backdrop or pressing Escape.
        </p>
        <Button theme="info" variant="solid" onClick={() => setCloseOptionOpen(true)}>
          Open Close Options Dialog
        </Button>
        <Dialog
          open={closeOptionOpen()}
          onOpenChange={setCloseOptionOpen}
          closeOnBackdrop
          closeOnEscape
        >
          <Dialog.Header>Close Options</Dialog.Header>
          <div class="p-4">
            <p class="text-sm">You can close this dialog by clicking the backdrop or pressing Escape.</p>
          </div>
        </Dialog>
      </section>

      {/* Float dialog */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Float Dialog</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Set float=true to display a floating dialog without a backdrop. You can interact with the content behind it.
        </p>
        <Button theme="success" variant="solid" onClick={() => setFloatOpen(!floatOpen())}>
          {floatOpen() ? "Close Float Dialog" : "Open Float Dialog"}
        </Button>
        <Dialog open={floatOpen()} onOpenChange={setFloatOpen} float width={320}>
          <Dialog.Header>Float Dialog</Dialog.Header>
          <div class="p-4">
            <p class="text-sm">This is a floating dialog without a backdrop.</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              You can interact with the page behind it.
            </p>
          </div>
        </Dialog>
      </section>

      {/* Fill dialog */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Fill Dialog</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Set fill=true to display a dialog that fills the entire screen.
        </p>
        <Button theme="warning" variant="solid" onClick={() => setFillOpen(true)}>
          Open Fill Dialog
        </Button>
        <Dialog open={fillOpen()} onOpenChange={setFillOpen} fill closeOnEscape>
          <Dialog.Header>Fill Dialog</Dialog.Header>
          <div class="flex flex-1 flex-col items-center justify-center p-4">
            <p class="text-lg font-bold">Full Screen Dialog</p>
            <p class="mt-2 text-sm text-base-500 dark:text-base-400">
              You can close it with the Escape key or X button.
            </p>
          </div>
        </Dialog>
      </section>

      {/* Resize/move */}
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
          resizable
          movable
          width={400}
          height={300}
          minWidth={250}
          minHeight={200}
          closeOnEscape
        >
          <Dialog.Header>리사이즈 / 이동</Dialog.Header>
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
