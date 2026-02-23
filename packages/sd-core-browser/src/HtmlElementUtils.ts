export class HtmlElementUtils {
  static async getBoundsAsync(els: HTMLElement[]): Promise<
    {
      target: HTMLElement;
      top: number;
      left: number;
      width: number;
      height: number;
    }[]
  > {
    return await new Promise<
      {
        target: HTMLElement;
        top: number;
        left: number;
        width: number;
        height: number;
      }[]
    >((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        observer.disconnect();

        resolve(
          entries.map((entry) => ({
            target: entry.target as HTMLElement,
            top: entry.boundingClientRect.top,
            left: entry.boundingClientRect.left,
            width: entry.boundingClientRect.width,
            height: entry.boundingClientRect.height,
          })),
        );
      });

      for (const el of els) {
        observer.observe(el);
      }
    });
  }
}
