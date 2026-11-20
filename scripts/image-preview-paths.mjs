import { createHash } from "node:crypto";

export function imagePreviewPaths(file, bytes) {
  const identity = createHash("sha256").update(file).digest("hex").slice(0, 20);
  const revision = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  return Object.fromEntries(["thumb", "display"].map(size =>
    [size, `src/assets/image-previews/${identity}-${revision}-${size}.webp`],
  ));
}
