const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error connecting to database:', err);
  else {
    console.log('Connected to SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      github_repo TEXT
    )`);
    db.run(`ALTER TABLE users ADD COLUMN github_repo TEXT`, (err) => {});
    db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      skill TEXT NOT NULL,
      proficiency INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      required_skills TEXT,
      owner_id INTEGER
    )`);
    db.run(`ALTER TABLE projects ADD COLUMN owner_id INTEGER`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      status TEXT DEFAULT 'forming',
      FOREIGN KEY (project_id) REFERENCES projects (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      user_id INTEGER,
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      user_id INTEGER,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS team_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      issue_type TEXT,
      description TEXT,
      ai_mitigation TEXT,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )`);
  });
}

const runAsync = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { if(err) reject(err); else resolve(this); }));
const getAsync = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => { if(err) reject(err); else resolve(row); }));
const allAsync = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => { if(err) reject(err); else resolve(rows); }));

module.exports = { runAsync, getAsync, allAsync };
