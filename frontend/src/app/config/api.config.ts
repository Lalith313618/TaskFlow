/**
 * Centralized API and Backend configuration.
 * Automatically switches between local development (localhost:5000)
 * and production deployed backend (https://taskflow-1lev.onrender.com).
 */
export function getBackendUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local');

    if (isLocal) {
      return `http://${hostname}:5000`;
    }
  }

  // Deployed Render backend URL
  return 'https://taskflow-1lev.onrender.com';
}
