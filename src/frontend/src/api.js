const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const request = async (path, options = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
};

// Público (Cliente)
export const fetchProducts = () => request('/api/catalogo');
export const fetchHorarios = (date) => request(`/api/horarios?date=${date}`);
export const createOrder = (payload) =>
    request('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

// Autenticación (Staff / Admin)
export const loginUser = (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

// Staff y Admin
export const fetchOrders = () => request('/api/pedidos');
export const updateOrderStatus = (id, status, token) =>
    request(
        `/api/pedidos/${id}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        token
    );

// Solo Admin
export const createProduct = (payload, token) =>
    request(
        '/api/catalogo',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token
    );

export const deleteProduct = (id, token) =>
    request(
        `/api/catalogo/${id}`,
        {
          method: 'DELETE',
        },
        token
    );