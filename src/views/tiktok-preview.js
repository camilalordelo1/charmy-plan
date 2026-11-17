import { esc } from "../utils/html.js";
import { postCaption } from "./instagram-feed.js";

const paths = {
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  comment:
    '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-5 3 1.7-6A8.5 8.5 0 1 1 21 11.5Z"/><circle cx="7" cy="11" r=".7"/><circle cx="12" cy="11" r=".7"/><circle cx="17" cy="11" r=".7"/>',
  bookmark: '<path d="M5 3h14v19l-7-5-7 5Z"/>',
  share: '<path d="m14 3 9 8-9 8v-5c-5 0-8 2-12 7 1-9 5-13 12-13Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 6 6"/>',
  home: '<path d="m2 11 10-9 10 9M5 9v13h5v-8h4v8h5V9"/>',
  people:
    '<circle cx="9" cy="7" r="4"/><path d="M1 22v-3a8 8 0 0 1 16 0v3M16 3a4 4 0 0 1 0 8M19 15a6 6 0 0 1 4 7"/>',
  inbox: '<path d="M3 3h18v18H3Z M3 14h5l2 3h4l2-3h5"/>',
  profile:
    '<circle cx="12" cy="7" r="4"/><path d="M3 22v-2a9 9 0 0 1 18 0v2Z"/>',
  play: '<path d="m8 4 13 8L8 20Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  volume:
    '<path d="M3 9h4l5-5v16l-5-5H3ZM16 7a7 7 0 0 1 0 10M19 4a11 11 0 0 1 0 16"/>',
  muted: '<path d="M3 9h4l5-5v16l-5-5H3ZM17 9l6 6M23 9l-6 6"/>',
};
const icon = (name, filled = false) =>
  `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
let selectedRatio = "landscape";

export function tiktokPreviewMarkup(post) {
  const caption = postCaption(post) || post.title;
  return `<div class="tt-chrome">
    <div class="tt-top" aria-hidden="true"><span>LIVE</span><span>Seguindo</span><span>Loja</span><strong>Para você</strong>${icon("search")}</div>
    <div class="tt-actions">
      <div class="tt-follow" aria-hidden="true"><img src="src/assets/charmy-logo.png" alt=""><span>+</span></div>
      <button type="button" data-tt-like aria-label="Curtir nesta simulação" aria-pressed="false">${icon("heart", true)}<small>Curtir</small></button>
      <div class="tt-action-static" aria-label="Comentários, simulação">${icon("comment", true)}<small>Comentários</small></div>
      <button type="button" data-tt-save aria-label="Salvar nesta simulação" aria-pressed="false">${icon("bookmark", true)}<small>Salvar</small></button>
      <div class="tt-action-static" aria-label="Compartilhar, simulação">${icon("share", true)}<small>Compartilhar</small></div>
      <div class="tt-record" aria-hidden="true"><img src="src/assets/charmy-logo.png" alt=""></div>
    </div>
    <div class="tt-copy"><strong>@charmyclube</strong><p>${esc(caption)}</p><small>♫ Som original · Charmy</small></div>
    <div class="tt-player"><button type="button" data-tt-play aria-label="Reproduzir vídeo">${icon("play", true)}</button><input type="range" data-tt-progress min="0" max="100" step="0.1" value="0" aria-label="Posição do vídeo"><button type="button" data-tt-mute aria-label="Silenciar vídeo">${icon("volume")}</button></div>
    <div class="tt-bottom" aria-hidden="true"><span>${icon("home", true)}<small>Início</small></span><span>${icon("people")}<small>Amigos</small></span><span class="tt-create">+</span><span>${icon("inbox")}<small>Mensagens</small></span><span>${icon("profile")}<small>Perfil</small></span></div>
  </div>`;
}

export function mountTiktokPreview(preview, stage, post) {
  const overlay = document.createElement("div");
  overlay.className = "tt-ui";
  overlay.innerHTML = tiktokPreviewMarkup(post);
  stage.append(overlay);
  const controls = document.createElement("div");
  controls.className = "tt-ratio-controls";
  controls.setAttribute("aria-label", "Proporção da prévia TikTok");
  controls.innerHTML =
    '<span>Proporção</span><button type="button" data-tt-ratio="landscape">16:9</button><button type="button" data-tt-ratio="portrait">9:16</button>';
  preview.prepend(controls);
  const setRatio = (ratio) => {
    selectedRatio = ratio;
    preview.dataset.ratio = ratio;
    preview
      .closest("#editor")
      ?.classList.toggle("tiktok-landscape", ratio === "landscape");
    controls
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.ttRatio === ratio),
        ),
      );
  };
  controls.querySelectorAll("button").forEach((button) => {
    button.onclick = () => setRatio(button.dataset.ttRatio);
  });
  setRatio(selectedRatio);
  for (const selector of ["[data-tt-like]", "[data-tt-save]"]) {
    const button = overlay.querySelector(selector);
    button.onclick = () => {
      const active = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(active));
    };
  }
  const video = stage.querySelector("video");
  const play = overlay.querySelector("[data-tt-play]");
  const mute = overlay.querySelector("[data-tt-mute]");
  const progress = overlay.querySelector("[data-tt-progress]");
  if (!video) {
    play.disabled = mute.disabled = progress.disabled = true;
    return;
  }
  video.controls = false;
  const refresh = () => {
    play.innerHTML = icon(
      video.paused ? "play" : "pause",
      !video.paused ? false : true,
    );
    play.setAttribute(
      "aria-label",
      video.paused ? "Reproduzir vídeo" : "Pausar vídeo",
    );
    mute.innerHTML = icon(video.muted ? "muted" : "volume");
    mute.setAttribute(
      "aria-label",
      video.muted ? "Ativar som" : "Silenciar vídeo",
    );
    progress.value =
      Number.isFinite(video.duration) && video.duration > 0
        ? (video.currentTime / video.duration) * 100
        : 0;
  };
  play.onclick = async () => {
    if (video.paused) {
      try {
        await video.play();
      } catch {
        play.setAttribute("aria-label", "Tentar reproduzir vídeo novamente");
      }
    } else video.pause();
    refresh();
  };
  mute.onclick = () => {
    video.muted = !video.muted;
    refresh();
  };
  progress.oninput = () => {
    if (Number.isFinite(video.duration))
      video.currentTime = (Number(progress.value) / 100) * video.duration;
  };
  for (const name of ["play", "pause", "ended", "timeupdate", "loadedmetadata"])
    video.addEventListener(name, refresh);
  refresh();
}
