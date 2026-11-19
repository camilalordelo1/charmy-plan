import { imagePreviews } from "../data/image-previews.js";
const root = new URL("../../", import.meta.url);
// Original files remain the download target; display a lightweight derivative.
export function imagePreview(src, size = "display") {
  if (!src) return src;
  const relative = src.startsWith(root.href) ? decodeURIComponent(src.slice(root.href.length)) : src;
  const preview = imagePreviews[relative]?.[size];
  return preview ? (src.startsWith(root.href) ? new URL(preview, root).href : preview) : src;
}
