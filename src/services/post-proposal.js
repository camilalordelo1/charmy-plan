import { proposedCover } from "../data/proposed-covers.js";
import { postMedia } from "../data/post-media.js";
import { videoPreviews } from "../data/video-previews.js";
import { uploaded, isVideoUpload } from "./uploads.js";

export function needsProduction(post) {
  return Boolean(post.format === "Reels" && proposedCover(post) && !isVideoUpload(post) && !videoPreviews[post.cover]);
}

// A suggested image never replaces an assigned video, upload or selected cover.
export function postProposal(post) {
  return needsProduction(post) && !postMedia(post) && !uploaded(post) && !post.cover
    ? proposedCover(post) : null;
}
