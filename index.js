const express = require('express');
const app = express();
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
  db.query('SELECT nombre FROM Usuarios', (err, results) => {
    if (err) {
      console.error('Error fetching client names:', err);
      res.status(500).send('Error fetching client names');
      return;
    }

    const clientes = results.map(row => row.nombre);
    res.render('dashboard', { clientes });
  });
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

//funcion actualziar valor
app.post('/actualizar_valor', (req, res) => {
  console.log("Request received for /actualizar_valor");
  const nuevoValor = req.body.valor;
  const pedidoId = 1;
  const query = 'UPDATE Compras SET estado = ? WHERE compra_id = ?';
  db.query(query, [nuevoValor, pedidoId], (err, result) => {
    if (err) {
      console.error('Error updating value:', err);
      res.status(500).send('Error updating value');
      return;
    }
    res.send('Value updated successfully');
  });
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
