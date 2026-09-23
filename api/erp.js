const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyi8CaMtMxV7Prf5Dexoy03ao8v2XApxbw2rLK2hTlvYS_jv9V3Y7JbW-GrAS3XYUvAtA/exec";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    const incoming = new URL(req.url, "https://erp-proxy.local");
    const target = new URL(APPS_SCRIPT_URL);

    incoming.searchParams.forEach((value, key) => {
      target.searchParams.append(key, value);
    });

    const init = { method: req.method || "GET", redirect: "follow" };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      init.body = body;
      init.headers = { "Content-Type": req.headers["content-type"] || "application/json" };
    }

    const upstream = await fetch(target.toString(), init);
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    const body = await upstream.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", contentType);
    return res.status(upstream.status).send(body);
  } catch (error) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(502).json({
      ok: false,
      error: "ERP proxy failed",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
