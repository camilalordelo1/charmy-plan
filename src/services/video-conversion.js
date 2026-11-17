// Single-thread WebAssembly conversion runs locally; the original is not uploaded.
export async function convertToMp4(
  file,
  { onProgress = () => {}, signal } = {},
) {
  if (file.size > 150 * 1024 * 1024)
    throw new Error(
      "Este vídeo é grande para converter no navegador. Envie uma versão menor ou converta para MP4/H.264 no computador.",
    );
  const { FFmpeg } = await import("../vendor/ffmpeg/index.js");
  const ffmpeg = new FFmpeg();
  const abort = () => ffmpeg.terminate();
  signal?.addEventListener("abort", abort, { once: true });
  const check = () => {
    if (signal?.aborted)
      throw new DOMException("Conversão cancelada", "AbortError");
  };
  const timeout = setTimeout(abort, 10 * 60 * 1000);
  try {
    check();
    onProgress("Carregando conversor local… A primeira abertura pode demorar.");
    const loadTimeout = setTimeout(abort, 60000);
    try {
      await ffmpeg.load(
        {
          coreURL: new URL(
            "../vendor/ffmpeg-core/ffmpeg-core.js",
            import.meta.url,
          ).href,
          wasmURL: new URL(
            "../vendor/ffmpeg-core/ffmpeg-core.wasm",
            import.meta.url,
          ).href,
        },
        { signal },
      );
    } finally {
      clearTimeout(loadTimeout);
    }
    check();
    const input =
      "input." +
      (file.name
        .split(".")
        .pop()
        ?.replace(/[^a-z0-9]/gi, "") || "video");
    await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    ffmpeg.on("progress", ({ progress }) =>
      onProgress(
        `Convertendo para MP4 compatível… ${Math.min(99, Math.max(0, Math.round(progress * 100)))}%`,
      ),
    );
    onProgress("Convertendo para MP4 compatível…");
    const result = await ffmpeg.exec([
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-sn",
      "-dn",
      "-vf",
      "scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
    check();
    if (result !== 0)
      throw new Error(
        "Não foi possível converter este arquivo. Tente uma cópia em MP4/H.264.",
      );
    const data = await ffmpeg.readFile("output.mp4");
    return new File(
      [data],
      file.name.replace(/\.[^.]+$/, "") + "-compativel.mp4",
      { type: "video/mp4" },
    );
  } catch (error) {
    check();
    throw error instanceof Error
      ? error
      : new Error(
          "Não foi possível concluir a conversão neste navegador. Tente pelo computador.",
        );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
    ffmpeg.terminate();
  }
}
