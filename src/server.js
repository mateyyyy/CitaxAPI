require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const reminderService = require('./services/reminder.service');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Citax API running on port ${PORT}`);
});

if (process.env.APP_ENABLE_REMINDERS === 'true') {
  reminderService.start();
} else {
  logger.info('Recordatorios automaticos desactivados (APP_ENABLE_REMINDERS != true)');
}
