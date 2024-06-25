const express = require('express');
const app = express();
const mysql = require('mysql');
const path = require('path');

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

app.get('/seguimiento', (req, res) => {
  db.query('SELECT valor FROM Datos LIMIT 1', (err, results) => {
    if (err) throw err;
    const etapa = results[0].valor;
    res.render('seguimiento', { etapa });
  });
});

app.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});
