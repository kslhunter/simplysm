export function dispatchKeydown(opts: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { ...opts, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

export function createOpenModal(zIndex: number): HTMLElement {
  const modal = document.createElement("sd-modal");
  modal.setAttribute("data-sd-open", "");
  modal.style.zIndex = String(zIndex);
  document.body.appendChild(modal);
  return modal;
}
