# Desktop app

The presenter app used in church: an operator screen and a separate clean output for the projector or TV. Works offline.

Stack: Electron, electron-vite, React and TypeScript. Tests use Vitest.

## Folders

| Folder | Contents |
| --- | --- |
| `src/main` | Electron main process: windows, second-screen handling, IPC |
| `src/preload` | The small, safe bridge between the main process and the screens |
| `src/shared` | Pure logic shared by everything: types, Bible references, lyric splitting, schedule helpers. Fully unit tested |
| `src/renderer` | The two screens: the operator window (`index.html`) and the output window (`output.html`) |

## Commands

```powershell
npm install
npm run dev        # start with hot reload
npm run typecheck  # check types
npm test           # unit tests
npm run build      # production build into out/
```

## Design

Follow [`../docs/DESIGN.md`](../docs/DESIGN.md). Compare a real screenshot with the agreed mockup at every milestone.
