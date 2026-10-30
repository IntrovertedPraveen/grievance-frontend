const API_URL =
    import.meta.env.VITE_API_URL;
if (!API_URL) {
    throw new Error('VITE_API_URL is not set');
}
const BASE = `${API_URL}/api`;

export async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(BASE + path, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error('Cannot reach the server. Please try again in a few seconds.');
    }

    if (res.status === 401 && auth) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    if (!res.ok) {
        const message = data && data.message;
        if (res.status === 403) throw new Error(message || 'You do not have permission to do that.');
        throw new Error(message || `Request failed (${res.status})`);
    }
    return data;
}

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';