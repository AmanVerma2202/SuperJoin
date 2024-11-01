
const { Client } = require('pg');
const { google } = require('googleapis');
require('dotenv').config();

// PostgreSQL client setup
const client = new Client({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

client.connect();

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Store the last known data from Google Sheets
let lastFetchedData = [];

// Function to compare and sync changes from Google Sheets to PostgreSQL
async function pollGoogleSheets() {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = process.env.RANGE;
  
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
  
      const rows = response.data.values;
  
      // If no data exists in Google Sheets, return
      if (!rows || rows.length === 0) {
        console.log('No data found in Google Sheets.');
        return;
      }

      // Detect deleted rows by comparing with the lastFetchedData
    const currentIds = rows.map(row => row[0]); // Current IDs in Google Sheets
    const lastIds = lastFetchedData.map(row => row[0]); // IDs from the last fetch

    // Detect IDs that were removed from Google Sheets
    const deletedIds = lastIds.filter(id => !currentIds.includes(id));

    // Delete corresponding rows from PostgreSQL
    for (let id of deletedIds) {
      console.log(`Detected deletion in Google Sheets for ID: ${id}. Syncing to PostgreSQL...`);
      await client.query(`DELETE FROM users WHERE id = $1`, [id]);
    }
  
      // Compare the fetched rows with the last fetched data
      for (let row of rows) {
        const id = row[0];
        const name = row[1];
        const age = row[2];
        const email = row[3];
  
        // Skip rows where ID is undefined or empty
        if (!id) {
          console.log('Skipping row with missing ID:', row);
          continue;
        }
  
        // Look for changes between the new data and the last fetched data
        const foundRow = lastFetchedData.find((r) => r[0] === id);
  
        // If the row doesn't exist in the last fetched data or has changed, sync it
        if (!foundRow || (foundRow && (foundRow[1] !== name || foundRow[2] !== age || foundRow[3] !== email))) {
          console.log(`Detected change in Google Sheets for ID: ${id}. Syncing to PostgreSQL...`);
  
          const query = `
            INSERT INTO users (id, name, age, email)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name, age = EXCLUDED.age, email = EXCLUDED.email;
          `;
  
          await client.query(query, [id, name, age, email]);
        }
      }
  
      // Store the current fetched data as the last fetched data for future comparison
      lastFetchedData = rows;
  
      console.log('Google Sheets data synced to PostgreSQL.');
    } catch (error) {
      console.error(`Error polling Google Sheets: ${error.message}`);
    }
}

// Sync Google Sheets with the current state of the PostgreSQL database
async function syncGoogleSheets() {
  const res = await client.query('SELECT * FROM users');

  const values = res.rows.map((row) => {
    return [row.id, row.name, row.age, row.email];
  });

  const request = {
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: process.env.RANGE,
    valueInputOption: 'RAW',
    resource: {
      values,
    },
  };

  try {
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: process.env.RANGE,
    });

    await sheets.spreadsheets.values.update(request);
    console.log('PostgreSQL changes synced to Google Sheets.');
  } catch (error) {
    console.error(`Error syncing PostgreSQL changes to Google Sheets: ${error.message}`);
  }
}

// Listen for changes in PostgreSQL and update Google Sheets
client.query('LISTEN data_change');

client.on('notification', async (msg) => {
  console.log('Detected change in PostgreSQL:', msg);
  await syncGoogleSheets(); // Sync Google Sheets after PostgreSQL change
});

// Poll Google Sheets every minute (for automatic sync)
setInterval(pollGoogleSheets, 6 * 1000); // Poll every minute

// CRUD operations
async function createUser({ id, name, age, email }) {
  const query = `INSERT INTO users (id, name, age, email) VALUES ($1, $2, $3, $4) RETURNING *`;
  const res = await client.query(query, [id, name, age, email]);
  return res.rows[0];
}

async function updateUser({ id, name, age, email }) {
  const query = `UPDATE users SET name = $1, age = $2, email = $3 WHERE id = $4 RETURNING *`;
  const res = await client.query(query, [name, age, email, id]);
  return res.rows[0];
}

async function deleteUser(id) {
  const query = `DELETE FROM users WHERE id = $1 RETURNING *`;
  const res = await client.query(query, [id]);
  return res.rows[0];
}

module.exports = {
  pollGoogleSheets,
  syncGoogleSheets,
  createUser,
  updateUser,
  deleteUser,
};
