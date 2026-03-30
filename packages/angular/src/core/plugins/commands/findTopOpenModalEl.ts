/**
 * DOM에서 열린 모달 중 z-index가 가장 큰 모달 요소를 반환한다.
 * 열린 모달이 없으면 null을 반환한다.
 *
 * SdModalProvider를 import하지 않아 순환 의존을 회피한다.
 */
export function findTopOpenModalEl(): HTMLElement | null {
  const openModals = document.querySelectorAll<HTMLElement>("sd-modal[data-sd-open]");
  if (openModals.length === 0) return null;

  let topModal: HTMLElement = openModals[0];
  let maxZ = parseInt(topModal.style.zIndex || "0", 10);

  for (let i = 1; i < openModals.length; i++) {
    const z = parseInt(openModals[i].style.zIndex || "0", 10);
    if (z > maxZ) {
      maxZ = z;
      topModal = openModals[i];
    }
  }

  return topModal;
}
