import "./styles.css";
import {
  attachCamera,
  cameraIsActive,
  captureMoment,
  startCamera,
  stopCamera,
} from "./camera.js";

const SCREEN_ORDER = ["home", "capture", "review", "edit", "finish"];
const STICKER_CATALOG = [
  { id: "spark", glyph: "✦", label: "Spark" },
  { id: "heart", glyph: "♥", label: "Heart" },
  { id: "smile", glyph: "☺", label: "Smile" },
  { id: "star", glyph: "★", label: "Star" },
  { id: "sun", glyph: "☀", label: "Sun" },
  { id: "flash", glyph: "↯", label: "Flash" },
];

const screenMeta = {
  home: { step: "00", label: "Welcome" },
  capture: { step: "01", label: "Capture" },
  review: { step: "02", label: "Review" },
  edit: { step: "03", label: "Edit" },
  finish: { step: "04", label: "Finish" },
};

const appState = {
  screen: getInitialScreen(),
  background: "black",
  filter: "mono",
  moments: [null, null, null, null],
  activeMoment: 0,
  previewingMoment: null,
  retaking: false,
  cameraError: "",
  notice: "",
  stickers: [],
  selectedStickerId: null,
  cameras: [],
  selectedCameraId: null,
};

let captureController = null;

function getInitialScreen() {
  const requested = window.location.hash.replace("#", "");
  // If requesting a state-dependent screen without moments, reset to home
  if (["review", "edit", "finish"].includes(requested) && !appState.moments.every(Boolean)) {
    return "home";
  }
  return SCREEN_ORDER.includes(requested) ? requested : "home";
}

