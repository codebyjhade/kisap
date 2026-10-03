# kisap.

Kisap is a private, browser-based photo booth built around four still and moving moments. The finished 1200 × 1800 strip duplicates those four captures into two matching columns for easy saving and sharing.

## Release status

Kisap now includes the complete capture, review, edit, download, motion, native-share, private recovery, responsive mobile, and installable/offline flows. The live preview and exported media share the same two-strip geometry, colors, filters, typography, and sticker coordinates. Motion export prefers H.264 in an MP4 container when the browser provides it, with standards-based WebM recording as the fallback.

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

## Production deployment

Build the static site with:

```sh
pnpm build
```

Deploy the contents of `dist/` at the root of an HTTPS domain. HTTPS is required for camera access, native file sharing, installation, and the service worker. After deploying, test at least one real iPhone in Safari and one Android phone in Chrome.

Kisap does not require environment variables, a database, authentication, object storage, or a server runtime.

## Privacy and offline behavior

- Fonts, icons, and brand artwork are served locally.
- No analytics, advertising trackers, or third-party font requests are included.
- Unfinished sessions are kept locally in IndexedDB for up to six hours.
- Successful export, starting over, or expiration clears the recovery copy.
- The service worker caches the app shell and production assets for repeat and offline use.
- The public privacy notice is available at `/privacy.html`.
