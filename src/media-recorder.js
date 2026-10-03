const RECORDER_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp8",
  "video/webm;codecs=vp9",
  "video/webm",
];

export function createCompatibleVideoRecorder(stream, videoBitsPerSecond) {
  if (!window.MediaRecorder) {
    throw new Error("Video recording is not supported in this browser.");
  }

  const supportsType = typeof MediaRecorder.isTypeSupported === "function"
    ? (type) => MediaRecorder.isTypeSupported(type)
    : () => true;

  for (const mimeType of RECORDER_TYPES) {
    if (!supportsType(mimeType)) continue;
    try {
      return new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    } catch {
      try {
        return new MediaRecorder(stream, { mimeType });
      } catch {
        // Some browsers report support but reject a specific codec profile.
      }
    }
  }

  try {
    return new MediaRecorder(stream, { videoBitsPerSecond });
  } catch {
    return new MediaRecorder(stream);
  }
}

export function recorderFileExtension(mimeType = "") {
  return mimeType.toLowerCase().includes("mp4") ? "mp4" : "webm";
}

export function startVideoRecorder(recorder) {
  return new Promise((resolve, reject) => {
    recorder.addEventListener("start", resolve, { once: true });
    recorder.addEventListener("error", (event) => {
      reject(event.error || new Error("Video recording could not start."));
    }, { once: true });
    recorder.start();
  });
}
