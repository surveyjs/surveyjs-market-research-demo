import { createApp } from './app';
import { createDb } from './db';

const DB_PATH = process.env.DB_PATH || 'data/research.db';
const PORT = Number(process.env.API_PORT || 4004);

const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`[api] SQLite-backed API listening on http://localhost:${PORT} (db: ${DB_PATH})`);
});
