require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { createSocketServer } = require('./socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    const io = createSocketServer(server);

    app.locals.io = io;

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error.message);
    process.exit(1);
  }
};

startServer();
