import { readdir, mkdir, writeFile, stat, rename, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "src/assets/previews");
const videoOutput = path.join(root, "src/assets/video-previews");
const force = process.argv.includes("--force");
await mkdir(output, { recursive: true });
await mkdir(videoOutput, { recursive: true });
const previews = {};
const videos = {};
async function missing(file) {
  if (force) return true;
  try {
    return (await stat(file)).size === 0;
  } catch {
    return true;
  }
}
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (/\.(heic|heif)$/i.test(entry.name)) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      const name =
        createHash("sha256").update(relative).digest("hex").slice(0, 20) +
        ".jpg";
      // Pass --force after replacing an original under the same filename.
      if (await missing(path.join(output, name))) execFileSync(
        "magick",
        [
          file + "[0]",
          "-auto-orient",
          "-resize",
          "1200x1200>",
          "-strip",
          "-quality",
          "85",
          path.join(output, name),
        ],
        { stdio: "pipe" },
      );
      previews[relative] = "src/assets/previews/" + name;
    } else if (/\.(mov|mp4|m4v|webm|ogv)$/i.test(entry.name)) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      const name = createHash("sha256").update(relative).digest("hex").slice(0, 20);
      const preview = path.join(videoOutput, name + ".mp4");
      const poster = path.join(videoOutput, name + ".jpg");
      if (await missing(preview)) {
        console.log(`Preparando vídeo: ${entry.name}`);
        const probe = JSON.parse(execFileSync("ffprobe", [
          "-v", "error", "-select_streams", "v:0",
          "-show_entries", "stream=color_transfer", "-of", "json", file,
        ], { encoding: "utf8" }));
        const hdr = ["arib-std-b67", "smpte2084"].includes(probe.streams[0]?.color_transfer);
        const filter = "scale=1080:1080:force_original_aspect_ratio=decrease:force_divisible_by=2" +
          (hdr ? ",zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" : "");
        const temporary = path.join(videoOutput, name + ".pending.mp4");
        try {
          execFileSync("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y", "-i", file,
          "-map", "0:v:0", "-map", "0:a:0?",
          "-vf", filter,
          "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-threads", "2",
          "-pix_fmt", "yuv420p", "-tag:v", "avc1",
          "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
          "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
          "-map_metadata", "-1", "-sn", "-dn", temporary,
          ], { stdio: "pipe" });
          await rename(temporary, preview);
        } finally {
          await rm(temporary, { force: true });
        }
      }
      if (await missing(poster)) execFileSync("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y", "-i", preview,
        "-frames:v", "1", "-q:v", "3", poster,
      ], { stdio: "pipe" });
      videos[relative] = {
        src: "src/assets/video-previews/" + name + ".mp4",
        poster: "src/assets/video-previews/" + name + ".jpg",
      };
    }
  }
}
await scan(path.join(root, "img"));
await writeFile(
  path.join(root, "src/data/media-previews.js"),
  "export const mediaPreviews = " + JSON.stringify(previews, null, 2) + ";\n",
);
console.log(`${Object.keys(previews).length} prévias JPEG geradas.`);
await writeFile(
  path.join(root, "src/data/video-previews.js"),
  "export const videoPreviews = " + JSON.stringify(videos, null, 2) + ";\n",
);
console.log(`${Object.keys(videos).length} prévias de vídeo MP4/H.264 prontas.`);
