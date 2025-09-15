// Local ghost tips to avoid Gemini rate limits
const LOCAL_TIPS = [
  "Chairs with lumbar support trend high for comfort 👻",
  "Most people split budget 40% desk, 30% chair, 30% rest",
  "Try switching to Casual to fit tight budgets",
  "Turn off Amazon-only to see more stores",
  "Standing desks boost productivity by 15% on average 👻",
  "Monitor arm saves desk space and improves ergonomics",
  "Cable management prevents the dreaded spaghetti setup 👻",
  "LED desk lamps reduce eye strain during long sessions"
];

export function getGhostTipsCached(): string[] {
  return LOCAL_TIPS.sort(() => Math.random() - 0.5).slice(0, 2);
}