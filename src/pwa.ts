interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pendingInstall: InstallPromptEvent | undefined;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstall = event as InstallPromptEvent;
  window.dispatchEvent(new Event('paws-install-ready'));
});

window.addEventListener('appinstalled', () => {
  pendingInstall = undefined;
  window.dispatchEvent(new Event('paws-install-ready'));
});

export function isInstalledApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function canInstallApp(): boolean {
  return !!pendingInstall && !isInstalledApp();
}

export async function requestAppInstall(): Promise<'accepted' | 'dismissed' | 'instructions' | 'installed'> {
  if (isInstalledApp()) return 'installed';
  if (!pendingInstall) return 'instructions';
  const prompt = pendingInstall;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  pendingInstall = undefined;
  return choice.outcome;
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then(registration => {
      let refreshRequested = false;
      const showUpdate = () => {
        const notice = document.querySelector<HTMLElement>('#update-message');
        const button = document.querySelector<HTMLButtonElement>('#update-button');
        if (!notice || !button || !registration.waiting || !navigator.serviceWorker.controller) return;
        notice.hidden = false;
        button.onclick = () => {
          button.disabled = true;
          refreshRequested = true;
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        };
      };
      showUpdate();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', event => {
          if ((event.target as ServiceWorker).state === 'installed') showUpdate();
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshRequested || refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  });
}
