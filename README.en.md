# Utaha Player

Utaha Player is a local-first Electron media center for music, video, and photos. It keeps media files and activity data on the device and provides one unified library, global music playback, resumable video sessions, and a safe source-resolution photo editor.

## Highlights

- Content-first home with Continue, Recently Used, and Recently Added sections
- Global music session and persistent mini player
- Video progress restore and completion tracking
- Source-pixel photo editing with full undo/redo
- Save Copy by default, verified and rollback-safe overwrite when explicitly selected
- Bounded media IPC, disk thumbnail cache, unified search, recent activity, and favorites
- Native Electron title-bar dragging and Windows Mica when available

## Development

```powershell
npm install
npm start
```

Start Electron in another terminal:

```powershell
npm run electron
```

Run validation:

```powershell
npm test -- --watchAll=false --runInBand
npx eslint src --ext .js --max-warnings=0
npm run build
```
