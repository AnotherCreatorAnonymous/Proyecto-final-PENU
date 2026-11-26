const { getProducts, findProduct } = require('../../src/backend/src/lib/products');
const {
  getAvailableSlots,
  isValidPickupSlot,
  calculateTotal,
  createOrder,
} = require('../../src/backend/src/lib/orders');

const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

describe('Catalogo de productos', () => {
  it('devuelve un catalogo activo con productos y sus imagenes', () => {
    const products = getProducts();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    products.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('price');
      expect(p.price).toBeGreaterThan(0);
      expect(p.imageUrl).toBeTruthy();
      expect(p.category).toBeTruthy();
    });
  });

  it('busca un producto activo por id', () => {
    const product = findProduct('croissant-almendras');
    expect(product).toBeDefined();
    expect(product.name).toBe('Croissant Almendras');
    expect(findProduct('no-existe')).toBeUndefined();
  });
});

describe('Logica de pedidos', () => {
  it('calcula el total de un pedido con varias lineas', () => {
    const total = calculateTotal([
      { productId: 'pan-de-bono', qty: 2 },
      { productId: 'galletas-de-chispa', qty: 3 },
    ]);
    expect(total.subtotal).toBe(1500 * 2 + 1200 * 3);
    expect(total.deliveryFee).toBe(0);
    expect(total.total).toBe(total.subtotal);
  });

  it('genera los slots disponibles dentro del horario 06:00 - 22:00', () => {
    const slots = getAvailableSlots('2099-12-25');
    expect(slots.length).toBe(16);
    expect(slots[0]).toBe('06:00');
    expect(slots[slots.length - 1]).toBe('21:00');
  });

  it('rechaza horarios fuera del horario operativo', () => {
    expect(isValidPickupSlot('2099-12-25', '05:00').valid).toBe(false);
    expect(isValidPickupSlot('2099-12-25', '22:00').valid).toBe(false);
  });

  it('rechaza horarios pasados', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 60 * 1000);
    const pastTime = `${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`;
    expect(isValidPickupSlot(toDateKey(now), pastTime, now).valid).toBe(false);
  });

  it('acepta una hora futura del dia de la recogida', () => {
    expect(isValidPickupSlot('2099-12-25', '12:00').valid).toBe(true);
  });

  it('registra un pedido con tracking code, estado PENDIENTE y total calculado', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const dateKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    const result = createOrder({
      items: [{ productId: 'pan-de-bono', qty: 2 }],
      customer: { name: 'Ana', phone: '3001234567' },
      pickupDate: dateKey,
      pickupTime: '12:00',
    });
    expect(result.error).toBeUndefined();
    expect(result.order.status).toBe('PENDIENTE');
    expect(result.order.trackingCode).toMatch(/^TRK-/);
    expect(result.order.total).toBe(3000);
    expect(result.order.items[0].qty).toBe(2);
  });

  it('rechaza un pedido sin items', () => {
    const result = createOrder({ items: [], customer: {}, pickupDate: '2099-12-25', pickupTime: '12:00' });
    expect(result.error).toBeDefined();
  });
});
