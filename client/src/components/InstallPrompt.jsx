import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, X } from 'lucide-react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setOpen(false);
  };

  if (!deferredPrompt) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="install-button" aria-label="Install app">
          <Download size={18} />
          <span>Install</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">Install Soundboard</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Add this soundboard to your home screen for quick offline access.
          </Dialog.Description>
          <div className="dialog-actions">
            <button className="dialog-button primary" onClick={handleInstall}>
              Install
            </button>
            <Dialog.Close asChild>
              <button className="dialog-button">Cancel</button>
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={18} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default InstallPrompt;
