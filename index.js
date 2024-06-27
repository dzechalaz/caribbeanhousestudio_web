const {
  PORT,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  DB_PORT
} = require('./config');

const express = require('express');
const app = express();
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');


const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: DB_PORT,
  database: DB_NAME
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'src')));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'src/index.html'));
});

app.get("/seguimiento", (req, res) => {
  db.query('SELECT valor FROM Datos LIMIT 1', (err, results) => {
    if (err) throw err;
    const etapa = results[0].valor;
    res.render('seguimiento', { etapa });
  });
});

app.get("/colaborador", (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador.html'));
});

app.post('/actualizar_valor', (req, res) => {
  const nuevoValor = req.body.valor;
  const query = 'UPDATE Datos SET valor = ? WHERE id = ?';
  db.query(query, [nuevoValor, '463912'], (err, result) => {
    if (err) {
      console.error('Error al actualizar el valor:', err);
      res.status(500).send('Error al actualizar el valor');
      return;
    }
    res.send('Valor actualizado correctamente');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
