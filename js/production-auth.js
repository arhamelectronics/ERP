/* Arham ERP — production authentication/session layer.
   Uses Supabase Auth only; no service-role/secret key. */
(function () {
  // Hide the ERP shell immediately; it must never render before Supabase session verification.
  document.documentElement.dataset.arhamAuthPending = "1";
  document.addEventListener("DOMContentLoaded", function(){
    const app=document.getElementById("app");
    if(app) app.style.visibility="hidden";
  }, {once:true});
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function showLogin() {
    const app = document.getElementById("app");
    if (!app) return;
    app.style.visibility = "visible";
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-box">
          <div class="brand-mark">AE</div>
          <h2>Arham Electronics</h2>
          <p>ERP secure sign-in</p>
          <form id="arham-login-form">
            <div class="form-row"><label>Email</label><input id="arham-login-email" type="email" required autocomplete="username" placeholder="admin@example.com"></div>
            <div class="form-row"><label>Password</label><input id="arham-login-password" type="password" required autocomplete="current-password" placeholder="Password"></div>
            <button class="btn amber" type="submit" style="width:100%;justify-content:center">Sign in</button>
            <div id="arham-login-error" class="hint" style="color:var(--red);min-height:18px;margin-top:10px"></div>
          </form>
        </div>
      </div>`;
    document.getElementById("arham-login-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      const error = document.getElementById("arham-login-error");
      error.textContent = "Signing in…";
      const { error: err } = await window.arhamSupabase.auth.signInWithPassword({
        email: document.getElementById("arham-login-email").value.trim(),
        password: document.getElementById("arham-login-password").value
      });
      if (err) error.textContent = err.message;
    });
  }

  async function loadProfile(user) {
    const { data, error } = await window.arhamSupabase
      .from("profiles").select("id,email,full_name,role,active").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("User profile was not created. Check the profiles trigger in Supabase.");
    if (!data.active) throw new Error("This user account is inactive.");
    window.ARHAM_CURRENT_PROFILE = data;
    return data;
  }

  async function boot(user) {
    const app = document.getElementById("app");
    try {
      const profile = await loadProfile(user);
      document.documentElement.dataset.arhamBackend = "supabase";
      window.dispatchEvent(new CustomEvent("arham:authenticated", { detail: { user, profile } }));
      if (typeof window.shell === "function") window.shell();
      if (app) app.style.visibility = "visible";
      document.documentElement.dataset.arhamAuthPending = "0";
    } catch (e) {
      console.error(e);
      await window.arhamSupabase.auth.signOut();
      showLogin();
      document.documentElement.dataset.arhamAuthPending = "0";
      const el = document.querySelector("#arham-login-error");
      if (el) el.textContent = e.message || "Could not load your ERP profile.";
    }
  }

  ready(async function () {
    if (!window.arhamSupabase) return;
    const { data: { session } } = await window.arhamSupabase.auth.getSession();
    if (session && session.user) await boot(session.user);
    else showLogin();

    window.arhamSupabase.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_IN" && session) boot(session.user);
      if (event === "SIGNED_OUT") showLogin();
    });
  });

  window.arhamLogout = async function () {
    await window.arhamSupabase.auth.signOut();
  };
})();