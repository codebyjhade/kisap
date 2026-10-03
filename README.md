# kisap.

Kisap is a private, browser-based photo booth built around four still and moving moments. The finished 1200 × 1800 strip duplicates those four captures into two matching columns for easy saving and sharing.

## Current phase

Phase 3 adds the focused editor. The four captures are duplicated into the final two-column composition only here. Users can choose a photo filter, a plain strip color, and up to six restrained stickers; sticker position and scale are mirrored across both strips. Final file rendering, downloads, and sharing remain for Phase 4.

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
