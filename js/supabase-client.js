/* Arham Electronics ERP — Supabase browser configuration.
   This file intentionally uses the publishable/anon key only.
   NEVER place a Supabase service_role/secret key in this repository. */

(function () {
  const SUPABASE_URL = "https://fxmbktacmayzjfxanagh.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z_yaS1gA1t2ew_IB53vc5g_atNTpR-6";

  window.ARHAM_SUPABASE_CONFIG = Object.freeze({
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY
  });

  function setStatus(text, kind) {
    const old = document.getElementById("supabase-status");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "supabase-status";
    el.textContent = text;
    el.title = "Supabase backend connection status";
    el.style.cssText =
      "position:fixed;right:18px;bottom:18px;z-index:9999;padding:7px 10px;" +
      "border-radius:999px;font:600 11px Inter,system-ui,sans-serif;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.16);background:" +
      (kind === "ok" ? "#e7f7ee" : "#fceae8") + ";color:" +
      (kind === "ok" ? "#087443" : "#b42318") + ";";
    document.body.appendChild(el);
  }

  function init() {
    if (!window.supabase || !window.supabase.createClient) {
      setStatus("Supabase SDK not loaded", "error");
      return;
    }

    try {
      window.arhamSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );

      fetch(SUPABASE_URL + "/rest/v1/", {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          setStatus("Supabase connected", "ok");
          window.dispatchEvent(new CustomEvent("arham:supabase-ready", {
            detail: { url: SUPABASE_URL }
          }));
        })
        .catch(function (err) {
          console.warn("Supabase health check failed:", err);
          setStatus("Supabase configured — DB setup pending", "error");
          window.dispatchEvent(new CustomEvent("arham:supabase-ready", {
            detail: { url: SUPABASE_URL, healthCheck: false }
          }));
        });
    } catch (err) {
      console.error("Supabase initialization failed:", err);
      setStatus("Supabase initialization failed", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
