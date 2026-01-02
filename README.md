# Track Deez

A Progressive Web App (PWA) optimized for iPhone and iOS devices.

## Features

- 📱 Mobile-first design optimized for iPhone
- 🔄 Offline functionality with service worker
- 📦 Installable as a standalone app
- 🎨 iOS-specific optimizations and styling
- ⚡ Fast and responsive

## Project Structure

```
Track-Deez/
├── index.html           # Main HTML entry point
├── manifest.json        # PWA manifest with app metadata
├── service-worker.js    # Service worker for offline functionality
├── app.js              # Main application JavaScript
├── styles.css          # Application styles with iOS optimizations
├── icons/              # App icons for various sizes
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-167x167.png
│   ├── icon-180x180.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── README.md           # This file
```

## Getting Started

### Running Locally

1. Serve the app using any static web server:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

2. Open your browser to `http://localhost:8000`

### Installing on iPhone

1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to install the app

## iOS Specific Features

- **Standalone mode**: App runs in full-screen without Safari UI
- **Status bar styling**: Customized status bar appearance
- **Safe area support**: Proper spacing for notched devices
- **Touch optimizations**: Native-like touch interactions
- **Custom icons**: Optimized icons for home screen and splash screen

## PWA Features

- **Offline Support**: Works without internet connection
- **Fast Loading**: Assets are cached for quick access
- **Installable**: Can be installed on device home screen
- **Responsive**: Works on all screen sizes

## Development

### Key Files

- **index.html**: Contains iOS-specific meta tags and PWA setup
- **manifest.json**: Defines app name, icons, colors, and display mode
- **service-worker.js**: Handles caching and offline functionality
- **app.js**: Manages PWA installation and online/offline detection
- **styles.css**: Includes iOS safe area support and touch optimizations

### Customization

1. Update app name in `manifest.json` and `index.html`
2. Replace placeholder icons in `icons/` directory
3. Modify colors in `styles.css` and `manifest.json`
4. Add your app logic to `app.js`

## License

MIT
