const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const availabilityRoutes = require('./routes/availability.routes');
const configRoutes = require('./routes/config.routes');
const servicesRoutes = require('./routes/services.routes');
const professionalsRoutes = require('./routes/professionals.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/config', configRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/professionals', professionalsRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
