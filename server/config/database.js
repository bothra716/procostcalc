const sqlite3 = require('sqlite3').verbose();
const { logger } = require('../utils/logger');
const path = require('path');

// Create database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/costing_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error opening database:', err.message);
    process.exit(-1);
  } else {
    logger.info('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Helper function to execute queries
const query = async (text, params = []) => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      db.all(text, params, (err, rows) => {
        const duration = Date.now() - start;
        if (err) {
          logger.error('Database query error', { text, error: err.message });
          reject(err);
        } else {
          logger.debug('Executed query', { text, duration, rows: rows?.length || 0 });
          resolve({ rows, rowCount: rows?.length || 0 });
        }
      });
    } else {
      db.run(text, params, function(err) {
        const duration = Date.now() - start;
        if (err) {
          logger.error('Database query error', { text, error: err.message });
          reject(err);
        } else {
          logger.debug('Executed query', { text, duration, rows: this.changes });
          resolve({ rowCount: this.changes, lastID: this.lastID });
        }
      });
    }
  });
};

// Helper function for transactions
const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      callback({
        query: (text, params = []) => query(text, params),
        run: (text, params = []) => query(text, params)
      }).then(result => {
        db.run('COMMIT', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }).catch(error => {
        db.run('ROLLBACK', (err) => {
          if (err) {
            reject(err);
          } else {
            reject(error);
          }
        });
      });
    });
  });
};

module.exports = {
  db,
  query,
  transaction
};
