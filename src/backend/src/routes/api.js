const express = require('express');
const { getProducts } = require('../lib/products');
const { getAvailableSlots, createOrder, getOrders } = require('../lib/orders');

const router = express.Router();

// Catálogo publico de productos activos (con imagenUrl desde el almacenamiento).
router.get('/catalogo', (req, res) => {
  res.json(getProducts());
});

// Horarios de recogida disponibles para una fecha.
router.get('/horarios', (req, res) => {
  const dateKey = req.query.date;
  res.json({ date: dateKey, slots: getAvailableSlots(dateKey) });
});

// Pedidos registrados.
router.get('/pedidos', (req, res) => {
  res.json(getOrders());
});

// Registro de un nuevo pedido.
router.post('/pedidos', (req, res) => {
  const result = createOrder({
    items: req.body.items,
    customer: req.body.customer,
    pickupDate: req.body.pickupDate,
    pickupTime: req.body.pickupTime,
  });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result.order);
});

module.exports = router;
