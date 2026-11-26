const { getDb } = require('./db');

const initialProducts = [
  {
    id: 'croissant-almendras',
    name: 'Croissant Almendras',
    description: 'Croissant hojaldrado con almendras.',
    price: 6500,
    emoji: '🥐',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/croissant.jpg',
    category: 'panes',
    active: true,
  },
  {
    id: 'pan-de-bono',
    name: 'Pan de Bono',
    description: 'Pan artesanal horneado a mano con queso campesino.',
    price: 1500,
    emoji: '🍞',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/pan_de_bono.jpg',
    category: 'panes',
    active: true,
  },
  {
    id: 'pandes-de-yuca',
    name: 'Pan de Yuca',
    description: 'Crujiente por fuera y suave por dentro.',
    price: 2000,
    emoji: '🥟',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/pan_de_yuca.jpg',
    category: 'panes',
    active: true,
  },
  {
    id: 'pan-de-chocolate',
    name: 'Pan de Chocolate',
    description: 'Pan dulce con trozos de chocolate amargo.',
    price: 3200,
    emoji: '🍫',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/pan_de_chocolate.jpg',
    category: 'panes',
    active: true,
  },
  {
    id: 'almojabanas',
    name: 'Almojábanas',
    description: 'Almojábana tradicional de queso y cuajada.',
    price: 1400,
    emoji: '🫓',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/almojabanas.jpg',
    category: 'panes',
    active: true,
  },
  {
    id: 'galletas-de-chispa',
    name: 'Galletas de Chispa',
    description: 'Galletas caseras con chispa de vainilla y chocolate.',
    price: 1200,
    emoji: '🍪',
    imageUrl: 'https://stpandelacasa.blob.core.windows.net/catalogo-img/galletas_de_chispa.jpg',
    category: 'dulces',
    active: true,
  },
];

let memoryProducts = [...initialProducts];

// Funciones síncronas (compatibilidad con tests unitarios)
const findProduct = (id) =>
    memoryProducts.find((product) => product.id === id && product.active);

const getProducts = () => memoryProducts.filter((product) => product.active);

// Funciones asíncronas con MongoDB Atlas
async function fetchProducts() {
  const db = await getDb();
  if (!db) return getProducts();

  const col = db.collection('productos');
  const count = await col.countDocuments();
  if (count === 0) {
    await col.insertMany(initialProducts);
  }
  const list = await col.find({ active: true }).project({ _id: 0 }).toArray();
  memoryProducts = list;
  return list;
}

async function addProduct({ name, description, price, category, imageUrl, emoji }) {
  if (!name || !price || Number(price) <= 0) {
    return { error: 'Nombre y precio mayor a 0 son obligatorios.' };
  }

  const slug = String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const newProd = {
    id: `${slug}-${Date.now().toString(36).slice(-4)}`,
    name: String(name).trim(),
    description: String(description || 'Producto artesanal recién horneado.').trim(),
    price: Number(price),
    emoji: emoji || '🥖',
    imageUrl: imageUrl || 'https://stpandelacasa2026.blob.core.windows.net/catalogo-img/default.webp',
    category: String(category || 'panes').toLowerCase(),
    active: true,
  };

  const db = await getDb();
  if (db) {
    await db.collection('productos').insertOne({ ...newProd });
  }
  memoryProducts.push(newProd);
  return { product: newProd };
}

async function deleteProduct(id) {
  const db = await getDb();
  if (db) {
    const res = await db.collection('productos').updateOne(
        { id },
        { $set: { active: false } }
    );
    if (res.matchedCount === 0) return { error: 'Producto no encontrado.' };
  } else {
    const prod = memoryProducts.find((p) => p.id === id);
    if (!prod) return { error: 'Producto no encontrado.' };
    prod.active = false;
  }
  memoryProducts = memoryProducts.filter((p) => p.id !== id);
  return { deleted: true, id };
}

module.exports = {
  products: memoryProducts,
  getProducts,
  findProduct,
  fetchProducts,
  addProduct,
  deleteProduct,
};
