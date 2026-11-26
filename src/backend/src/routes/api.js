const express = require('express');
const { fetchProducts, addProduct, deleteProduct } = require('../lib/products');
const {
  getAvailableSlots,
  createOrderAsync,
  fetchOrders,
  updateOrderStatus,
} = require('../lib/orders');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

// Autenticación para Staff y Admin
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const session = authenticateUser(username, password);
  if (!session) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  return res.json(session);
});

// Catálogo público de productos activos
router.get('/catalogo', async (req, res) => {
  try {
    const products = await fetchProducts();
    return res.json(products);
  } catch (err) {
    return res.status(500).json({ error: 'Error consultando el catálogo.' });
  }
});

// Crear producto (Solo ADMIN)
router.post('/catalogo', requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await addProduct(req.body || {});
    if (result.error) return res.status(400).json({ error: result.error });
    return res.status(201).json(result.product);
  } catch (err) {
    return res.status(500).json({ error: 'Error creando producto.' });
  }
});

// Eliminar/inactivar producto (Solo ADMIN)
router.delete('/catalogo/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    if (result.error) return res.status(404).json({ error: result.error });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando producto.' });
  }
});

// Horarios de recogida disponibles
router.get('/horarios', (req, res) => {
  const dateKey = req.query.date;
  res.json({ date: dateKey, slots: getAvailableSlots(dateKey) });
});

// Pedidos registrados
router.get('/pedidos', async (req, res) => {
  try {
    const orders = await fetchOrders();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: 'Error consultando pedidos.' });
  }
});

// Registro de un nuevo pedido (Público)
router.post('/pedidos', async (req, res) => {
  try {
    const result = await createOrderAsync({
      items: req.body.items,
      customer: req.body.customer,
      pickupDate: req.body.pickupDate,
      pickupTime: req.body.pickupTime,
    });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(201).json(result.order);
  } catch (err) {
    return res.status(500).json({ error: 'Error registrando el pedido.' });
  }
});

// Actualizar estado de un pedido (STAFF y ADMIN)
router.patch('/pedidos/:id/estado', requireRole(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const result = await updateOrderStatus(req.params.id, req.body && req.body.status);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result.order);
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando estado del pedido.' });
  }
});

module.exports = router;