const express = require('express');
const bodyParser = require('body-parser');
const syncService = require('./syncService');
const cron = require('cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Manual Sync Route
app.get('/sync', async (req, res) => {
  try {
    await syncService.pollGoogleSheets(); // Manually trigger Google Sheets polling
    res.status(200).send('Manual sync complete');
  } catch (err) {
    console.error(`Error during manual sync: ${err.message}`);
    res.status(500).send(`Error syncing: ${err.message}`);
  }
});

// CRUD operations
app.post('/create', async (req, res) => {
  const { id, name, age, email } = req.body;

  try {
    const result = await syncService.createUser({ id, name, age, email });
    await syncService.syncGoogleSheets(); // Sync to Google Sheets after creating user
    res.status(201).json(result);
  } catch (err) {
    console.error(`Error creating record: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, age, email } = req.body; 

  try {
    const result = await syncService.updateUser({ id, name, age, email });
    await syncService.syncGoogleSheets(); // Sync to Google Sheets after updating user
    res.status(200).json(result);
  } catch (err) {
    console.error(`Error updating record: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await syncService.deleteUser(id);
    await syncService.syncGoogleSheets(); // Sync to Google Sheets after deleting user
    res.status(200).json(result);
  } catch (err) {
    console.error(`Error deleting record: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Cron Job for automatic sync (runs every minute)
const syncJob = new cron.CronJob('*/1 * * * *', async () => {
  try {
    await syncService.pollGoogleSheets();
    console.log('Automated Google Sheets sync complete.');
  } catch (err) {
    console.error('Error during automated sync:', err.message);
  }
});
syncJob.start();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
