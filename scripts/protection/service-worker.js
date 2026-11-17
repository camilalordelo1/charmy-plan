let key = null,
  manifest = null;
const base = new URL("./", self.location.href);
const bytes = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "unlock") {
    key = event.data.key;
    manifest = event.data.manifest;
    event.ports[0]?.postMessage("ready");
  }
});
const types = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  m4v: "video/mp4",
  ogv: "video/ogg",
  wasm: "application/wasm",
  mov: "video/quicktime",
  heic: "image/heic",
};
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
    return;
  const name =
    decodeURIComponent(url.pathname.slice(base.pathname.length)) ||
    "index.html";
  if (!key || !manifest?.files[name]) return;
  const entry = manifest.files[name],
    activeKey = key;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(new URL(entry.file, base), {
          cache: "no-store",
        });
        const plain = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: bytes(entry.iv) },
          activeKey,
          await response.arrayBuffer(),
        );
        const headers = {
          "Content-Type":
            types[name.split(".").pop().toLowerCase()] ||
            "application/octet-stream",
          "Cache-Control": "no-store",
          "Accept-Ranges": "bytes",
        };
        const range = event.request.headers.get("Range");
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (match) {
            const start = match[1]
              ? Number(match[1])
              : Math.max(0, plain.byteLength - Number(match[2]));
            const end =
              match[1] && match[2]
                ? Math.min(Number(match[2]), plain.byteLength - 1)
                : plain.byteLength - 1;
            if (start > end || start >= plain.byteLength)
              return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${plain.byteLength}` },
              });
            headers["Content-Range"] =
              `bytes ${start}-${end}/${plain.byteLength}`;
            return new Response(plain.slice(start, end + 1), {
              status: 206,
              headers,
            });
          }
        }
        return new Response(plain, { headers });
      } catch {
        return new Response(
          "Conteúdo indisponível. Reabra o site para desbloquear.",
          { status: 503 },
        );
      }
    })(),
  );
});
