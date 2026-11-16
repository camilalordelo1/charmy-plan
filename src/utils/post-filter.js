// Notion records can include more than one destination in their original schedule.
export function matchesPostCategory(post, category) {
  if (!category) return true;
  if (category === "Comunidade") return post.pillar === "Comunidade";
  if (post.channel === category) return true;
  const schedule =
    post.notes?.match(/^Programação original: (.+)$/m)?.[1] || "";
  if (category === "TikTok") return /tik\s*tok/i.test(schedule);
  if (category === "Instagram")
    return /instagram|reels?|stories|instories/i.test(schedule);
  return false;
}
