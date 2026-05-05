import { Database } from "bun:sqlite";

export const db = new Database("bot.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    age INTEGER,
    height INTEGER,
    weight INTEGER,
    sex TEXT,
    activity_level TEXT,
    goal TEXT,
    bmr REAL,
    tdee REAL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    raw_text TEXT,
    calories_estimated REAL,
    timestamp TEXT
);
`);