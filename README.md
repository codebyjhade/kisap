# kisap.

Kisap is a private, browser-based photo booth built around four still and moving moments. The finished 1200 × 1800 strip duplicates those four captures into two matching columns for easy saving and sharing.

## Current phase

Phase 4 adds final media export. The live preview and the 1200 × 1800 photo use the same two-strip geometry, colors, filters, typography, and sticker coordinates. Motion export prefers H.264 in an MP4 container when the browser provides it, with standards-based WebM recording as the fallback.

## Local development

```sh
pnpm install
pnpm dev
```

## Product principles

- Photos and motion clips stay on the user’s device.
- No account, upload, gallery, or backend is required.
- One signature format: four unique moments, duplicated side by side.
- Printing is intentionally out of scope.
