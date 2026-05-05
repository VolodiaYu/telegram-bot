import sqlite from "sqlite";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

export const db = await open({
    filename: "./data.db",
    driver: sqlite3.Database,
});

await db.exec(`
CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    age INTEGER,
    weight REAL,
    height REAL,
    sex TEXT,
    activity_level TEXT,
    bmr REAL,
    tdee REAL
);
`);

await db.exec(`
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    raw_text TEXT,
    calories_estimated REAL,
    ai_json TEXT,
    timestamp TEXT
);
`);