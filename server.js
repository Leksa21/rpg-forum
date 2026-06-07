require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const connectDB  = require('./src/config/database');
const indexRouter = require('./src/routes/index');
const { setupChat } = require('./src/socket/chat');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : /^http:\/\/localhost(:\d+)?$/,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

setupChat(io);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`RPG Forum running on http://localhost:${PORT}`);
  });
});

module.exports = app;
