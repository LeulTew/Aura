# Aura Pro Admin Portal Guide

## 1. Access & Login

- **URL**: [admin.aura.pro](https://aura.pro/login) (or your custom domain)
- **Login**: Enter your email and password.
- **Roles**:
  - **Admin**: Full access to all settings, team, and files.
  - **Manager**: Can manage files, bundles, and gallery. No access to Team/Settings.
  - **Photographer**: Can upload and view gallery. No delete/edit permissions.

## 2. Dashboard

The dashboard provides a real-time overview of your studio's activity:

- **Storage Used**: Total cloud storage consumption.
- **Photos Uploaded**: Total count of indexed photos.
- **Recent Activity**: Log of uploads, invites, and system events.

## 3. Team Management (`/admin/team`)

_Only available to Admins._

- **Invite Member**: Click "Invite Member", enter email, and select role.
- **Roles**:
  - `Manager`: For studio managers.
  - `Photographer`: For event shooters.
  - `Editor`: For retouching staff.
- **Remove**: Click the trash icon to revoke access immediately.

## 4. File Manager (`/admin/files`)

A robust file system for your cloud storage.

- **Upload**: Drag & drop files or click "Upload". Supports multi-file upload.
- **Folder Actions**:
  - **Create**: "New Folder" button.
  - **Rename**: Right-click a folder -> Rename (Recursively moves files).
  - **Move**: Right-click -> Move to valid destination.
- **Indexing**:
  - **IMPORTANT**: After uploading, click the green **"Index"** button in the header to make photos visible in the Gallery.
  - Indexing generates face embeddings for search.
  - Status bar shows progress (Green = Success, Red = Failed).

## 5. Gallery (`/admin/gallery`)

The visual heart of your studio.

- **Search**: Use the search bar to find photos by filename or metadata.
- **AI Search**: (Coming Soon) Search by face or description.
- **View**: Click a photo to open the Lightbox for full-resolution viewing.
- **Download**: Download original or optimized versions.

## 6. Sources (`/admin/sources`)

Manage how photos enter your system.

- **Cloud**: Direct uploads via the File Manager.
- **Local Sync**: Folders synced from your studio PC via the Aura Sync Agent.
- **Event Temp**: Temporary storage for events (30-day auto-expiry).

## Troubleshooting

- **"0 Photos in Gallery"**: Go to File Manager, open the folder, and click **Index**.
- **"Upload Failed"**: Check your internet connection. Large RAW files may take longer.
