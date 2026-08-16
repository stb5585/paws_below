export interface ViewportDimensions {
  width: number;
  height: number;
}

export function shouldShowOrientationGuard(touchCapable: boolean, viewports: readonly ViewportDimensions[]): boolean {
  const usable = viewports.filter(viewport => viewport.width > 0 && viewport.height > 0);
  return touchCapable && usable.length > 0 && usable.every(viewport => viewport.height > viewport.width);
}

function currentViewports(): ViewportDimensions[] {
  const documentElement = document.documentElement;
  const viewports: ViewportDimensions[] = [
    { width: window.innerWidth, height: window.innerHeight },
    { width: documentElement.clientWidth, height: documentElement.clientHeight }
  ];
  if (window.visualViewport) {
    viewports.push({ width: window.visualViewport.width, height: window.visualViewport.height });
  }
  return viewports;
}

export function installOrientationGuard(): void {
  const message = document.querySelector<HTMLElement>('#rotate-message');
  if (!message) return;
  const touchCapable = navigator.maxTouchPoints > 0
    || 'ontouchstart' in window
    || window.matchMedia('(any-pointer: coarse)').matches;
  const update = () => {
    const visible = shouldShowOrientationGuard(touchCapable, currentViewports());
    message.dataset.visible = String(visible);
    message.setAttribute('aria-hidden', String(!visible));
  };
  const scheduleUpdate = () => {
    update();
    window.requestAnimationFrame(update);
    window.setTimeout(update, 250);
  };
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);
  window.visualViewport?.addEventListener('resize', scheduleUpdate);
  window.screen.orientation?.addEventListener('change', scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(document.documentElement);
  scheduleUpdate();
}
