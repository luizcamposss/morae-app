// Remembers the page the user was on before leaving for Mercado Pago, so the return
// pages can send them back there. sessionStorage survives the round trip in the same tab.
const CHECKOUT_RETURN_PATH_KEY = "morae.mercadopago.checkoutReturnPath";
const OAUTH_RETURN_PATH_KEY = "morae.mercadopago.oauthReturnPath";

function save(key: string) {
  try {
    sessionStorage.setItem(key, window.location.pathname);
  } catch {
    // Storage unavailable: the return page falls back to a route based on the user's role.
  }
}

// Read-only on purpose: React StrictMode calls state initializers twice in dev. The value
// is overwritten every time the user leaves for Mercado Pago, so it never goes stale.
function read(key: string) {
  try {
    const path = sessionStorage.getItem(key);
    return path?.startsWith("/") ? path : null;
  } catch {
    return null;
  }
}

export const saveCheckoutReturnPath = () => save(CHECKOUT_RETURN_PATH_KEY);
export const getCheckoutReturnPath = () => read(CHECKOUT_RETURN_PATH_KEY);
export const saveOAuthReturnPath = () => save(OAUTH_RETURN_PATH_KEY);
export const getOAuthReturnPath = () => read(OAUTH_RETURN_PATH_KEY);
