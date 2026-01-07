# Track Deez

A Progressive Web App (PWA) habit tracker optimized for iPhone and iOS devices.

## ✨ New Features (v2.0)

### 🔥 Streak Tracking
- **Current Streak Display**: See your active streak count next to each habit
- **Longest Streak**: Track your personal best for each habit
- **Milestone Celebrations**: Get rewarded at 7, 30, 100, and 365-day milestones
- **Streak Badges**: Visual indicators with fire emoji for active streaks

### 🎨 Enhanced UI/UX
- **Toast Notifications**: Modern, non-intrusive notifications instead of alerts
- **Loading States**: Skeleton screens and spinners for better perceived performance
- **Dark Mode**: Automatic dark mode based on system preferences
- **Smooth Animations**: Polished transitions and micro-interactions
- **Accessibility**: Improved ARIA labels and reduced motion support

### 🔔 Notifications (Coming Soon)
- **Daily Reminders**: Get notified at your chosen time to track habits
- **Per-Habit Reminders**: Set custom reminders for individual habits
- **Milestone Alerts**: Celebrate when you hit streak milestones

## Features

- 📱 Mobile-first design optimized for iPhone
- ☁️ **Cloud Storage**: Sync your data across devices via GitHub
- 🔥 **Streak Tracking**: Monitor and celebrate your habit streaks
- 🔄 Offline functionality with service worker
- 📦 Installable as a standalone app
- 🎨 iOS-specific optimizations and styling
- ⚡ Fast and responsive
- 📊 Habit tracking with statistics
- 📅 Calendar and planner views
- 💾 Local and cloud storage options
- 🌙 Dark mode support

## Project Structure

```
Track-Deez/
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest with app metadata
├── service-worker.js       # Service worker for offline functionality
├── app.js                  # PWA initialization
├── app-main.js            # Main application logic
├── app-enhancements.js    # New feature integrations
├── db-manager.js          # IndexedDB manager
├── cloud-storage.js       # Cloud sync functionality
├── config.js              # App configuration
├── styles.css             # Application styles with iOS optimizations
├── modules/               # Modular features
│   ├── streak-calculator.js
│   ├── notification-manager.js
│   └── ui-helpers.js
├── utils/                 # Utility functions
│   ├── constants.js
│   └── date-utils.js
├── icons/                 # App icons for various sizes
└── README.md             # This file
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

### Cloud Storage Setup

Track-Deez supports cloud storage via GitHub for cross-device synchronization!

See [CLOUD-STORAGE-SETUP.md](CLOUD-STORAGE-SETUP.md) for detailed setup instructions.

**Quick Start:**
1. Create a GitHub Personal Access Token with `repo` scope
2. Go to Settings > Storage Settings in the app
3. Select "Cloud Storage (GitHub)" and enter your credentials
4. Your data will automatically sync across all your devices

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
- **Cloud Sync**: Optional GitHub-based cloud storage for cross-device sync

## GitHub Pages Deployment

The app includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

To enable:
1. Go to your repository Settings > Pages
2. Select "GitHub Actions" as the source
3. Push to main branch to trigger deployment

The workflow file is located at `.github/workflows/deploy.yml`

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
