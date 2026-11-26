import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createOrder, fetchHorarios, fetchOrders, fetchProducts } from './api';

const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const money = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value || 0);

export default function App() {
  const [view, setView] = useState('catalog');
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [pickupDate, setPickupDate] = useState(() => toDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [pickupTime, setPickupTime] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err) => {
        if (!cancelled) setProductsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cartOpen || !pickupDate) return;
    let cancelled = false;
    fetchHorarios(pickupDate)
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cartOpen, pickupDate]);

  const cartEntries = useMemo(
    () =>
      Object.entries(cart)
        .map((entry) => ({ product: products.find((p) => p.id === entry[0]), qty: Number(entry[1]) }))
        .filter((e) => e.product),
    [cart, products],
  );

  const cartCount = cartEntries.reduce((acc, e) => acc + e.qty, 0);
  const cartTotal = cartEntries.reduce((acc, e) => acc + e.product.price * e.qty, 0);

  const addToCart = (product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    setCartOpen(true);
  };

  const setQty = (productId, qty) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!pickupTime) return;
    setPlacing(true);
    try {
      const order = await createOrder({
        items: cartEntries.map((e) => ({ productId: e.product.id, qty: e.qty })),
        customer,
        pickupDate,
        pickupTime,
      });
      setOrderPlaced(order);
      setCart({});
      setCartOpen(false);
      setPickupTime('');
    } catch (err) {
      setOrderPlaced({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  const loadOrders = useCallback(() => {
    fetchOrders()
      .then(setOrders)
      .catch((err) => setOrdersError(err.message));
  }, []);

  useEffect(() => {
    if (view === 'admin') loadOrders();
  }, [view, loadOrders]);

  const renderCatalog = () => (
    <section>
      <h2>Menu del dia</h2>
      {productsError && <p className="error">No se pudo cargar el catalogo: {productsError}</p>}
      <div className="catalog-grid">
        {products.map((p) => (
          <div className="card" key={p.id}>
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <span className="emoji">{p.emoji}</span>
            )}
            <strong>{p.name}</strong>
            <span>{p.description}</span>
            <span className="price">{money(p.price)}</span>
            <button className="btn" onClick={() => addToCart(p)}>
              Agregar al pedido
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderCart = () => (
    <aside className="cart">
      <h2>Carrito ({cartCount})</h2>
      {cartEntries.length === 0 && <p>El carrito esta vacio.</p>}
      {cartEntries.map((e) => (
        <div className="cart-item" key={e.product.id}>
          <span>
            {e.product.emoji} {e.product.name} x {e.qty}
          </span>
          <span>
            {money(e.product.price * e.qty)}{' '}
            <button onClick={() => setQty(e.product.id, e.qty - 1)}>-</button>{' '}
            <button onClick={() => setQty(e.product.id, e.qty + 1)}>+</button>
          </span>
        </div>
      ))}
      <h3>Total: {money(cartTotal)}</h3>
      <form onSubmit={placeOrder}>
        <div className="row">
          <div>
            <label>Fecha de recogida</label>
            <input
              type="date"
              value={pickupDate}
              min={toDateKey(new Date())}
              onChange={(e) => {
                setPickupDate(e.target.value);
                setPickupTime('');
              }}
            />
          </div>
        </div>
        <div className="row">
          <div>
            <label>Hora de recogida</label>
            <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
              <option value="">Seleccionar hora</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <div>
            <label>Nombre</label>
            <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </div>
          <div>
            <label>Telefono</label>
            <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
        </div>
        <button className="btn" type="submit" disabled={placing || cartEntries.length === 0 || !pickupTime}>
          {placing ? 'Registrando...' : 'Registrar pedido'}
        </button>
      </form>
    </aside>
  );

  const renderAdmin = () => (
    <section>
      <h2>Panel de mostrador y administracion</h2>
      {ordersError && <p className="error">{ordersError}</p>}
      {orders.length === 0 && <p>Aun no hay pedidos registrados.</p>}
      {orders.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Recogida</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.trackingCode}
                  <br />
                  <small>{o.id}</small>
                </td>
                <td>
                  {o.customer && o.customer.name}
                  <br />
                  <small>{o.customer && o.customer.phone}</small>
                </td>
                <td>
                  {o.items && o.items.map((i) => `${i.qty} x ${i.name}`).join(', ')}
                </td>
                <td>{money(o.total)}</td>
                <td>
                  {o.pickupDate} {o.pickupTime}
                </td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
    <>
      <header>
        <h1>Panadería Pan de la Casa</h1>
        <nav>
          <button className={view === 'catalog' ? 'btn secondary' : 'btn'} onClick={() => setView('catalog')}>
            Catalogo
          </button>
          <button className={view === 'admin' ? 'btn secondary' : 'btn'} onClick={() => setView('admin')}>
            Admin
          </button>
        </nav>
      </header>
      <main>
        {view === 'catalog' ? renderCatalog() : renderAdmin()}
        {orderPlaced && orderPlaced.id && (
          <div className="success">
            <h3>¡Pedido registrado!</h3>
            <p>
              Orden <strong>{orderPlaced.trackingCode}</strong> por {orderPlaced.customer && orderPlaced.customer.name}. Hora de
              recogida: {orderPlaced.pickupDate} {orderPlaced.pickupTime}.
            </p>
            <button className="btn ghost" onClick={() => setOrderPlaced(null)}>
              Seguir catalogando
            </button>
          </div>
        )}
        {orderPlaced && orderPlaced.error && <div className="error">No se pudo registrar el pedido: {orderPlaced.error}</div>}
      </main>
      {cartOpen && renderCart()}
    </>
  );
}
