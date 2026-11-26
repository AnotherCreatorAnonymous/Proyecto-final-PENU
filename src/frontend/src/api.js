const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
};

export const fetchProducts = () => request('/api/catalogo');
export const fetchHorarios = (date) => request(`/api/horarios?date=${date}`);
export const fetchOrders = () => request('/api/pedidos');
export const createOrder = (payload) =>
  request('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
