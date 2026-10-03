import { GIFEncoder, applyPalette, quantize } from "gifenc";

self.addEventListener("message", ({ data }) => {
  const { frames, width, height, delay } = data;

  try {
    const gif = GIFEncoder();

    frames.forEach((frameBuffer) => {
      const pixels = new Uint8ClampedArray(frameBuffer);
      const palette = quantize(pixels, 128, { format: "rgb444" });
      const indexed = applyPalette(pixels, palette, "rgb444");
      gif.writeFrame(indexed, width, height, {
        palette,
        delay,
        repeat: 0,
      });
    });

    gif.finish();
    const bytes = gif.bytes();
    self.postMessage({ ok: true, buffer: bytes.buffer }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof Error ? error.message : "GIF encoding failed." });
  }
});
