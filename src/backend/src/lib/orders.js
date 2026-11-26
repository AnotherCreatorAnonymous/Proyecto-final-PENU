const fs = require('fs');
const path = require('path');
const { findProduct, getProducts } = require('./products');

const ORDER_STATUSES = ['PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO'];

const OPERATING_START_HOUR = 6; // 06:00
const OPERATING_END_HOUR = 22; // 22:00

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

const loadOrders = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const saveOrders = (list) => {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  } catch (err) {
    // En runtime serverless sin FS persistente, el estado volumetra en memoria.
  }
};

let orders = loadOrders();
let sequence = 1000;

const pad = (n) => String(n).padStart(2, '0');

const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseDateKey = (dateKey) => {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== (m || 1) - 1 ||
    date.getDate() !== (d || 1)
  ) {
    return null;
  }
  return date;
};

const buildSlotDate = (dateKey, time) => {
  const base = parseDateKey(dateKey);
  if (!base) return null;
  const [hh, mm] = String(time).split(':').map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0);
};

const getAvailableSlots = (dateKey) => {
  const base = parseDateKey(dateKey) || new Date();
  const key = toDateKey(base);
  const todayKey = toDateKey(new Date());
  const slots = [];
  for (let h = OPERATING_START_HOUR; h < OPERATING_END_HOUR; h += 1) {
    const time = `${pad(h)}:00`;
    const slot = buildSlotDate(key, time);
    if (key === todayKey && slot <= new Date()) continue;
    slots.push(time);
  }
  return slots;
};

const isValidPickupSlot = (dateKey, time, now = new Date()) => {
  const base = parseDateKey(dateKey);
  if (!base) return { valid: false, error: 'La fecha de recogida no es valida.' };
  const slot = buildSlotDate(dateKey, time);
  if (!slot) return { valid: false, error: 'La hora de recogida no es valida.' };
  const start = new Date(slot.getFullYear(), slot.getMonth(), slot.getDate(), OPERATING_START_HOUR, 0, 0, 0);
  const end = new Date(slot.getFullYear(), slot.getMonth(), slot.getDate(), OPERATING_END_HOUR, 0, 0, 0);
  if (slot < start || slot >= end) {
    return { valid: false, error: `La hora ${time} esta fuera del horario de atencion (06:00 - 22:00).` };
  }
  if (slot <= now) {
    return { valid: false, error: 'La hora de recogida debe ser posterior a la hora actual.' };
  }
  return { valid: true, value: time };
};

const calculateTotal = (items) => {
  const subtotal = (items || []).reduce((acc, item) => {
    const product = findProduct(item && item.productId);
    const qty = Number(item && item.qty) || 0;
    return acc + (product ? product.price * qty : 0);
  }, 0);
  const deliveryFee = 0; // Recogida en tienda, sin delivery.
  return { subtotal, deliveryFee, total: subtotal };
};

const createOrder = ({ items, customer, pickupDate, pickupTime, now = new Date() }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'El pedido no tiene productos.' };
  }
  const validItems = [];
  const seen = new Set();
  for (const item of items) {
    const product = findProduct(item && item.productId);
    const qty = Number(item && item.qty);
    if (!product) {
      return { error: `Producto no encontrado: ${item && item.productId}` };
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return { error: `Cantidad invalida para ${product.name}.` };
    }
    if (seen.has(product.id)) {
      return { error: `El producto ${product.name} debe enviarse una sola vez con su cantidad.` };
    }
    seen.add(product.id);
    validItems.push({ productId: product.id, name: product.name, price: product.price, qty });
  }
  const total = calculateTotal(validItems);
  const slot = isValidPickupSlot(pickupDate, pickupTime, now);
  if (!slot.valid) {
    return { error: slot.error };
  }
  const order = {
    id: `PB-${sequence}`,
    trackingCode: `TRK-${Date.now().toString(36).toUpperCase()}${sequence}`,
    customer: { name: (customer && customer.name) || 'Cliente', phone: (customer && customer.phone) || '' },
    items: validItems,
    subtotal: total.subtotal,
    deliveryFee: total.deliveryFee,
    total: total.total,
    pickupDate,
    pickupTime,
    status: 'PENDIENTE',
    createdAt: now.toISOString(),
  };
  sequence += 1;
  orders.push(order);
  saveOrders(orders);
  return { order };
};

const getOrders = () => orders;

module.exports = {
  ORDER_STATUSES,
  getAvailableSlots,
  isValidPickupSlot,
  calculateTotal,
  createOrder,
  getOrders,
};
