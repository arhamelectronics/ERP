/* ============================================================
   FILE 1 of 9  ->  js/core/normalize.js
   ARHAM ELECTRONICS ERP
   Maqsad: Product/Customer/Supplier naam ko MATCH karne ke liye
           normalize karna — BINA original value khoye.
   Reference: Section 6 (Product Matching), Section 7 (Party Matching)
   ============================================================ */

/**
 * normalizeKey(raw)
 * -----------------------------------------------------------
 * Matching key banata hai. ORIGINAL naam KABHI change nahi hota —
 * sirf ek comparison string deta hai. Original value display aur
 * traceability ke liye mehfooz rehti hai.
 */
export function normalizeKey(raw) {
  if (raw === null || raw === undefined) return "";

  let s = String(raw).toLowerCase();

  // 1) Roman-Urdu / common spellings ko canonical banayein
  const phonetic = [
    [/\bkh\b/g, "k"],
    [/\bph\b/g, "f"],
    [/\bgh\b/g, "g"],
    [/aa+/g, "a"],
    [/ee+/g, "i"],
    [/oo+/g, "u"],
    [/y(?=[aeiou])/g, "i"],
  ];
  for (const [re, rep] of phonetic) s = s.replace(re, rep);

  // 2) Punctuation -> space (digits aur letters bachao)
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // 3) Business noise words — sirf KEY se hatate hain, display name safe
  //    (Yeh "KHADIM ELECTRONICS" aur "KHADIM" ko match karne mein madad karte hain)
  const stopWords = [
    "electronics", "electronic", "electric", "elec", "elt",
    "traders", "trader", "trading", "enterprises", "enterprise",
    "and", "co", "company", "sons", "brothers", "bro",
    "pvt", "ltd", "limited", "inc", "corp", "store", "stores",
  ];
  const tokens = s.split(" ").filter((t) => t && !stopWords.includes(t));
  s = tokens.join(" ");

  // 4) Model / measure notation: "6 kv" -> "6kv", "150 ah" -> "150ah"
  s = s.replace(/\b(\d+)\s+(kv|kva|kw|w|ah|v|mm|inch|in|amp|a)\b/g, "$1$2");

  return s.trim();
}

/**
 * similarity(a, b)
 * -----------------------------------------------------------
 * 0..1 score. Sirf SUGGESTION ke liye. Auto-merge ke liye NAHI.
 */
export function similarity(a, b) {
  const A = normalizeKey(a), B = normalizeKey(b);
  if (!A || !B) return 0;
  if (A === B) return 1;

  const trigrams = (s) => {
    const out = new Set();
    const padded = `  ${s}  `;
    for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
    return out;
  };

  const tA = trigrams(A), tB = trigrams(B);
  let inter = 0;
  for (const g of tA) if (tB.has(g)) inter++;
  const dice = (2 * inter) / (tA.size + tB.size);

  const tokA = new Set(A.split(" ")), tokB = new Set(B.split(" "));
  let tokInter = 0;
  for (const t of tokA) if (tokB.has(t)) tokInter++;
  const tokenScore = (2 * tokInter) / (tokA.size + tokB.size);

  return Math.round((dice * 0.6 + tokenScore * 0.4) * 1000) / 1000;
}

/**
 * Match thresholds + classification
 * Section 7: "do not assume this automatically without sufficient evidence."
 */
export const MATCH_THRESHOLD = { AUTO: 0.92, REVIEW: 0.72 };

export function classifyMatch(a, b) {
  const score = similarity(a, b);
  if (score >= MATCH_THRESHOLD.AUTO) return { score, action: "auto-candidate" };
  if (score >= MATCH_THRESHOLD.REVIEW) return { score, action: "manual-review" };
  return { score, action: "keep-separate" };
}

/**
 * suggestMatches(rows, keyFn)
 * -----------------------------------------------------------
 * Ek list se duplicate candidates dhoondta hai.
 * Kuch bhi AUTO-MERGE nahi karta — sirf review list banata hai.
 */
export function suggestMatches(rows, keyFn = (r) => r.name) {
  const suggestions = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = keyFn(rows[i]), b = keyFn(rows[j]);
      const { score, action } = classifyMatch(a, b);
      if (action !== "keep-separate") {
        suggestions.push({
          left_id: rows[i].id ?? rows[i].sku ?? rows[i].code ?? i,
          left_name: a,
          right_id: rows[j].id ?? rows[j].sku ?? rows[j].code ?? j,
          right_name: b,
          score,
          action,
          requires_review: action === "manual-review",
        });
      }
    }
  }
  return suggestions.sort((x, y) => y.score - x.score);
}

/** Sahi XSS-safe escape (mojooda app.js ka bug fix) */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
  ));
}