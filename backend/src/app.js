const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const roomRoutes = require('./routes/roomRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { httpError } = require('./utils/httpError');
const { getAllowedOrigins } = require('./utils/cors');

const app = express();

app.use(
  cors({
    origin: getAllowedOrigins(),
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/rooms', roomRoutes);

app.use((req, res, next) => {
  next(httpError(404, 'Route not found'));
});

app.use(errorHandler);

module.exports = app;
