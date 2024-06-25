const express = require('express');
const app = express();
const mysql = require('mysql');
const path = require('path');

const port = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'RiasSempai123',
  database: 'MiBaseDeDatos'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'src')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get("/seguimiento", (req, res) => {
  db.query('SELECT valor FROM Datos LIMIT 1', (err, results) => {
    if (err) throw err;
    const etapa = results[0].valor;
    res.render('seguimiento', { etapa });
  });
});

app.get("/empleadoTest", (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'empleadoTest.html'));
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
