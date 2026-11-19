import { videoPreviews } from "./video-previews.js";
const lookVideo = videoPreviews["img/IMG_6546.mp4"];
export function postMedia(post) {
  return [post.source, post.id].includes("charmy-notion-dec-09") ? {
    ...lookVideo,
    cover: "src/assets/posts/monte-um-look/01-capa.png",
    original: "img/IMG_6546.mp4",
  } : null;
}
