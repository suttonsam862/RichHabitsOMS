/**
 * Minimal HMR stability fix
 */

// Simple HMR connection stability
if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    // Clear any pending auth checks that might interfere with HMR
    const authTimeouts = (window as any)._authTimeouts || [];
    authTimeouts.forEach((id: number) => clearTimeout(id));
    (window as any)._authTimeouts = [];
  });
}