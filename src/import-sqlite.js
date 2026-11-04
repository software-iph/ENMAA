// One-time import of the earlier SQLite database (data/enmaa.db) into PostgreSQL.
// Runs only when the PostgreSQL tables are empty. Keeps ids, then resets the sequences.
const fs = require('fs');

const TABLES = {
  admins: { cols: ['id', 'username', 'pass_hash', 'created_at'] },
  projects: { cols: ['id', 'slug', 'sort', 'featured', 'published', 'hero_image', 'brochure', 'site_area', 't', 'chapters', 'gallery', 'created_at'], bools: ['featured', 'published'] },
  news: { cols: ['id', 'slug', 'date', 'image', 'published', 't', 'created_at'], bools: ['published'] },
  vacancies: { cols: ['id', 'active', 'posted_date', 't', 'created_at'], bools: ['active'] },
  submissions: { cols: ['id', 'type', 'status', 'lang', 'name', 'email', 'organisation', 'country', 'phone', 'subject', 'message', 'data', 'file_path', 'file_name', 'notes', 'ip', 'created_at', 'updated_at'] },
  settings: { cols: ['key', 'value'], noSeq: true },
};
const TS = new Set(['created_at', 'updated_at']);

module.exports = async function importSqlite(file, pool) {
  if (!fs.existsSync(file)) return false;
  const { DatabaseSync } = require('node:sqlite');
  const src = new DatabaseSync(file, { readOnly: true });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [table, spec] of Object.entries(TABLES)) {
      let rows;
      try { rows = src.prepare(`SELECT * FROM ${table}`).all(); } catch { continue; }
      for (const r of rows) {
        const vals = spec.cols.map((c) => {
          let v = r[c];
          if (spec.bools?.includes(c)) return !!v;
          if (TS.has(c) && v) return String(v).replace(' ', 'T') + 'Z'; // SQLite datetime('now') is UTC
          return v ?? null;
        });
        const ph = spec.cols.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`INSERT INTO ${table} (${spec.cols.join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
      }
      if (!spec.noSeq) await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`);
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    src.close();
  }
};
