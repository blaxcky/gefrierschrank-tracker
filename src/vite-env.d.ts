/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
