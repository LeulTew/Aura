# Aura Sync Agent - User Manual

## Overview

The Aura Sync Agent is a desktop application (Windows/Mac) that runs in the background to synchronize your local photo folders with the Aura cloud platform. It ensures your photos are backed up and available for your team instantly.

## Installation

### Windows

1. Download `AuraSyncSetup.exe` from your Admin Portal (`/admin/sources`).
2. Run the installer.
3. Launch "Aura Sync" from the Start Menu.

### Mac

1. Download `AuraSync.dmg`.
2. Drag "Aura Sync" to Applications.
3. Open from Launchpad.

## Configuration

1. **Login**: Launch the app and sign in with your Aura Admin credentials.
2. **Select Folders**:
   - Click "Add Synced Folder".
   - Browse to your local photo directory (e.g., `D:\Photos\2026`).
   - Select the target Organization (if you manage multiple).
3. **Sync Settings**:
   - **Upload Only** (Default): Changes locally are sent to cloud.
   - **Bidirectional**: Cloud changes also sync back to local (Use with caution).

## Features

- **Real-Time Sync**: Modifications are detected instantly and queued for upload.
- **Offline Mode**: If internet is lost, changes are queued locally and synced when connection is restored.
- **Bandwidth Control**: Works politely in the background without slowing down your browsing.
- **Delta Sync**: Only uploads changed files. Renaming a file doesn't re-upload it (smart hashing).

## Troubleshooting

### "Sync Stuck"

- Check your internet connection.
- Restart the Aura Sync app.
- View "Logs" tab to see specific errors.

### "File Not Appearing in Cloud"

- Ensure the file is a supported image type (.jpg, .png, .raw).
- Check if the file is in a hidden folder or `.trash`.

### "High CPU Usage"

- Initial index of large folders (100k+ photos) can be intensive. Let it finish overnight.

## Support

Contact support@aura.pro for assistance.
