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

app.get('/seguimiento', (req, res) => {
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

            res.render('seguimiento', {
              idCompra,
              estado: compra.estado,
              producto: {
                ...producto,
                path_imagen: `/public/Products/${compra.producto_id}`
              },
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

          const productInfoPath = path.join(__dirname, 'src', 'public', 'Products', String(producto.producto_id), 'info.txt');
          fs.readFile(productInfoPath, 'utf8', (err, data) => {
            if (err) throw err;

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


// colaborador


app.post('/buscar_usuario', (req, res) => {
  const correo = req.body.correo;

  const query = 'SELECT usuario_id FROM Usuarios WHERE correo = ?';
  db.query(query, [correo], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      res.json({ usuario_id: results[0].usuario_id });
    } else {
      res.json({ usuario_id: null });
    }
  });
});

app.post('/registrar_usuario', (req, res) => {
  const { nombre, correo } = req.body;

  const query = 'INSERT INTO Usuarios (nombre, correo) VALUES (?, ?)';
  db.query(query, [nombre, correo], (err, result) => {
    if (err) throw err;

    res.json({ usuario_id: result.insertId });
  });
});


app.post('/crear_compra', (req, res) => {
  const { producto_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad } = req.body;

  const query = 'INSERT INTO Compras (producto_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [producto_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad], (err, result) => {
    if (err) throw err;

    res.send('Compra creada exitosamente');
  });
});






app.get('/producto', (req, res) => {
  const productoId = req.query.id;

  db.query('SELECT * FROM Productos WHERE producto_id = ?', [productoId], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).send('Error interno del servidor');
    }

    if (results.length > 0) {
      const producto = results[0];

      // Leer el archivo info.txt correspondiente al producto
      const productInfoPath = path.join(__dirname, 'src', 'public', 'Products', String(productoId), 'info.txt');
      fs.readFile(productInfoPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return res.status(500).send('Error interno del servidor');
        }

        // Procesar el contenido del archivo info.txt
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

        // Seleccionar tres productos relacionados al azar de la misma categoría
        db.query(
          'SELECT * FROM Productos WHERE categoria = ? AND producto_id != ? ORDER BY RAND() LIMIT 3',
          [producto.categoria, productoId],
          (err, relatedProducts) => {
            if (err) {
              console.error('Error al buscar productos relacionados:', err);
              return res.status(500).send('Error en el servidor');
            }

            // Renderizar la plantilla EJS con la información del producto, el archivo, y los productos relacionados
            res.render('producto', {
              producto,
              descripcion1: info.catalog['Descripción 1'],
              descripcion2: info.catalog['Descripción 2'], // Aquí pasamos la Descripción 2
              material: info.basic['Material'],
              dimensiones: info.basic['Dimensiones'],
              acabado: info.basic['Acabado'],
              color: info.basic['Color'],
              productosRelacionados: relatedProducts // Pasamos los productos relacionados a la vista
            });
          }
        );
      });
    } else {
      res.status(404).send('Producto no encontrado');
    }
  });
});

app.get('/get_compra_info', (req, res) => {
  const compraId = req.query.id;
  db.query('SELECT * FROM Compras WHERE compra_id = ?', [compraId], (error, compraResults) => {
    if (error) throw error;
    if (compraResults.length > 0) {
      const compra = compraResults[0];
      db.query('SELECT * FROM Productos WHERE producto_id = ?', [compra.producto_id], (error, productoResults) => {
        if (error) throw error;
        const producto = productoResults[0];
        db.query('SELECT * FROM Usuarios WHERE usuario_id = ?', [compra.usuario_id], (error, usuarioResults) => {
          if (error) throw error;
          const usuario = usuarioResults[0];
          res.json({
            success: true,
            compra,
            producto,
            usuario
          });
        });
      });
    } else {
      res.json({ success: false });
    }
  });
});

// Route to update the purchase status
app.post('/actualizar_valor', (req, res) => {
  const { valor, compra_id } = req.body;
  db.query('UPDATE Compras SET estado = ? WHERE compra_id = ?', [valor, compra_id], (error, results) => {
    if (error) throw error;
    res.send('Estado actualizado correctamente');
  });
});

app.get('/catalogo', (req, res) => {
  res.render('catalogo');

});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});