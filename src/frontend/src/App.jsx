import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOrder,
  createProduct,
  deleteProduct,
  fetchHorarios,
  fetchOrders,
  fetchProducts,
  loginUser,
  updateOrderStatus,
} from './api';

const ORDER_STATUSES = ['PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO'];

const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const money = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value || 0);

export default function App() {
  // Navegación entre las 3 vistas: 'catalog' (Cliente), 'staff' (Mostrador), 'admin' (Administrador)
  const [view, setView] = useState('catalog');

  // Estado de sesión JWT para Staff y Admin
  const [auth, setAuth] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pdc_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Estado de catálogo y carrito (Cliente)
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

  // Pedidos realizados por el cliente en la sesión actual
  const [sessionOrders, setSessionOrders] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pdc_session_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Estado de pedidos (Vista Staff)
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState('');

  // Estado de formulario de nuevo producto (Vista Admin)
  const [newProd, setNewProd] = useState({
    name: '',
    description: '',
    price: '',
    category: 'panes',
    imageUrl: '',
    emoji: '🥖',
  });
  const [adminMsg, setAdminMsg] = useState({ type: '', text: '' });

  const loadProducts = useCallback(() => {
    fetchProducts()
        .then((data) => {
          setProducts(data);
          setProductsError('');
        })
        .catch((err) => setProductsError(err.message));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      setSessionOrders((prev) => {
        const updated = [order, ...prev];
        sessionStorage.setItem('pdc_session_orders', JSON.stringify(updated));
        return updated;
      });
      setCart({});
      setCartOpen(false);
      setPickupTime('');
    } catch (err) {
      setOrderPlaced({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  // Refresca el estado de los pedidos de la sesión desde el backend
  const refreshSessionOrders = async () => {
    if (sessionOrders.length === 0) return;
    try {
      const allOrders = await fetchOrders();
      const updated = sessionOrders.map((so) => {
        const match = allOrders.find((ao) => ao.id === so.id);
        return match || so;
      });
      setSessionOrders(updated);
      sessionStorage.setItem('pdc_session_orders', JSON.stringify(updated));
    } catch {
      // Mantiene el estado local si falla la consulta
    }
  };

  const loadOrders = useCallback(() => {
    fetchOrders()
        .then((data) => {
          setOrders(data);
          setOrdersError('');
        })
        .catch((err) => setOrdersError(err.message));
  }, []);

  useEffect(() => {
    if (view === 'staff' && auth) loadOrders();
    if (view === 'admin' && auth?.role === 'ADMIN') loadProducts();
  }, [view, auth, loadOrders, loadProducts]);

  // Manejadores de Autenticación
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const session = await loginUser(loginForm.username, loginForm.password);
      setAuth(session);
      sessionStorage.setItem('pdc_auth', JSON.stringify(session));
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    sessionStorage.removeItem('pdc_auth');
    setView('catalog');
  };

  // Manejadores Vista Staff
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const updated = await updateOrderStatus(orderId, newStatus, auth.token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setOrdersError(err.message);
    }
  };

  // Manejadores Vista Admin
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setAdminMsg({ type: '', text: '' });
    try {
      await createProduct(
          {
            ...newProd,
            price: Number(newProd.price),
          },
          auth.token,
      );
      setAdminMsg({ type: 'success', text: `Producto "${newProd.name}" agregado al catálogo.` });
      setNewProd({ name: '', description: '', price: '', category: 'panes', imageUrl: '', emoji: '🥖' });
      loadProducts();
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`¿Retirar "${product.name}" del catálogo activo?`)) return;
    setAdminMsg({ type: '', text: '' });
    try {
      await deleteProduct(product.id, auth.token);
      setAdminMsg({ type: 'success', text: `Producto "${product.name}" eliminado del catálogo.` });
      loadProducts();
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.message });
    }
  };

  // Formulario de Login para vistas protegidas
  const renderLoginBox = (requiredRoleLabel) => (
      <section style={{ maxWidth: 420, margin: '2rem auto' }}>
        <h2>Acceso restringido — {requiredRoleLabel}</h2>
        <p>Ingresa tus credenciales operativas para continuar.</p>
        {loginError && <p className="error">{loginError}</p>}
        <form onSubmit={handleLogin}>
          <div className="row">
            <div style={{ width: '100%' }}>
              <label>Usuario</label>
              <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="mostrador o admin"
                  required
              />
            </div>
          </div>
          <div className="row">
            <div style={{ width: '100%' }}>
              <label>Contraseña</label>
              <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
              />
            </div>
          </div>
          <button className="btn" type="submit">
            Iniciar sesión
          </button>
        </form>
      </section>
  );

  // VISTA 1: CLIENTE (Pública, sin login + resumen de pedidos en la sesión)
  const renderCatalog = () => (
      <section>
        <h2>Menú del día</h2>
        {productsError && <p className="error">No se pudo cargar el catálogo: {productsError}</p>}
        <div className="catalog-grid">
          {products.map((p) => (
              <div className="card" key={p.id}>
                {p.imageUrl ? (
                    <img
                        src={p.imageUrl}
                        alt={p.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }}
                    />
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

        {sessionOrders.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Mis pedidos en esta sesión ({sessionOrders.length})</h2>
                <button className="btn ghost" onClick={refreshSessionOrders}>
                  Actualizar estado
                </button>
              </div>
              <table>
                <thead>
                <tr>
                  <th>Código de Orden</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Recogida</th>
                  <th>Estado</th>
                </tr>
                </thead>
                <tbody>
                {sessionOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.trackingCode}</strong>
                        <br />
                        <small>{o.id}</small>
                      </td>
                      <td>{o.items && o.items.map((i) => `${i.qty} x ${i.name}`).join(', ')}</td>
                      <td>{money(o.total)}</td>
                      <td>
                        {o.pickupDate} <strong>{o.pickupTime}</strong>
                      </td>
                      <td>
                        <strong>{o.status}</strong>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
        )}
      </section>
  );

  const renderCart = () => (
      <aside className="cart">
        <h2>Carrito ({cartCount})</h2>
        {cartEntries.length === 0 && <p>El carrito está vacío.</p>}
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
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
            </div>
            <div>
              <label>Teléfono</label>
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} required />
            </div>
          </div>
          <button className="btn" type="submit" disabled={placing || cartEntries.length === 0 || !pickupTime}>
            {placing ? 'Registrando...' : 'Registrar pedido'}
          </button>
        </form>
      </aside>
  );

  // VISTA 2: STAFF / MOSTRADOR (Actualización de estados de pedidos)
  const renderStaff = () => {
    if (!auth) return renderLoginBox('Mostrador (STAFF)');

    return (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Panel de Mostrador — Gestión de Pedidos</h2>
            <button className="btn ghost" onClick={loadOrders}>
              Actualizar lista
            </button>
          </div>
          {ordersError && <p className="error">{ordersError}</p>}
          {orders.length === 0 && <p>Aún no hay pedidos registrados.</p>}
          {orders.length > 0 && (
              <table>
                <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Recogida</th>
                  <th>Estado Actual</th>
                  <th>Cambiar Estado</th>
                </tr>
                </thead>
                <tbody>
                {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.trackingCode}</strong>
                        <br />
                        <small>{o.id}</small>
                      </td>
                      <td>
                        {o.customer && o.customer.name}
                        <br />
                        <small>{o.customer && o.customer.phone}</small>
                      </td>
                      <td>{o.items && o.items.map((i) => `${i.qty} x ${i.name}`).join(', ')}</td>
                      <td>{money(o.total)}</td>
                      <td>
                        {o.pickupDate} <strong>{o.pickupTime}</strong>
                      </td>
                      <td>
                        <strong>{o.status}</strong>
                      </td>
                      <td>
                        <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)}>
                          {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </section>
    );
  };

  // VISTA 3: ADMINISTRADOR (Añadir o eliminar productos del catálogo)
  const renderAdmin = () => {
    if (!auth || auth.role !== 'ADMIN') {
      return (
          <>
            {auth && auth.role !== 'ADMIN' && (
                <p className="error">Tu sesión actual ({auth.role}) no tiene permisos de Administrador. Inicia sesión como ADMIN.</p>
            )}
            {renderLoginBox('Administrador (ADMIN)')}
          </>
      );
    }

    return (
        <section>
          <h2>Panel de Administración — Catálogo de Productos</h2>
          {adminMsg.text && <p className={adminMsg.type === 'error' ? 'error' : 'success'}>{adminMsg.text}</p>}

          <form onSubmit={handleCreateProduct} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>Añadir nuevo producto</h3>
            <div className="row">
              <div>
                <label>Nombre del producto</label>
                <input
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder="Ej. Rosca de Bocadillo"
                    required
                />
              </div>
              <div>
                <label>Precio (COP)</label>
                <input
                    type="number"
                    min="100"
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    placeholder="Ej. 3500"
                    required
                />
              </div>
              <div>
                <label>Categoría</label>
                <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}>
                  <option value="panes">Panes</option>
                  <option value="rebanadas">Rebanadas / Tortas</option>
                  <option value="dulces">Dulces</option>
                  <option value="empanadas">Empanadas</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 2 }}>
                <label>Descripción</label>
                <input
                    value={newProd.description}
                    onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                    placeholder="Descripción breve para el cliente"
                />
              </div>
              <div style={{ flex: 2 }}>
                <label>URL de imagen (Azure Blob Storage)</label>
                <input
                    value={newProd.imageUrl}
                    onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                    placeholder="https://stpandelacasa2026.blob.core.windows.net/catalogo-img/..."
                />
              </div>
            </div>
            <button className="btn" type="submit">
              + Agregar producto al catálogo
            </button>
          </form>

          <h3>Productos activos ({products.length})</h3>
          <table>
            <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Acción</th>
            </tr>
            </thead>
            <tbody>
            {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <small>{p.id}</small>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.description}</td>
                  <td>{money(p.price)}</td>
                  <td>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#b91c1c', color: '#ffffff', padding: '6px 12px' }}
                        onClick={() => handleDeleteProduct(p)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </section>
    );
  };

  return (
      <>
        <header>
          <h1>Panadería Pan de la Casa</h1>
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className={view === 'catalog' ? 'btn secondary' : 'btn'} onClick={() => setView('catalog')}>
              Catálogo (Cliente)
            </button>
            <button className={view === 'staff' ? 'btn secondary' : 'btn'} onClick={() => setView('staff')}>
              Mostrador (Staff)
            </button>
            <button className={view === 'admin' ? 'btn secondary' : 'btn'} onClick={() => setView('admin')}>
              Admin
            </button>
            {auth && (
                <button className="btn ghost" onClick={handleLogout} title={`Sesión: ${auth.name}`}>
                  Salir ({auth.role})
                </button>
            )}
          </nav>
        </header>
        <main>
          {view === 'catalog' && renderCatalog()}
          {view === 'staff' && renderStaff()}
          {view === 'admin' && renderAdmin()}

          {orderPlaced && orderPlaced.id && (
              <div className="success">
                <h3>¡Pedido registrado!</h3>
                <p>
                  Orden <strong>{orderPlaced.trackingCode}</strong> por {orderPlaced.customer && orderPlaced.customer.name}. Hora de
                  recogida: {orderPlaced.pickupDate} {orderPlaced.pickupTime}.
                </p>
                <button className="btn ghost" onClick={() => setOrderPlaced(null)}>
                  Seguir comprando
                </button>
              </div>
          )}
          {orderPlaced && orderPlaced.error && <div className="error">No se pudo registrar el pedido: {orderPlaced.error}</div>}
        </main>
        {view === 'catalog' && cartOpen && renderCart()}
      </>
  );
}