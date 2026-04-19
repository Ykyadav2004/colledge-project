require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/courses', courseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const activeConnections = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', ({ sessionId, userId, role }) => {
    socket.join(sessionId);
    activeConnections.set(socket.id, { sessionId, userId, role });

    io.to(sessionId).emit('user-joined', {
      userId,
      role,
      timestamp: new Date()
    });
  });

  socket.on('location-update', ({ sessionId, userId, location, distance, isValid }) => {
    io.to(sessionId).emit('location-broadcast', {
      userId,
      location,
      distance,
      isValid,
      timestamp: new Date()
    });
  });

  socket.on('warning', ({ sessionId, userId, warningCount, message }) => {
    io.to(sessionId).emit('warning-broadcast', {
      userId,
      warningCount,
      message,
      timestamp: new Date()
    });
  });

  socket.on('attendance-marked', ({ sessionId, userId, status }) => {
    io.to(sessionId).emit('attendance-broadcast', {
      userId,
      status,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    const conn = activeConnections.get(socket.id);
    if (conn) {
      io.to(conn.sessionId).emit('user-left', {
        userId: conn.userId,
        timestamp: new Date()
      });
      activeConnections.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };