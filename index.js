const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const {
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT
} = require('./config');

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
  res.sendFile(path.join(__dirname, 'src/colaborador.html'));
});

app.post('/actualizar_valor', (req, res) => {
  console.log("Request received for /actualizar_valor");
  const nuevoValor = req.body.valor;
  const pedidoId = req.body.pedidoId;
  const query = 'UPDATE Compras SET etapa = ? WHERE compra_id = ?';
  db.query(query, [nuevoValor, pedidoId], (err, result) => {
    if (err) {
      console.error('Error updating value:', err);
      res.status(500).send('Error updating value');
      return;
    }
    res.send('Value updated successfully');
  });
});

app.listen(DB_PORT, () => {
  console.log(`Server listening at http://localhost:${DB_PORT}`);
});

