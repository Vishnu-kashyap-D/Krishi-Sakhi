const express = require('express');
const c = require('../controllers/farmController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public reference data
router.get('/knowledge', c.getKnowledge);
router.get('/prices', c.getPrices);

// Personal farm records
router.use(authenticate);
router.get('/advisory', c.getAdvisory);
router.get('/activities', c.listActivities);
router.post('/activities', c.createActivity);
router.delete('/activities/:id', c.deleteActivity);
router.get('/reminders', c.listReminders);
router.post('/reminders', c.createReminder);
router.patch('/reminders/:id', c.updateReminder);
router.delete('/reminders/:id', c.deleteReminder);

module.exports = router;
