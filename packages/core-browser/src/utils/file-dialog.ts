/**
 * 파일 선택 다이얼로그를 프로그래밍 방식으로 열기
 */
export function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options?.multiple ?? false;
    if (options?.accept != null) {
      input.accept = options.accept;
    }
    input.onchange = () => {
      resolve(input.files != null && input.files.length > 0 ? [...input.files] : undefined);
    };
    input.click();
  });
}
