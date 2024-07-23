const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'monorail.proxy.rlwy.net';
const DB_NAME = process.env.DB_NAME || 'railway';
const DB_PASSWORD = process.env.DB_PASSWORD || 'pzEloQBYQCXGXJpMQYEpFheDleayOSuHK';
const DB_USER = process.env.DB_USER || 'root';
const DB_PORT = process.env.DB_PORT || 35619;

module.exports = {
  PORT,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT
};
