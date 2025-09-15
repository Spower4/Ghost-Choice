// Build focused search queries from concrete product needs
const AMAZON_TLD: Record<string, string> = { 
  US: "com", 
  IN: "in", 
  UK: "co.uk", 
  EU: "de", 
  CA: "ca", 
  AU: "com.au" 
};

export function buildSearchQuery(
  need: { name: string; specs?: Record<string, any> },
  budget?: number, 
  region = "US", 
  amazonOnly = false
): string {
  const parts: string[] = [];
  
  // Don't add site restriction here - handled in API route with merchant filter
  
  parts.push(need.name);
  
  if (need.specs) {
    for (const v of Object.values(need.specs)) {
      if (typeof v === "string" && v.length <= 20) parts.push(v);
      if (typeof v === "number" && v > 0) parts.push(String(v));
      if (v === true) continue;
    }
  }
  
  if (budget) {
    parts.push(`under $${Math.round(budget)}`);
  }
  
  return parts.join(" ");
}