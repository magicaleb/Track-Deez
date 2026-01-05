# Cloud Storage Setup Guide

Track-Deez now supports cloud storage via GitHub, allowing you to sync your habit tracking data across multiple devices!

## Features

- ☁️ **Cross-Device Sync**: Access your data from any device
- 🔒 **Private & Secure**: Data stored in your own GitHub repository
- 🔄 **Automatic Sync**: Data automatically syncs when you make changes
- 💾 **Backup**: Local storage is maintained as a backup
- 🚀 **Easy Setup**: Simple configuration process

## Setup Instructions

### Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Token Settings](https://github.com/settings/tokens/new?description=Track-Deez&scopes=repo)
2. Set the description to "Track-Deez"
3. Select the `repo` scope (full control of private repositories)
4. Click "Generate token"
5. **Important**: Copy the token immediately - you won't be able to see it again!

### Step 2: Create a Repository (Optional)

If you don't already have a repository you want to use:

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (can be private or public)
3. Name it something like "Track-Deez-Data" or use the same repository as the app
4. No need to initialize with README or .gitignore

### Step 3: Configure Cloud Storage in Track-Deez

1. Open Track-Deez app
2. Go to **Settings** tab (bottom navigation)
3. Find the **Storage Settings** section
4. Select **Cloud Storage (GitHub)** radio button
5. Fill in the configuration:
   - **GitHub Personal Access Token**: Paste the token you created
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: The repository name (e.g., "Track-Deez-Data")
   - **Branch**: Leave as "main" (or specify a different branch)
6. Click **Test Connection** to verify your credentials
7. Click **Save Cloud Configuration**

### Step 4: Initial Sync

When you save the configuration:
- If the cloud repository has no data, your local data will be uploaded
- If the cloud has data, the app will use the most recently modified version
- A `data/user-data.json` file will be created in your repository

## Usage

### Syncing Data

- **Automatic**: Data syncs automatically whenever you make changes
- **Manual**: Click "Sync Now" in Storage Settings to manually sync

### Switching Between Devices

1. Install Track-Deez on your new device
2. Configure cloud storage with the same GitHub credentials
3. Your data will automatically download on the first sync

### Switching Back to Local Storage

1. Go to **Settings** > **Storage Settings**
2. Select **Local Storage** radio button
3. Confirm the switch
4. Your data remains on the device but will no longer sync to cloud

## Data Structure

Your data is stored as JSON in your GitHub repository at `data/user-data.json`:

```json
{
  "habits": [],
  "trackingFields": [],
  "days": {},
  "plannerEvents": [],
  "events": [],
  "templates": [],
  "lastModified": 1234567890
}
```

## Troubleshooting

### Connection Test Fails

- Verify your token has the `repo` scope
- Check that your username and repository name are correct
- Ensure the repository exists and you have access to it
- Make sure your token hasn't expired

### Data Not Syncing

- Check your internet connection
- Verify you're still in cloud storage mode (Settings > Storage Settings)
- Try clicking "Sync Now" to manually trigger a sync
- Check the console for error messages (F12 in browser)

### Lost Access Token

If you lose your token:
1. Generate a new token from GitHub
2. Go to Settings > Storage Settings
3. Enter the new token
4. Click "Save Cloud Configuration"

## Privacy & Security

- Your data is stored in YOUR GitHub repository
- Only you have access (if using a private repository)
- The token is stored locally in your browser
- Data is transmitted over HTTPS
- No third-party servers are involved

## GitHub Pages Deployment

The app can be deployed to GitHub Pages for easy access:

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select "GitHub Actions" as the source
4. The app will automatically deploy on every push to main

Or use the included GitHub Actions workflow that deploys automatically.

## Tips

- **Use a Private Repository**: Keep your habit data private
- **Regular Backups**: Export your data periodically as additional backup
- **Multiple Devices**: You can use the same cloud storage on all your devices
- **Separate Data Repository**: Consider using a separate repo for data vs. app code

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify your GitHub token permissions
3. Try switching back to local storage temporarily
4. Export your data as backup before troubleshooting
