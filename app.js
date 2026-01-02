// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful:', registration.scope);
        updateStatus('✓ App ready for offline use');
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
        updateStatus('✗ Offline mode unavailable');
      });
  });
}

// Handle PWA install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI to show install button
  showInstallPromotion();
});

function showInstallPromotion() {
  const installPrompt = document.getElementById('install-prompt');
  const installButton = document.getElementById('install-button');
  
  if (installPrompt) {
    installPrompt.style.display = 'block';
  }
  
  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // Clear the deferredPrompt
      deferredPrompt = null;
      // Hide the install promotion
      installPrompt.style.display = 'none';
    });
  }
}

// Handle app installed
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  const installPrompt = document.getElementById('install-prompt');
  if (installPrompt) {
    installPrompt.style.display = 'none';
  }
});

// Update status message
function updateStatus(message) {
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// Check online/offline status
window.addEventListener('online', () => {
  updateStatus('✓ Online - All features available');
});

window.addEventListener('offline', () => {
  updateStatus('✗ Offline - Using cached content');
});

// Initial status check
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.onLine) {
    updateStatus('✓ Online - All features available');
  } else {
    updateStatus('✗ Offline - Using cached content');
  }
});
