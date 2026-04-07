// lib/fetchInterceptor.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Store the original fetch
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  let [resource, config] = args;

  // We only want to intercept calls to our own API.
  if (typeof resource === 'string' && resource.startsWith(API_BASE)) {
    // Grab the token from localStorage
    const token = localStorage.getItem("token");

    if (token) {
      // Ensure config exists
      config = config || {};
      
      // Ensure headers exists
      const headers = new Headers(config.headers || {});
      
      // Add the Authorization header
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      // Still send credentials for any remaining cookie reliance
      // (some legacy endpoints might still require it during migration)
      config.credentials = config.credentials || "include";

      // Assign modified headers back to config
      config.headers = headers;
    }
  }

  // Proceed with the request
  return originalFetch(resource, config);
};
