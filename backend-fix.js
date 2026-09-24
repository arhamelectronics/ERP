/* Arham ERP backend bridge
   Keeps the existing frontend untouched and redirects its old Vercel
   endpoint to the live Google Apps Script backend.
*/
(function () {
  const ERP_BACKEND = "https://script.google.com/macros/s/AKfycbyi8CaMtMxV7Prf5Dexoy03ao8v2XApxbw2rLK2hTlvYS_j9vV3Y7JbW-GrAS3XYUvAtA/exec";
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    try {
      const originalUrl = typeof input === "string" ? input : input.url;
      if (originalUrl && originalUrl.indexOf("erp-three-weld.vercel.app/api/erp") !== -1) {
        const rewritten = originalUrl.replace(
          "https://erp-three-weld.vercel.app/api/erp",
          ERP_BACKEND
        );
        if (typeof input === "string") {
          input = rewritten;
        } else {
          input = new Request(rewritten, input);
        }
      }
    } catch (e) {
      console.warn("ERP backend bridge warning:", e);
    }
    return originalFetch(input, init);
  };
})();