function navigate(screen) {
  if (!SCREEN_ORDER.includes(screen)) return;
  if (appState.screen === "capture" && screen !== "capture") {
    captureController?.abort();
    captureController = null;
    stopCamera();
  }
  appState.screen = screen;
  window.location.hash = screen;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function brandMark(size = "default") {
  return `
    <span class="wordmark wordmark--${size}" aria-label="kisap">
      kisap<span class="signal-dot" aria-hidden="true">.</span>
    </span>
  `;
}

function stripDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}.${values.month}.${values.day}`;
}

function appHeader() {
  const current = screenMeta[appState.screen];
  const cameraLive = appState.screen === "capture" && cameraIsActive();
  return `
    <header class="app-header">
      <button class="brand-button" data-nav="home" aria-label="Return home">
        ${brandMark("small")}
      </button>
      <div class="header-meta" aria-label="Current step">
        <span>${current.step}</span>
        <span>${current.label}</span>
      </div>
      <div class="privacy-mark"><span class="privacy-light ${cameraLive ? "privacy-light--live" : ""}"></span> ${cameraLive ? "camera active · local only" : "stays on your device"}</div>
    </header>
  `;
}

function progressRail() {
  if (appState.screen === "home") return "";
  const currentIndex = SCREEN_ORDER.indexOf(appState.screen);
  return `
    <nav class="progress-rail" aria-label="Photo booth progress">
      ${SCREEN_ORDER.slice(1).map((screen, index) => {
        const status = index + 1 < currentIndex ? "complete" : index + 1 === currentIndex ? "current" : "upcoming";
        return `<span class="progress-step progress-step--${status}">${String(index + 1).padStart(2, "0")} ${screenMeta[screen].label}</span>`;
      }).join("")}
    </nav>
  `;
}

function diagramFrame(index, usePhotos) {
  const moment = usePhotos ? appState.moments[index] : null;
  return `
    <div class="diagram-frame ${moment ? "diagram-frame--filled" : ""}">
      ${moment ? `<img src="${moment.stillUrl}" alt="Captured moment ${index + 1}">` : ""}
      <span>${String(index + 1).padStart(2, "0")}</span>
      <small>${moment ? "captured" : "moment"}</small>
    </div>
  `;
}

function stickerLayer(interactive = false) {
  return `
    <div class="strip-stickers" aria-label="Placed stickers">
      ${appState.stickers.map((sticker) => `
        <button
          class="placed-sticker ${interactive && sticker.id === appState.selectedStickerId ? "is-selected" : ""}"
          style="--sticker-x:${sticker.x}%;--sticker-y:${sticker.y}%;--sticker-scale:${sticker.scale}"
          ${interactive ? `data-sticker-id="${sticker.id}" aria-label="Move ${sticker.label} sticker"` : `data-mirror-sticker-id="${sticker.id}" tabindex="-1" aria-hidden="true"`}
        >${sticker.glyph}</button>
      `).join("")}
    </div>
  `;
}

function stripDiagram({ duplicate = true, usePhotos = true, editable = false } = {}) {
  const frames = Array.from({ length: 4 }, (_, index) => diagramFrame(index, usePhotos)).join("");
  
  const buildStrip = (isHidden, isInteractive) => `
    <div class="strip-diagram" ${isHidden ? 'aria-hidden="true"' : ''}>
      <div class="strip-deco-top">kisap. // ARCHIVE 01</div>
      <div class="strip-deco-vertical">A MOMENT, STILL MOVING</div>
      <div class="diagram-column">
        ${frames}
        ${stickerLayer(isInteractive)}
        <footer>${brandMark("strip")}<time>${stripDate()}</time></footer>
      </div>
    </div>
  `;

  return `
    <div class="strip-group ${duplicate ? 'strip-group--double' : 'strip-group--single'}" aria-label="${duplicate ? "Two photo strips" : "One photo strip"}">
      ${buildStrip(false, editable)}
      ${duplicate ? buildStrip(true, false) : ''}
    </div>
  `;
}

function homeScreen() {
  return `
    <div class="landing-page">
      <nav class="landing-nav">
        <div class="landing-logo">kisap<span class="signal-dot">.</span></div>
        <div class="landing-nav-links">
          <a href="#how-it-works">How it Works</a>
          <a href="#privacy">Privacy</a>
        </div>
        <button class="button button--ghost landing-nav-cta" data-start-session>Start Booth</button>
      </nav>

      <header class="landing-hero">
        <div class="hero-bg-glow"></div>
        <div class="landing-hero-content">
          <div class="hero-badge">Web Photo Booth</div>
          <h1 class="hero-title">A moment,<br><em>still moving.</em></h1>
          <p class="hero-subtitle">
            Take four photos, keep the ten seconds around each one, and make a strip that feels like you.
          </p>
          
          <ul class="hero-highlights">
            <li>
              <span class="highlight-icon">✓</span>
              <span><strong>100% Private:</strong> Everything stays on your device.</span>
            </li>
            <li>
              <span class="highlight-icon">✓</span>
              <span><strong>Live Previews:</strong> Instantly see your GIF and photo.</span>
            </li>
            <li>
              <span class="highlight-icon">✓</span>
              <span><strong>No Apps Needed:</strong> Works right in your browser.</span>
            </li>
          </ul>

          <div class="hero-cta-group">
            <button class="button button--light hero-cta" data-start-session>Enter Photo Booth <span aria-hidden="true">→</span></button>
            <span class="hero-note">4 moments · about 1 minute</span>
          </div>
        </div>
        <div class="hero-visual">
           ${stripDiagram({ duplicate: true, usePhotos: false })}
        </div>
      </header>

      <section id="how-it-works" class="landing-section reveal">
        <div class="section-content">
          <p class="eyebrow">The Experience</p>
          <h2 class="section-title">Four chances to feel right.</h2>
          <div class="features-grid">
            <div class="feature-card reveal">
              <div class="feature-icon">01</div>
              <h3>Capture</h3>
              <p>You have 10 seconds per moment. The countdown is your motion capture. The final frame becomes your still photo.</p>
            </div>
            <div class="feature-card reveal" style="transition-delay: 0.1s">
              <div class="feature-icon">02</div>
              <h3>Review</h3>
              <p>Don't like a shot? Retake it instantly. Old files are replaced immediately so there's no clutter.</p>
            </div>
            <div class="feature-card reveal" style="transition-delay: 0.2s">
              <div class="feature-icon">03</div>
              <h3>Personalize</h3>
              <p>Add stickers, change backgrounds, and apply filters. Every edit is mirrored perfectly to your dual strip.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="privacy" class="landing-section landing-section--dark reveal">
        <div class="section-content split-section">
          <div class="split-text">
             <p class="eyebrow">Local Only</p>
             <h2 class="section-title">Stays on your device.</h2>
             <p class="section-desc">Kisap does not need an account, gallery, or upload. Everything is processed directly in your browser. Nothing follows you home.</p>
          </div>
          <div class="split-visual">
             <div class="privacy-shield">
               <span class="privacy-light privacy-light--live" style="width:16px;height:16px;display:inline-block;margin-bottom:1rem;"></span>
               <h3>100% Private</h3>
               <p>No servers. No data collection. No uploads.</p>
             </div>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-footer-content">
          <div class="footer-brand">kisap<span class="signal-dot">.</span></div>
          <p>A private, browser-based photo booth for four still and moving moments.</p>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} Kisap. Created by Bryan. All rights reserved.</span>
            <button class="button button--ghost footer-start" data-start-session>Start now</button>
          </div>
        </div>
      </footer>
    </div>
  `;
}

function captureScreen() {
  const number = appState.activeMoment + 1;
  const active = cameraIsActive();
  const capturedCount = appState.moments.filter(Boolean).length;
  const actionLabel = active ? (appState.retaking ? `Retake moment ${number}` : `Capture moment ${number}`) : "Turn on camera";

  const hasMultipleCameras = appState.cameras?.length > 1;
  const cameraSwitcher = hasMultipleCameras && active && !appState.busy ? `
    <button class="button button--ghost" data-switch-camera title="Switch Camera" aria-label="Switch Camera" style="padding: 0 16px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 16a6 6 0 1 1-16 0c0-3.3 2.7-6 6-6h14"></path>
        <path d="m16 6 4 4-4 4"></path>
      </svg>
    </button>
  ` : "";

  return `
    <main class="workflow-page page-shell">
      <section class="workflow-heading">
        <p class="eyebrow">Moment ${String(number).padStart(2, "0")} of 04</p>
        <h1>${appState.retaking ? "Make it feel" : "Ready when"}<br>${appState.retaking ? "right." : "you are."}</h1>
        <p>The ten-second countdown is also your motion capture. Move, pose, laugh—the final frame becomes your photo.</p>
        ${appState.notice ? `<p class="capture-notice" role="status">${appState.notice}</p>` : ""}
        ${appState.cameraError ? `<p class="capture-error" role="alert">${appState.cameraError}</p>` : ""}
      </section>
      <section class="camera-stage ${active ? "camera-stage--live" : "camera-stage--inactive"}" aria-label="Camera preview">
        <video id="camera-feed" class="camera-feed" autoplay muted playsinline></video>
        <div class="camera-message ${active ? "camera-message--ready" : ""}">
          <span id="capture-kicker">${active ? "Camera ready" : "Camera is off"}</span>
          <strong id="capture-countdown">${active ? "10" : "—"}</strong>
          <p id="capture-status">${active ? "Recording begins when you press capture." : "Turn it on when you are ready. No audio is requested."}</p>
        </div>
        <div class="camera-meta">
          <span id="recording-state">${active ? "READY · 10 SEC" : "LOCAL CAMERA"}</span>
          <div style="display:flex; gap:10px; align-items:center;">
            <span>NO AUDIO</span>
          </div>
        </div>
      </section>
      <div class="workflow-actions">
        <button class="button button--ghost" data-nav="${capturedCount ? "review" : "home"}">${capturedCount ? "Back to review" : "Back"}</button>
        <div style="display:flex; gap:12px; align-items:center;">
          ${cameraSwitcher}
          <button class="button button--light" ${appState.busy ? "disabled" : ""} ${active ? "data-capture-moment" : "data-enable-camera"}>${actionLabel} <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </main>
  `;
}

function momentCard(index) {
  const moment = appState.moments[index - 1];

  if (!moment) {
    return `
      <article class="moment-card moment-card--empty">
        <div class="moment-number">${String(index).padStart(2, "0")}</div>
        <div><h2>Moment ${index}</h2><p>Waiting for capture</p></div>
        <span class="moment-duration">10 sec</span>
      </article>
    `;
  }

  return `
    <article class="moment-card moment-card--captured">
      <div class="moment-media" style="position: relative;">
        <img src="${moment.stillUrl}" alt="Photo for moment ${index}">
        <span style="position: relative; z-index: 2;">final frame</span>
      </div>
      <div class="moment-card-copy">
        <div><span class="moment-number">${String(index).padStart(2, "0")}</span><h2>Moment ${index}</h2></div>
        <div class="moment-card-actions">
          <button class="mini-button" data-retake="${index - 1}">Retake</button>
        </div>
      </div>
    </article>
  `;
}

function reviewScreen() {
  const complete = appState.moments.every(Boolean);
  return `
    <main class="workflow-page workflow-page--wide page-shell">
      <section class="workflow-heading workflow-heading--compact">
        <p class="eyebrow">Review</p>
        <h1>Four chances<br>to feel right.</h1>
        <p>Every retake replaces both the photo and its GIF immediately, so unused media never piles up.</p>
      </section>
      <section class="moments-grid" aria-label="Captured moments">
        ${[1, 2, 3, 4].map(momentCard).join("")}
      </section>
      <div class="workflow-actions workflow-actions--full">
        <button class="button button--ghost" data-capture-next>${complete ? "Capture again" : "Capture remaining"}</button>
        <button class="button ${complete ? "button--light" : "button--disabled"}" ${complete ? "data-nav=\"edit\"" : "disabled"}>Continue to editor <span aria-hidden="true">→</span></button>
      </div>
    </main>
  `;
}

function editorScreen() {
  return `
    <main class="editor-page page-shell">
      <section class="editor-preview">
        <div class="preview-label"><span>Live preview</span><span>1200 × 1800</span></div>
        ${stripDiagram({ editable: true })}
        <p class="preview-help">Drag a selected sticker on the left strip. Every edit is mirrored to the right.</p>
      </section>
      <aside class="editor-panel">
        <div>
          <p class="eyebrow">Make it yours</p>
          <h1>Keep it simple.</h1>
          <p>Edits are applied once and mirrored perfectly across both strips.</p>
        </div>
        <fieldset>
          <legend>Filter</legend>
          <div class="choice-row" data-choice-group="filter">
            ${["original", "mono", "warm", "cool", "vintage"].map(value => `<button class="choice ${appState.filter === value ? "is-selected" : ""}" data-filter="${value}" aria-pressed="${appState.filter === value}">${value}</button>`).join("")}
          </div>
        </fieldset>
        <fieldset>
          <legend>Background</legend>
          <div class="swatch-row" data-choice-group="background">
            ${[
              ["black", "#0b0b0b"],
              ["paper", "#f4f1ea"],
              ["red", "#9e312b"],
              ["blue", "#26364a"],
              ["sage", "#66705f"],
            ].map(([name, color]) => `<button class="swatch ${appState.background === name ? "is-selected" : ""}" style="--swatch:${color}" data-background="${name}" aria-label="${name} background" aria-pressed="${appState.background === name}"></button>`).join("")}
          </div>
        </fieldset>
        <fieldset>
          <legend>Stickers</legend>
          <div class="sticker-tray" aria-label="Add a sticker">
            ${STICKER_CATALOG.map((sticker) => `<button class="sticker-choice" data-add-sticker="${sticker.id}" aria-label="Add ${sticker.label} sticker" ${appState.stickers.length >= 6 ? "disabled" : ""}><span>${sticker.glyph}</span><small>${sticker.label}</small></button>`).join("")}
          </div>
          <div data-sticker-controls>${stickerControls()}</div>
        </fieldset>
        <div class="editor-actions">
          <button class="button button--ghost" data-nav="review">Back</button>
          <button class="button button--light" data-nav="finish">Preview finish <span aria-hidden="true">→</span></button>
        </div>
      </aside>
    </main>
  `;
}

function finishScreen() {
  return `
    <main class="finish-page page-shell">
      <section class="finish-card">
        <p class="eyebrow">Your kisap</p>
        <h1>Made here.<br><em>Kept by you.</em></h1>
        <p>Your four photos and GIFs are ready locally. Final strip rendering, downloads, and sharing arrive in the next phase.</p>
        <div class="finish-actions">
          <button class="button button--light" id="btn-download-photo">Download photo</button>
          <button class="button button--light" id="btn-download-motion">Download motion</button>
          <button class="button button--ghost" id="btn-share-photo" ${navigator.share ? "" : "style='display:none'"}>Share</button>
        </div>
        <button class="text-button" data-start-session>Start another strip</button>
      </section>
      <aside class="privacy-panel">
        <span class="privacy-index">LOCAL / 002</span>
        <h2>Your moments stay on this device.</h2>
        <p>Kisap does not need an account, gallery, or upload. Starting another strip or closing the session clears its temporary media.</p>
      </aside>
    </main>
  `;
}

const screens = { home: homeScreen, capture: captureScreen, review: reviewScreen, edit: editorScreen, finish: finishScreen };

function bindInteractions() {
  document.querySelectorAll("[data-nav]").forEach((element) => {
    element.addEventListener("click", () => navigate(element.dataset.nav));
  });

  document.querySelectorAll("[data-start-session]").forEach((element) => {
    element.addEventListener("click", () => {
      resetSession();
      navigate("capture");
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
      }
    });
  }, { threshold: 0.15 });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  document.querySelector("[data-enable-camera]")?.addEventListener("click", enableCamera);
  document.querySelector("[data-switch-camera]")?.addEventListener("click", switchCamera);
  document.querySelector("[data-capture-moment]")?.addEventListener("click", runCapture);

  document.querySelector("#btn-download-photo")?.addEventListener("click", () => exportStrip("photo"));
  document.querySelector("#btn-download-motion")?.addEventListener("click", () => exportStrip("motion"));
  document.querySelector("#btn-share-photo")?.addEventListener("click", () => exportStrip("share"));

  document.querySelectorAll("[data-retake]").forEach((element) => {
    element.addEventListener("click", () => {
      appState.activeMoment = Number(element.dataset.retake);
      appState.retaking = true;
      appState.notice = "The old files will be replaced as soon as this retake is saved.";
      navigate("capture");
    });
  });

  document.querySelector("[data-capture-next]")?.addEventListener("click", () => {
    const emptyIndex = appState.moments.findIndex((moment) => !moment);
    appState.activeMoment = emptyIndex === -1 ? 0 : emptyIndex;
    appState.retaking = emptyIndex === -1;
    appState.notice = "";
    navigate("capture");
  });

  document.querySelectorAll("[data-filter]").forEach((element) => {
    element.addEventListener("click", () => updateEditorChoice("filter", element.dataset.filter));
  });

  document.querySelectorAll("[data-background]").forEach((element) => {
    element.addEventListener("click", () => updateEditorChoice("background", element.dataset.background));
  });

  document.querySelectorAll("[data-add-sticker]").forEach((element) => {
    element.addEventListener("click", () => addSticker(element.dataset.addSticker));
  });

  bindStickerInteractions();
}

function stickerControls() {
  const sticker = selectedSticker();
  if (!sticker) return `<p class="control-note">Add up to six. Placement and size are mirrored automatically.</p>`;
  return `
    <div class="sticker-tools">
      <span data-selected-sticker-label>${sticker.label} selected</span>
      <button data-resize-sticker="smaller" aria-label="Make sticker smaller">−</button>
      <button data-resize-sticker="larger" aria-label="Make sticker larger">+</button>
      <button data-remove-sticker>Remove</button>
    </div>
    <p class="control-note">Drag it directly on the left strip to place it.</p>
  `;
}

function bindStickerInteractions() {
  document.querySelectorAll("[data-sticker-id]").forEach((element) => {
    element.addEventListener("pointerdown", beginStickerDrag);
    element.addEventListener("click", () => selectSticker(Number(element.dataset.stickerId)));
  });
  document.querySelectorAll("[data-resize-sticker]").forEach((element) => {
    element.addEventListener("click", () => resizeSelectedSticker(element.dataset.resizeSticker === "larger" ? 0.15 : -0.15));
  });
  document.querySelector("[data-remove-sticker]")?.addEventListener("click", removeSelectedSticker);
}

function updateStickerEditor() {
  document.querySelectorAll(".strip-stickers").forEach((layer, index) => {
    layer.innerHTML = appState.stickers.map((sticker) => `
      <button
        class="placed-sticker ${index === 0 && sticker.id === appState.selectedStickerId ? "is-selected" : ""}"
        style="--sticker-x:${sticker.x}%;--sticker-y:${sticker.y}%;--sticker-scale:${sticker.scale}"
        ${index === 0
          ? `data-sticker-id="${sticker.id}" aria-label="Move ${sticker.label} sticker"`
          : `data-mirror-sticker-id="${sticker.id}" tabindex="-1" aria-hidden="true"`}
      >${sticker.glyph}</button>
    `).join("");
  });
  document.querySelectorAll("[data-add-sticker]").forEach((button) => {
    button.disabled = appState.stickers.length >= 6;
  });
  const controls = document.querySelector("[data-sticker-controls]");
  if (controls) controls.innerHTML = stickerControls();
  bindStickerInteractions();
}

function updateEditorChoice(kind, value) {
  if (appState[kind] === value) return;
  appState[kind] = value;
  const app = document.querySelector("#app");
  if (app) app.dataset[kind] = value;
  document.querySelectorAll(`[data-${kind}]`).forEach((element) => {
    const selected = element.dataset[kind] === value;
    element.classList.toggle("is-selected", selected);
    element.setAttribute("aria-pressed", String(selected));
  });
}



function addSticker(catalogId) {
  if (appState.stickers.length >= 6) {
    appState.notice = "Six stickers is the limit for a clean strip.";
    return;
  }
  const catalogSticker = STICKER_CATALOG.find((sticker) => sticker.id === catalogId);
  if (!catalogSticker) return;
  const id = Date.now();
  const offset = appState.stickers.length * 4;
  appState.stickers.push({ ...catalogSticker, id, x: 50 + offset, y: 42 + offset, scale: 1 });
  appState.selectedStickerId = id;
  updateStickerEditor();
}

function selectedSticker() {
  return appState.stickers.find((sticker) => sticker.id === appState.selectedStickerId);
}

function resizeSelectedSticker(change) {
  const sticker = selectedSticker();
  if (!sticker) return;
  sticker.scale = Math.min(2, Math.max(0.65, Number((sticker.scale + change).toFixed(2))));
  document.querySelectorAll(`[data-sticker-id="${sticker.id}"], [data-mirror-sticker-id="${sticker.id}"]`).forEach((element) => {
    element.style.setProperty("--sticker-scale", sticker.scale);
  });
}

function removeSelectedSticker() {
  appState.stickers = appState.stickers.filter((sticker) => sticker.id !== appState.selectedStickerId);
  appState.selectedStickerId = null;
  updateStickerEditor();
}

function beginStickerDrag(event) {
  event.preventDefault();
  const id = Number(event.currentTarget.dataset.stickerId);
  selectSticker(id);
  const column = event.currentTarget.closest(".diagram-column");
  if (!column) return;
  const bounds = column.getBoundingClientRect();
  const targets = document.querySelectorAll(`[data-sticker-id="${id}"], [data-mirror-sticker-id="${id}"]`);
  let nextPosition = null;
  let frame = 0;

  const move = (moveEvent) => {
    nextPosition = {
      x: Math.min(92, Math.max(8, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(86, Math.max(5, ((moveEvent.clientY - bounds.top) / bounds.height) * 100)),
    };
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const sticker = appState.stickers.find((item) => item.id === id);
      if (!sticker || !nextPosition) return;
      sticker.x = nextPosition.x;
      sticker.y = nextPosition.y;
      targets.forEach((placed) => {
        placed.style.setProperty("--sticker-x", `${sticker.x}%`);
        placed.style.setProperty("--sticker-y", `${sticker.y}%`);
      });
    });
  };
  const end = (upEvent) => {
    if (upEvent) move(upEvent);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerup", end, { once: true });
  window.addEventListener("pointercancel", end, { once: true });
}

function selectSticker(id) {
  if (appState.selectedStickerId === id) return;
  appState.selectedStickerId = id;
  document.querySelectorAll("[data-sticker-id]").forEach((element) => {
    element.classList.toggle("is-selected", Number(element.dataset.stickerId) === id);
  });
  
  const sticker = selectedSticker();
  const label = document.querySelector("[data-selected-sticker-label]");
  if (label && sticker) {
    label.textContent = `${sticker.label} selected`;
  } else if (sticker) {
    const controls = document.querySelector("[data-sticker-controls]");
    if (controls) {
      controls.innerHTML = stickerControls();
      document.querySelectorAll("[data-resize-sticker]").forEach((element) => {
        element.addEventListener("click", () => resizeSelectedSticker(element.dataset.resizeSticker === "larger" ? 0.15 : -0.15));
      });
      document.querySelector("[data-remove-sticker]")?.addEventListener("click", removeSelectedSticker);
    }
  }
}

async function enableCamera() {
  const button = document.querySelector("[data-enable-camera]");
  const status = document.querySelector("#capture-status");
  const stage = document.querySelector(".camera-stage");
  const kicker = document.querySelector("#capture-kicker");
  if (button) button.disabled = true;
  stage?.classList.remove("camera-stage--inactive");
  stage?.classList.add("camera-stage--connecting");
  if (kicker) kicker.textContent = "Connecting camera";
  if (status) status.textContent = "Waiting for the first video frame…";
  appState.cameraError = "";
  appState.notice = "";

  try {
    const { startCamera, getAvailableCameras } = await import("./camera.js");
    await startCamera(document.querySelector("#camera-feed"), appState.selectedCameraId);
    
    // Fetch cameras if we haven't yet, now that we have permissions
    if (appState.cameras.length === 0) {
      appState.cameras = await getAvailableCameras();
      if (!appState.selectedCameraId && appState.cameras.length > 0) {
        const track = document.querySelector("#camera-feed")?.srcObject?.getVideoTracks()[0];
        if (track) {
          const active = appState.cameras.find(c => c.label === track.label);
          if (active) appState.selectedCameraId = active.deviceId;
        }
      }
    }
    
    appState.notice = "Camera ready. Your ten seconds begin when you press capture.";
    showCameraReady();
    return;
  } catch (error) {
    appState.cameraError = cameraErrorMessage(error);
  }

  render();
}

async function switchCamera() {
  if (appState.cameras.length < 2) return;
  const currentIndex = appState.cameras.findIndex(c => c.deviceId === appState.selectedCameraId);
  const nextIndex = (currentIndex + 1) % appState.cameras.length;
  appState.selectedCameraId = appState.cameras[nextIndex].deviceId;
  
  const status = document.querySelector("#capture-status");
  if (status) status.textContent = "Switching camera...";
  
  try {
    const { startCamera } = await import("./camera.js");
    await startCamera(document.querySelector("#camera-feed"), appState.selectedCameraId);
    showCameraReady();
  } catch (error) {
    appState.cameraError = cameraErrorMessage(error);
    render();
  }
}

function showCameraReady() {
  const stage = document.querySelector(".camera-stage");
  const message = document.querySelector(".camera-message");
  const kicker = document.querySelector("#capture-kicker");
  const countdown = document.querySelector("#capture-countdown");
  const status = document.querySelector("#capture-status");
  const recordingState = document.querySelector("#recording-state");
  const privacy = document.querySelector(".privacy-mark");
  const button = document.querySelector("[data-enable-camera]");

  stage?.classList.remove("camera-stage--inactive");
  stage?.classList.remove("camera-stage--connecting");
  stage?.classList.add("camera-stage--live");
  message?.classList.add("camera-message--ready");
  if (kicker) kicker.textContent = "Camera ready";
  if (countdown) countdown.textContent = "10";
  if (status) status.textContent = "Recording begins when you press capture.";
  if (recordingState) recordingState.textContent = "READY · 10 SEC";
  if (privacy) privacy.innerHTML = '<span class="privacy-light privacy-light--live"></span> camera active · local only';

  if (button) {
    button.disabled = false;
    button.removeAttribute("data-enable-camera");
    button.setAttribute("data-capture-moment", "");
    button.removeEventListener("click", enableCamera);
    button.innerHTML = `${appState.retaking ? `Retake moment ${appState.activeMoment + 1}` : `Capture moment ${appState.activeMoment + 1}`} <span aria-hidden="true">→</span>`;
    button.addEventListener("click", runCapture);
  }
}

async function runCapture() {
  if (appState.busy) return;
  appState.busy = true;
  appState.cameraError = "";
  captureController = new AbortController();
  setCaptureUi("recording", 10);

  try {
    const result = await captureMoment(document.querySelector("#camera-feed"), {
      onTick: (seconds) => setCaptureUi("recording", seconds),
      onEncoding: () => setCaptureUi("encoding"),
      signal: captureController.signal,
    });

    captureController = null;

    replaceMoment(appState.activeMoment, result);
    const capturedNumber = appState.activeMoment + 1;

    if (appState.retaking || appState.moments.every(Boolean)) {
      appState.previewingMoment = appState.activeMoment;
      appState.retaking = false;
      appState.notice = `Moment ${capturedNumber} saved.`;
      appState.busy = false;
      navigate("review");
      return;
    }

    appState.activeMoment = appState.moments.findIndex((moment) => !moment);
    appState.notice = `Moment ${capturedNumber} saved. Ready for the next one.`;
    appState.busy = false;
    render();
  } catch (error) {
    captureController = null;
    appState.busy = false;
    if (error?.name === "AbortError") return;
    appState.cameraError = error instanceof Error ? error.message : "Capture failed. Please try again.";
    if (!cameraIsActive()) {
      appState.notice = "";
      stopCamera();
    }
    render();
  }
}

function setCaptureUi(mode, seconds = 10) {
  const countdown = document.querySelector("#capture-countdown");
  const status = document.querySelector("#capture-status");
  const kicker = document.querySelector("#capture-kicker");
  const recordingState = document.querySelector("#recording-state");
  const stage = document.querySelector(".camera-stage");
  const button = document.querySelector("[data-capture-moment]");

  if (button) button.disabled = true;
  if (mode === "recording") {
    stage?.classList.add("is-recording");
    if (countdown) countdown.textContent = String(seconds);
    if (kicker) kicker.textContent = "Recording motion";
    if (status) status.textContent = seconds ? "Keep moving. The final frame becomes your photo." : "Hold that moment.";
    if (recordingState) recordingState.textContent = "REC · LOCAL GIF";
  } else {
    stage?.classList.remove("is-recording");
    stage?.classList.add("is-encoding");
    if (countdown) countdown.textContent = "···";
    if (kicker) kicker.textContent = "Saving your moment";
    if (status) status.textContent = "Creating the GIF on this device.";
    if (recordingState) recordingState.textContent = "ENCODING · LOCAL";
  }
}

function replaceMoment(index, { stillBlob, videoBlob }) {
  releaseMoment(appState.moments[index]);
  appState.moments[index] = {
    stillBlob,
    videoBlob,
    stillUrl: URL.createObjectURL(stillBlob),
    videoUrl: URL.createObjectURL(videoBlob),
  };
}

function releaseMoment(moment) {
  if (!moment) return;
  URL.revokeObjectURL(moment.stillUrl);
  URL.revokeObjectURL(moment.videoUrl);
}

function resetSession() {
  captureController?.abort();
  captureController = null;
  stopCamera();
  appState.moments.forEach(releaseMoment);
  appState.moments = [null, null, null, null];
  appState.activeMoment = 0;
  appState.previewingMoment = null;
  appState.retaking = false;
  appState.cameraError = "";
  appState.notice = "";
  appState.busy = false;
  appState.background = "black";
  appState.filter = "mono";
  appState.stickers = [];
  appState.selectedStickerId = null;
}

function cameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") return "Camera access was not allowed. Use your browser controls to allow it, then try again.";
  if (error?.name === "NotFoundError") return "No camera was found on this device.";
  if (error?.name === "NotReadableError") return "The camera is already being used by another app.";
  return error instanceof Error ? error.message : "The camera could not be started.";
}

function render() {
  const app = document.querySelector("#app");
  app.dataset.screen = appState.screen;
  app.dataset.filter = appState.filter;
  app.dataset.background = appState.background;

  if (appState.screen === "home") {
    app.innerHTML = screens.home();
  } else {
    app.innerHTML = `
      ${appHeader()}
      ${progressRail()}
      ${screens[appState.screen]()}
      <footer class="site-footer">
        <span>kisap. / private web photo booth</span>
        <span>phase 03 · personalise & preview</span>
      </footer>
    `;
  }
  bindInteractions();

  if (appState.screen === "capture" && cameraIsActive()) {
    attachCamera(document.querySelector("#camera-feed")).catch((error) => {
      appState.cameraError = cameraErrorMessage(error);
      stopCamera();
      render();
    });
  }
}

window.addEventListener("hashchange", () => {
  const nextScreen = getInitialScreen();
  if (nextScreen !== appState.screen) {
    if (appState.screen === "capture" && nextScreen !== "capture") {
      captureController?.abort();
      captureController = null;
      stopCamera();
    }
    appState.screen = nextScreen;
    render();
  }
});

window.addEventListener("beforeunload", () => {
  stopCamera();
  appState.moments.forEach(releaseMoment);
});

async function generateCanvas(ctxOut = null, videoElements = null, singleStrip = true) {
  const canvas = ctxOut ? null : document.createElement("canvas");
  const canvasWidth = singleStrip ? 600 : 1200;
  if (canvas) {
    canvas.width = canvasWidth;
    canvas.height = 1800;
  }
  const ctx = ctxOut || canvas.getContext("2d");

  const colors = { black: "#0b0b0b", paper: "#f4f1ea", red: "#9e312b", blue: "#26364a", sage: "#66705f" };
  const frameColors = { original: "#050505", mono: "#2b2b29", warm: "#554940", cool: "#3c4650", vintage: "#4b4839" };
  const filters = {
    original: "none",
    mono: "grayscale(100%) contrast(105%)",
    warm: "sepia(30%) saturate(118%) contrast(102%)",
    cool: "saturate(82%) hue-rotate(174deg) contrast(104%)",
    vintage: "sepia(58%) saturate(82%) contrast(92%)",
  };

  // Draw table background
  ctx.fillStyle = "#0b0b0b";
  const fullWidth = singleStrip ? 600 : 1200;
  ctx.fillRect(0, 0, fullWidth, 1800);

  const stripWidth = 550;
  const stripHeight = 1750;
  const stripY = 25;
  const paddingX = 36;
  const paddingTop = 50;
  
  const colWidth = stripWidth - paddingX * 2; // 478
  const photoHeight = 319; // 478 * 2 / 3
  const gap = 24;
  
  const columnsToDraw = singleStrip ? [0] : [0, 1];
  for (const col of columnsToDraw) {
    const stripX = singleStrip ? 25 : (col === 0 ? 35 : 615);
    
    // Draw the physical strip background
    const isBlack = !appState.background || appState.background === "black";
    if (isBlack) {
      const bgGradient = ctx.createLinearGradient(stripX, stripY, stripX, stripY + stripHeight);
      bgGradient.addColorStop(0, "#121212");
      bgGradient.addColorStop(1, "#040404");
      ctx.fillStyle = bgGradient;
    } else {
      ctx.fillStyle = colors[appState.background];
    }
    ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
    
    // Draw strip border and shadow
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(stripX, stripY, stripWidth, stripHeight);
    
    const x = stripX + paddingX;
    const startY = stripY + paddingTop;
    let y = startY;

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = frameColors[appState.filter] || frameColors.original;
      ctx.fillRect(x, y, colWidth, photoHeight);

      ctx.save();
      ctx.filter = filters[appState.filter] || filters.original;
      if (mediaElements[i]) {
        ctx.drawImage(mediaElements[i], x, y, colWidth, photoHeight);
      }
      ctx.restore();

      // Photo overlays (frame number and 'captured' text)
      ctx.save();
      ctx.font = '600 12px "DM Mono", Consolas, monospace';
      ctx.fillStyle = 'rgba(244, 241, 234, 0.72)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 1;
      ctx.fillText(String(i + 1).padStart(2, '0'), x + 16, y + photoHeight - 16);
      ctx.font = '400 12px "Manrope", Arial, sans-serif';
      ctx.fillStyle = '#6f6d67';
      ctx.fillText(mediaElements[i] ? 'captured' : 'moment', x + 38, y + photoHeight - 16);
      ctx.restore();

      y += photoHeight + gap;
    }

    // Aesthetic Decorations
    ctx.save();
    const isPaper = appState.background === "paper";
    ctx.fillStyle = isPaper ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.15)';
    ctx.font = '400 13px "DM Mono", Consolas, monospace';
    
    // Top deco
    ctx.textAlign = "left";
    ctx.fillText("kisap. // ARCHIVE 01", x, startY - 20);
    
    // Vertical left deco
    ctx.save();
    ctx.translate(x - 20, startY + 1100);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("A MOMENT, STILL MOVING", 0, 0);
    ctx.restore();
    ctx.restore();

    // Footer Branding
    ctx.save();
    ctx.font = '600 24px "Manrope", Arial, sans-serif';
    const baseText = "kisap";
    const dotText = ".";
    const baseWidth = ctx.measureText(baseText).width;
    const dotWidth = ctx.measureText(dotText).width;
    const totalWidth = baseWidth + dotWidth;
    const startX = x + colWidth / 2 - totalWidth / 2;
    
    // Y is currently at startY + 1348. Total strip height is 1750. 
    // Remaining = 1750 - 50 - 1348 = 352. Center is 176.
    // So 1348 + 176 = 1524. 
    // y is at 1348 + 50 = 1398. We need to go down to 1524. Let's add 126.
    
    ctx.textAlign = "left";
    ctx.fillStyle = isPaper ? '#0b0b0b' : '#f4f1ea';
    ctx.fillText(baseText, startX, y + 120);
    ctx.fillStyle = "#ff4d3d";
    ctx.fillText(dotText, startX + baseWidth, y + 120);

    ctx.fillStyle = isPaper ? '#0b0b0b' : '#aaa79f';
    ctx.textAlign = "center";
    ctx.font = '400 14px "DM Mono", Consolas, monospace';
    ctx.fillText(stripDate(), x + colWidth / 2, y + 154);
    ctx.restore();

    // Stickers
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, startY, colWidth, 1348); // clip strictly to photo column area
    ctx.clip();
    for (const sticker of appState.stickers) {
      const stX = x + (sticker.x / 100) * colWidth;
      const stY = startY + (sticker.y / 100) * 1348;
      ctx.font = `${Math.round(48 * sticker.scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.glyph, stX, stY);
    }
    ctx.restore();

    // Draw glossy glare overlay strictly on this strip
    const grad = ctx.createLinearGradient(stripX, stripY, stripX + stripWidth, stripY + 600);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.015)");
    grad.addColorStop(0.31, "rgba(255, 255, 255, 0)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
  }

  return canvas;
}

