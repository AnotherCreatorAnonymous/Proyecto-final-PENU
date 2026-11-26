const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pan-de-la-casa-dev-secret-2026';

// Credenciales operativas (en producción se cargan desde variables de entorno / Atlas)
const USERS = [
    {
        username: process.env.STAFF_USER || 'mostrador',
        password: process.env.STAFF_PASSWORD || 'staff2026',
        role: 'STAFF',
        name: 'Empleado de Mostrador',
    },
    {
        username: process.env.ADMIN_USER || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin2026',
        role: 'ADMIN',
        name: 'Administrador Panadería',
    },
];

function authenticateUser(username, password) {
    const user = USERS.find((u) => u.username === username && u.password === password);
    if (!user) return null;

    const token = jwt.sign(
        { sub: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { token, role: user.role, name: user.name };
}

function requireRole(allowedRoles) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Token de autenticación requerido.' });
        }

        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (!allowedRoles.includes(payload.role)) {
                return res.status(403).json({ error: 'No tienes permisos para esta operación.' });
            }
            req.user = payload;
            return next();
        } catch (err) {
            return res.status(401).json({ error: 'Token inválido o expirado.' });
        }
    };
}

module.exports = { authenticateUser, requireRole };