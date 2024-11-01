# Superjoin
Solution that enables real-time synchronization of data between a Google Sheet and a specified database (e.g., MySQL, PostgreSQL). The solution should detect changes in the Google Sheet and update the database accordingly, and vice versa.


## Demo Video 
[![Watch the demo video](https://screenrec.com/share/xGTo7mBaF0)](https://screenrec.com/share/xGTo7mBaF0)


## Approach

**Server Setup:**
- An Express.js server is set up to handle HTTP requests for CRUD operations and manual syncing.
- The server uses environment variables for configuration, including database connection details and Google Sheets information.

**Database Connection:**
- A PostgreSQL client is established using the 'pg' library.
- Connection details are sourced from environment variables for security.

**Google Sheets API Integration:**
- The Google Sheets API is initialized using credentials stored in a 'credentials.json' file.
- The spreadsheet ID and range are configured via environment variables.

**Bidirectional Synchronization:**
a) PostgreSQL to Google Sheets:
- CRUD operations (Create, Update, Delete, Read) on the PostgreSQL database trigger a sync to Google Sheets.
- After each CRUD operation, the syncGoogleSheets function is called.
- This function fetches all data from PostgreSQL and updates the Google Sheet, ensuring it reflects the current database state.

b) Google Sheets to PostgreSQL:
- A polling mechanism (pollGoogleSheets) checks Google Sheets for changes every minute.
- It compares the current state of the Google Sheet with the last known state.
- Any differences (new rows, updates, or deletions) are applied to the PostgreSQL database.

**Change Detection:**
- For PostgreSQL changes, the server listens for 'data_change' notifications.
- For Google Sheets changes, the pollGoogleSheets function compares current data with lastFetchedData.

**Error Handling:**
- Try-catch blocks are used throughout to handle potential errors.

**Manual Sync:**
- A '/sync' endpoint allows manual triggering of the Google Sheets to PostgreSQL sync process.

**Automatic Sync:**
- A cron job is set up to automatically trigger the Google Sheets to PostgreSQL sync every minute.

**CRUD Operations:**
- The server provides endpoints for creating, updating, and deleting users.
- These operations update PostgreSQL and then trigger a sync to Google Sheets.




## Tech-Stack Used
- Node.js
- PostgreSQL
- Google APIs
- Express