async function exportStrip(type) {
  const btnPhoto = document.querySelector("#btn-download-photo");
  const btnMotion = document.querySelector("#btn-download-motion");
  const btnShare = document.querySelector("#btn-share-photo");

  const setBusy = (isBusy, label = "Downloading...") => {
    if (btnPhoto) {
      btnPhoto.disabled = isBusy;
      if (type === "photo" && isBusy) btnPhoto.textContent = label;
      else if (type === "photo") btnPhoto.textContent = "Download photo";
    }
    if (btnMotion) {
      btnMotion.disabled = isBusy;
      if (type === "motion" && isBusy) btnMotion.textContent = label;
      else if (type === "motion") btnMotion.textContent = "Download motion";
    }
    if (btnShare) {
      btnShare.disabled = isBusy;
      if (type === "share" && isBusy) btnShare.textContent = label;
      else if (type === "share") btnShare.textContent = "Share";
    }
  };

  try {
    setBusy(true);

    if (type === "photo" || type === "share") {
      const canvas = await generateCanvas(null, null, false); // generate double strip
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));

      if (type === "share") {
        const file = new File([blob], `kisap-strip-${Date.now()}.jpg`, { type: "image/jpeg" });
        await navigator.share({
          title: 'My Kisap Photo Strip',
          text: 'A moment, still moving.',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kisap-strip-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (type === "motion") {
      if (!window.MediaRecorder) throw new Error("Video export is not supported in this browser.");
      
      const targetCanvas = document.createElement("canvas");
      targetCanvas.width = 600;
      targetCanvas.height = 1800;
      const ctx = targetCanvas.getContext("2d");
      
      const stream = targetCanvas.captureStream(30);
      const types = [
        "video/mp4",
        "video/webm;codecs=h264",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      
      const recordingPromise = new Promise(resolve => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      
      setBusy(true, "Encoding video...");
      
      const videos = await Promise.all(
        appState.moments.map(m => new Promise((resolve, reject) => {
          const v = document.createElement("video");
          v.src = m.videoUrl;
          v.muted = true;
          v.playsInline = true;
          v.oncanplay = () => resolve(v);
          v.onerror = reject;
          v.load();
        }))
      );

      const photos = await Promise.all(
        appState.moments.map(m => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = m.stillUrl;
        }))
      );
      
      recorder.start();
      videos.forEach(v => v.play());
      
      const startMs = performance.now();
      
      const drawFrame = async () => {
        const elapsed = performance.now() - startMs;
        if (elapsed >= 10000) {
          recorder.stop();
          videos.forEach(v => { v.pause(); v.src = ""; });
          return;
        }
        
        const currentMedia = elapsed < 9000 ? videos : photos;
        await generateCanvas(ctx, currentMedia, true);
        window.requestAnimationFrame(drawFrame);
      };
      
      drawFrame();
      const blob = await recordingPromise;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      a.download = `kisap-motion-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
      alert("Failed to export: " + err.message);
    }
  } finally {
    setBusy(false);
  }
}

render();
