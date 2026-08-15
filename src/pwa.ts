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
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}
