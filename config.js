const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'MiBaseDeDatos';
const DB_PASSWORD = process.env.DB_PASSWORD || 'RiasSempai123';
const DB_USER = process.env.DB_USER || 'root';
const DB_PORT = process.env.DB_PORT || 3306;

module.exports = {
  PORT,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT
};
