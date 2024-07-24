require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');

const {
  PORT,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT
} = require('./config');

const app = express();

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
  db.query('SELECT nombre FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error fetching client names:', err);
      res.status(500).send('Error fetching client names');
      return;
    }

    const clientes = results.map(row => row.nombre);
    console.log('Clientes:', clientes); // Verificar que los nombres se obtienen correctamente

    res.render('dashboard', { clientes });
  });
});

app.get("/seguimiento", (req, res) => {
  const pedidoId = req.query.id || 1; // Default para pruebas
  db.query('SELECT etapa FROM Compras WHERE compra_id = ?', [pedidoId], (err, results) => {
    if (err) throw err;
    const etapa = results[0]?.etapa || 'No disponible';
    res.render('seguimiento', { etapa });
  });
});

app.get("/colaborador", (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador.html'));
});

app.post('/actualizar_valor', (req, res) => {
  const nuevoValor = req.body.valor;
  const pedidoId = req.body.pedidoId;
  const query = 'UPDATE Compras SET etapa = ? WHERE compra_id = ?';
  db.query(query, [nuevoValor, pedidoId], (err, result) => {
    if (err) {
      console.error('Error al actualizar el valor:', err);
      res.status(500).send('Error al actualizar el valor');
      return;
    }
    res.send('Valor actualizado correctamente');
  });
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
