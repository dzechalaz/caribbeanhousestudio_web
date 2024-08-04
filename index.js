const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { PORT, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT } = require('./config');

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: DB_PORT,
  database: DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'src')));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  console.log("Request received for /");
  res.sendFile(path.join(__dirname, 'src/index.html'));
});

app.get("/seguimiento", (req, res) => {
  console.log("Request received for /seguimiento");
  const pedidoId = req.query.id || 1; // Default para pruebas
  db.query('SELECT estado FROM Compras WHERE compra_id = ?', [pedidoId], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).send("Database query error");
      return;
    }
    const estado = results[0].estado;
    res.render('seguimiento', { estado });
  });
});

app.get("/colaborador", (req, res) => {
  console.log("Request received for /colaborador");
  res.render('colaborador');
});

app.get('/añadirID', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/añadirID.html'));
});

app.post('/verificar-id-compra', (req, res) => {
  const { idCompra } = req.body;
  db.query('SELECT * FROM Compras WHERE compra_id = ?', [idCompra], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).json({ error: 'Database query error' });
      return;
    }
    if (results.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  });
});

app.get('/compras', (req, res) => {
  const idCompra = req.query.id;
  db.query('SELECT * FROM Compras WHERE compra_id = ?', [idCompra], (error, compraResults) => {
    if (error) throw error;
    if (compraResults.length > 0) {
      const compra = compraResults[0];
      db.query('SELECT * FROM Productos WHERE producto_id = ?', [compra.producto_id], (error, productoResults) => {
        if (error) throw error;
        if (productoResults.length > 0) {
          const producto = productoResults[0];

          // Read product info from file
          const productInfoPath = path.join(__dirname, 'src', 'public', 'Products', String(producto.producto_id), 'info.txt');
          fs.readFile(productInfoPath, 'utf8', (err, data) => {
            if (err) throw err;
            
            // Parse the info.txt file content
            const infoLines = data.split('\n');
            const info = {};
            let currentSection = null;

            infoLines.forEach(line => {
              if (line.trim() === "Información Básica") {
                currentSection = "basic";
                info[currentSection] = {};
              } else if (line.trim() === "Información de Catálogo") {
                currentSection = "catalog";
                info[currentSection] = {};
              } else if (line.trim() !== "") {
                const [key, value] = line.split(': ');
                if (currentSection && key && value) {
                  info[currentSection][key.trim()] = value.trim();
                }
              }
            });

            const direccionParts = compra.direccion_envio.split(', ');

            res.render('compras', {
              idCompra,
              compra,
              producto,
              info: info.basic,
              direccion: {
                calle: direccionParts[0],
                ciudad: direccionParts[1],
                estado: direccionParts[2],
                codigoPostal: direccionParts[3]
              }
            });
          });
        }
      });
    } else {
      res.send('Compra no encontrada');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
