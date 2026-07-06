const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const readSession = () => JSON.parse(localStorage.getItem('papertrade_session') || 'null');
const saveSession = (session) => {
  if (session) localStorage.setItem('papertrade_session', JSON.stringify(session));
  else localStorage.removeItem('papertrade_session');
};

let refreshing = null;

async function refreshSession() {
  const session = readSession();
  if (!session?.refreshToken) throw new Error('Your session has expired');

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const result = await response.json();
  if (!response.ok) {
    saveSession(null);
    throw new Error(result.message || 'Your session has expired');
  }
  saveSession(result.data);
  return result.data;
}

export async function api(path, options = {}, retry = true) {
  const session = readSession();
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && retry && session?.refreshToken && !path.includes('/auth/')) {
    refreshing ||= refreshSession().finally(() => { refreshing = null; });
    await refreshing;
    return api(path, options, false);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || 'Something went wrong');
  return result.data;
}

export { API_URL, readSession, saveSession };
