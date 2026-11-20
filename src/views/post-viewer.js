import { coverUrl } from "./instagram-feed.js";
import { mountPostCarousel } from "./post-carousel.js";
import { isVideoUpload } from "../services/uploads.js";
import { postMedia } from "../data/post-media.js";
import { imagePreview } from "../utils/image-preview.js";

export function createPostViewer(onInfo) {
  const dialog = document.querySelector("#postViewer");
  const stage = dialog.querySelector("#postViewerMedia");
  const title = dialog.querySelector("#postViewerTitle");
  const previous = dialog.querySelector("#previousPostViewer");
  const next = dialog.querySelector("#nextPostViewer");
  const position = dialog.querySelector("#postViewerPosition");
  const progress = dialog.querySelector("#postViewerProgress");
  let posts = [], index = 0;

  function pause() { stage.querySelectorAll("video").forEach(video => video.pause()); }
  function show() {
    pause();
    stage.replaceChildren();
    const post = posts[index];
    const story = post.format === "Stories";
    const video = isVideoUpload(post);
    dialog.dataset.format = story || video ? "story" : "feed";
    title.textContent = post.title;
    previous.hidden = next.hidden = posts.length < 2;
    previous.disabled = index === 0;
    next.disabled = index === posts.length - 1;
    position.hidden = posts.length < 2;
    position.textContent = `${index + 1} de ${posts.length}`;
    progress.replaceChildren();
    progress.hidden = !story || posts.length < 2;
    if (story) for (let i = 0; i < posts.length; i++) {
      const segment = document.createElement("span");
      segment.className = i <= index ? "seen" : "";
      progress.append(segment);
    }
    if (!story && mountPostCarousel(stage, post)) return;
    const url = coverUrl(post);
    if (!url) {
      const empty = document.createElement("p");
      empty.className = "post-viewer-empty";
      empty.textContent = "Conteúdo a ser produzido pela loja.";
      stage.append(empty);
      return;
    }
    const element = document.createElement(video ? "video" : "img");
    if (video) {
      element.controls = true;
      element.playsInline = true;
      element.preload = "none";
      const media = postMedia(post);
      if (media) element.poster = imagePreview(media.cover);
      element.setAttribute("aria-label", post.title);
    } else {
      element.alt = post.title;
      element.decoding = "async";
    }
    element.src = url;
    stage.append(element);
  }
  function move(offset) {
    const target = index + offset;
    if (target < 0 || target >= posts.length) return;
    index = target;
    show();
  }
  dialog.querySelector("#closePostViewer").onclick = () => dialog.close();
  dialog.querySelector("#postViewerInfo").onclick = () => {
    const post = posts[index];
    dialog.close();
    onInfo(post);
  };
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", event => {
    if (event.target.closest(".post-carousel")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  dialog.addEventListener("close", () => {
    pause();
    stage.replaceChildren();
    document.body.classList.remove("post-viewer-open");
  });
  return {
    open(post, related = []) {
      if (!post) return;
      posts = related.some(item => item.id === post.id) ? related : [post];
      index = posts.findIndex(item => item.id === post.id);
      show();
      document.body.classList.add("post-viewer-open");
      if (!dialog.open) dialog.showModal();
    },
  };
}
