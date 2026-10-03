# Kisap Phase 3 — Design QA

## Evidence

- Source visual truth: `C:\Users\Bryan\OneDrive\Pictures\Camera Roll\photobooth strip.jpg`, the approved Kisap Phase 1 interface, and the user's defined ten-second capture/retake behavior.
- Rendered implementation: `http://127.0.0.1:5173/#capture`.
- Implementation screenshot path: Codex in-app browser desktop and mobile captures; this browser surface does not expose a persistent filesystem path.
- Desktop viewport: 1265 × 708 CSS px, density 1.
- Mobile viewport: 390 × 844 CSS px, density 1.
- Source strip: 1200 × 1800 px. It remains the output-format reference; the camera view is normalized to the approved responsive Kisap application shell.
- States inspected: camera off, permission denied, desktop capture, and mobile capture.

## Full-view comparison evidence

The Phase 2 camera experience retains the approved Kisap header, progress rail, editorial typography, black/paper palette, and responsive spacing. The camera is the dominant task surface without turning the page into a generic utility UI. On mobile, the heading, error message, camera frame, and actions stack without overflow.

## Focused-region comparison evidence

The camera stage and error surface were inspected separately. The stage clearly communicates that the camera is off, no audio is requested, and the action required to continue. The denied-permission state appears beside the task explanation with signal-red emphasis and leaves the retry action available. The review/photo states could not be visually captured with live media because the in-app browser has camera permission denied; their markup and responsive styles were checked in code and production build output.

## Findings

- No remaining visual P0, P1, or P2 issues in the rendered states.
- P3 functional test gap: successful hardware capture needs a user browser session where camera permission is allowed. The denied-permission path was verified instead.

## Required fidelity surfaces

- Fonts and typography: Manrope, Newsreader, and DM Mono hierarchy remains unchanged; countdown and camera metadata use restrained optical sizing.
- Spacing and layout rhythm: capture copy and camera stage maintain the established two-column desktop rhythm and clean single-column mobile flow.
- Colors and visual tokens: existing near-black, paper, muted gray, privacy green, and signal red tokens are reused consistently.
- Image quality and asset fidelity: live media uses a centered 3:2 cover crop, mirrored selfie preview, 1200 × 800 JPEG still, and 360 × 240 GIF frames. No placeholder asset substitutes for successful capture.
- Copy and content: the screen explains that the countdown is the motion recording, the final frame becomes the photo, no audio is requested, and all processing stays local.

## Comparison history

1. P2: the camera activation originally re-rendered the video element after permission, creating an avoidable stream-reattachment risk.
   - Fix: the successful activation path now updates the existing camera stage in place.
   - Post-fix evidence: denied-permission retry remains stable; production build passes with the revised activation path.
2. P2: leaving the capture screen during the ten-second timer could allow background frame collection to continue.
   - Fix: added abort-aware countdown and GIF worker cancellation on navigation, browser-back changes, and session reset.
   - Post-fix evidence: syntax and production builds pass for all three modules.
3. P1: a granted camera stream could be labeled ready before it exposed non-zero video dimensions, leaving a black preview and causing capture to fail with “The camera is not ready yet.”
   - Fix: camera activation and capture now wait for `HAVE_CURRENT_DATA`, a non-zero `videoWidth`, and a non-zero `videoHeight`, with event-driven checks, animation-frame polling, and a clear timeout error. A failed first-frame handshake also stops the stream cleanly.
   - Post-fix evidence: the updated camera module passes syntax and production builds; the successful device-camera path awaits confirmation in the user's browser where camera permission is available.
4. P1: the first readiness fix still used `MediaStream.active` as the capture gate. The user's browser showed “Camera: Using now,” but that flag evaluated false and rejected capture before checking the attached video.
   - Fix: readiness now checks the actual video track's `readyState`, trusts a live stream already attached to the video element, and reattaches the stored stream when necessary. Camera activation also clears stale ready/error messages when a stream drops.
   - Post-fix evidence: all camera modules pass syntax and production builds; the rebuilt client no longer uses `MediaStream.active` as its capture gate.

## Functional and runtime checks

- Camera-off and denied-permission states verified in the in-app browser.
- Mobile capture layout verified at 390 × 844.
- Browser console checked: no warnings or errors.
- GIF encoder smoke test produced a valid `GIF89a` file signature.
- GIF worker bundles successfully as a separate production asset.
- Main app, camera module, and GIF worker syntax checks pass.
- Production build passes.
- Live hardware success path remains ready for confirmation in a browser with camera permission.

## Phase 3 editor verification

- The editor is the first screen that duplicates the four-photo strip into two identical columns.
- Original, monochrome, warm, cool, and vintage filters update the live preview.
- Black, paper, red, blue, and sage backgrounds use plain color only. Paper switches the footer mark and date to dark ink for contrast.
- The six-symbol sticker tray supports add, select, drag, resize, and remove. Every sticker edit is mirrored to the second strip and capped at six placements.
- Controls expose pressed/selected states to assistive technology and collapse into a three-column sticker tray on mobile.
- Syntax checks, production build, and browser interaction checks pass.

final result: passed
