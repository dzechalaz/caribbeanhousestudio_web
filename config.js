
const DB_HOST = process.env.DB_HOST || 'monorail.proxy.rlwy.net';
const DB_NAME = process.env.DB_NAME || 'railway';
const DB_PASSWORD = process.env.DB_PASSWORD || 'zEloQBYQCXGXJpMQYEpFheDleayOSuHK';
const DB_USER = process.env.DB_USER || 'root';
const DB_PORT = process.env.DB_PORT || 35619;
const PORT = process.env.PORT || 3000; // Este es el puerto del servidor



module.exports = {
  PORT,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT,
  PORT
};


//mysql -h monorail.proxy.rlwy.net -u root -pzEloQBYQCXGXJpMQYEpFheDleayOSuHK --port 35619 --protocol=TCP railway

