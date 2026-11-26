require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'panaderia-api' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend Panadería Pan de la Casa corriendo en puerto ${PORT}`);
  });
}

module.exports = app;

// Handler para AWS Lambda (API Gateway HTTP API con Lambda proxy).
module.exports.handler = require('serverless-http')(app);
