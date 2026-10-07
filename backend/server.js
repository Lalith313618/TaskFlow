const http = require('http');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const errorHandler = require("./middleware/errorHandler");
const { initSocket } = require('./socket');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use("/api/auth", authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TaskFlow API is running'
  });
});

app.use(errorHandler);

const DEFAULT_PORT = 5000;
const configuredPort = Number.parseInt(process.env.PORT, 10);
const START_PORT = Number.isNaN(configuredPort) ? DEFAULT_PORT : configuredPort;

function listenOnAvailablePort(port) {
  const server = http.createServer(app);
  initSocket(server);

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      listenOnAvailablePort(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`TaskFlow API running on port ${port}`);
  });
}

listenOnAvailablePort(START_PORT);