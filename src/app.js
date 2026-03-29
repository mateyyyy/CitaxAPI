const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const availabilityRoutes = require('./routes/availability.routes');
const configRoutes = require('./routes/config.routes');
const servicesRoutes = require('./routes/services.routes');
const professionalsRoutes = require('./routes/professionals.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');

const app = express();
const fs = require('fs');
const path = require('path');

// Simple request logger for diagnosis
app.use((req, res, next) => {
    const log = `📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - Origin: ${req.get('origin') || 'direct'}\n`;
    console.log(log.trim());
    try {
        fs.appendFileSync(path.join(__dirname, '../debug_out.txt'), log);
    } catch(e) {}
    next();
});

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://www.citax.com.ar',
            'https://citax.com.ar',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://unwatched-sindy-bully.ngrok-free.dev'
        ];
        // Permitir localhost e IPs privadas (192.168.x.x) dinámicamente para desarrollo
        if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') || /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            console.warn(`🛑 CORS Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Root check
app.get('/', (req, res) => res.json({ message: 'Citax API is running', version: '1.0.0' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/config', configRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
