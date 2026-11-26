const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const getTomorrowKey = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const main = async () => {
  const productsRes = await fetch(`${BASE_URL}/api/catalogo`);
  if (productsRes.status !== 200) {
    throw new Error(`GET /api/catalogo respondio ${productsRes.status}`);
  }
  const products = await productsRes.json();
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('GET /api/catalogo no devolvio un catalogo valido');
  }

  const ordersRes = await fetch(`${BASE_URL}/api/pedidos`);
  if (ordersRes.status !== 200) {
    throw new Error(`GET /api/pedidos respondio ${ordersRes.status}`);
  }

  const orderRes = await fetch(`${BASE_URL}/api/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: products[0].id, qty: 2 }],
      customer: { name: 'Smoke Test', phone: '3000000000' },
      pickupDate: getTomorrowKey(),
      pickupTime: '12:00',
    }),
  });
  if (orderRes.status !== 201) {
    throw new Error(`POST /api/pedidos respondio ${orderRes.status}`);
  }

  console.log('SMOKE TEST OK: catalogo y pedidos responden correctamente');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`SMOKE TEST FALLO: ${err.message}`);
    process.exit(1);
  });
