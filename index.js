const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { PORT, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT } = require('./config');
const multer = require('multer'); // Asegúrate de tener esto aquí


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


// ########################################## AUTENTICACIÓN SIMPLE
// Middleware de autenticación simple para las rutas del colaborador
const authMiddleware = (req, res, next) => {
  const auth = { login: 'admin', password: 'caribean2024' }; // Usuario y contraseña

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  // Si la autenticación falla
  res.set('WWW-Authenticate', 'Basic realm="Colaborador"');
  res.status(401).send('Autenticación requerida.');
};

// ########################################## MENÚ DE COLABORADOR
// Rutas protegidas por la autenticación para el colaborador
app.get('/colaborador/menu', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/menu.html'));
});

app.get('/colaborador/compras/ver', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/ver_compras.html'));
});

app.get('/colaborador/compras/modificar', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/modificar_estado_compra.html'));
});

app.get('/colaborador/productos/crear', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/crear_producto.html'));
});

app.get('/colaborador/productos/modificar', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/modificar_producto.html'));
});




//########################################################### STOCK  ##################################################



app.get('/colaborador/productos/stock', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/stock.html'));
});

// Ruta para obtener los productos y enviar los datos al frontend
app.get('/colaborador/productos/data', authMiddleware, (req, res) => {
  const query = 'SELECT * FROM Productos'; // Consulta a la base de datos para obtener todos los productos

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Error fetching products' });
    }

    res.json({ productos: results }); // Enviar los productos como respuesta JSON
  });
});

// Ruta para eliminar un producto y su carpeta asociada
app.delete('/colaborador/productos/eliminar/:codigo', authMiddleware, (req, res) => {
  const productoCodigo = req.params.codigo;

  // Primero, buscar el productId correspondiente al código
  db.query('SELECT producto_id FROM Productos WHERE codigo = ?', [productoCodigo], (err, result) => {
    if (err) {
      console.error('Error al buscar producto:', err);
      return res.status(500).json({ success: false, error: 'Error al buscar producto' });
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const productId = result[0].producto_id;

    // Eliminar el producto de la base de datos
    db.query('DELETE FROM Productos WHERE codigo = ?', [productoCodigo], (err, result) => {
      if (err) {
        console.error('Error al eliminar producto de la base de datos:', err);
        return res.status(500).json({ success: false, error: 'Error al eliminar producto' });
      }

      // Eliminar la carpeta con el productId
      const productFolder = path.join(__dirname, 'src', 'public', 'Products', `${productId}`);
      
      if (fs.existsSync(productFolder)) {
        fs.rmdirSync(productFolder, { recursive: true });
        console.log(`Carpeta del producto ${productId} eliminada.`);
      } else {
        console.log(`La carpeta del producto ${productId} no existe.`);
      }

      // Responder que el producto fue eliminado
      res.json({ success: true, redirectUrl: '/colaborador/productos/stock' })
    });
  });
});




//################################# CREAR PRODUCTOS ##################################################
// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Guardar temporalmente en una carpeta para procesar luego
    const tempDir = path.join(__dirname, 'src', 'public', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir); // Guardar en el directorio temporal
  },
  filename: (req, file, cb) => {
    // Asignamos los nombres de las imágenes de acuerdo a su posición en el array (a, b, c, d)
    const ext = path.extname(file.originalname);
    const index = req.fileIndex;  // Usar el índice establecido en el middleware
    const imageNames = ['a', 'b', 'c', 'd']; // Los nombres que quieres para las imágenes
    const filename = `${imageNames[index]}${ext}`; // Asignamos el nombre basado en el índice
    cb(null, filename);
  }
});

// Middleware de multer
const upload = multer({ storage });

// Middleware para asignar índices a las imágenes
app.use((req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      file.fileIndex = index; // Asignar un índice a cada archivo
    });
  }
  next();
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// RUTAS PARA CREAR PRODUCTOS 

app.get('/colaborador/productos/crear', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'colaborador', 'productos', 'crear_producto.html'));
});

// GET para generar el código del producto basado en la categoría seleccionada
app.get('/colaborador/productos/generar-codigo', (req, res) => {
  const categoria = req.query.categoria;

  // Prefijos para las categorías
  const prefixMapping = {
    'Decoración': 'DEC',
    'Salas': 'SAL',
    'Mesas': 'MES',
    'Sillas y bancos': 'SYB',
    'Recámara': 'REC',
    'Exterior': 'EXT',
    'Almacenaje': 'ALM',
    'Varios': 'VAR'
  };

  const prefix = prefixMapping[categoria];

  if (!prefix) {
    return res.status(400).json({ success: false, error: 'Categoría no válida' });
  }

  const query = 'SELECT COUNT(*) AS total FROM Productos WHERE codigo LIKE ?';
  const likePrefix = `${prefix}%`;

  db.query(query, [likePrefix], (err, results) => {
    if (err) {
      console.error('Error al generar el código:', err);
      return res.status(500).json({ success: false, error: 'Error al generar el código' });
    }

    const totalProductos = results[0].total + 1;
    const codigo = `${prefix}${String(totalProductos).padStart(5, '0')}`;

    res.json({ codigo });
  });
});

// POST para crear el producto en la base de datos
app.post('/colaborador/productos/crear', upload.array('imagenes', 4), (req, res) => {
  const { nombre, precio, categoria, codigo, stock, material, dimensiones, acabado, color, descripcion1, descripcion2 } = req.body;

  // Validar que todos los campos estén completos
  if (!nombre || !precio || !categoria || !codigo || !stock || !material || !dimensiones || !acabado || !color || !descripcion1 || !descripcion2) {
    return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });
  }

  // Insertar el producto en la base de datos
  const query = 'INSERT INTO Productos (nombre, precio, categoria, codigo, stock) VALUES (?, ?, ?, ?, ?)';
  const values = [nombre, precio, categoria, codigo, stock];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ success: false, error: 'Error al crear producto' });
    }

    const productId = results.insertId;  // Obtener el ID del producto recién insertado
    const productFolder = path.join(__dirname, 'src', 'public', 'Products', `${productId}`);

    // Crear la carpeta con el product_id
    fs.mkdirSync(productFolder, { recursive: true });

    // Mover las imágenes subidas a la carpeta del producto
    const imageFiles = req.files;
    const imageNames = ['a.webp', 'b.webp', 'c.webp', 'd.webp'];

    imageFiles.forEach((file, index) => {
      const tempPath = file.path;  // Usamos la ruta temporal donde multer guardó las imágenes
      const imagePath = path.join(productFolder, imageNames[index]);
      fs.renameSync(tempPath, imagePath);  // Renombrar y mover el archivo a la carpeta final
    });

    // Completar las imágenes faltantes con el placeholder
    const placeholderPath = path.join(__dirname, 'src', 'Templates', 'placeholder.webp');
    for (let i = imageFiles.length; i < 4; i++) {
      const imagePath = path.join(productFolder, imageNames[i]);
      fs.copyFileSync(placeholderPath, imagePath);  // Copiar el placeholder a las posiciones faltantes
    }

    // Crear el archivo info.txt con la información del producto
    const infoContent = `Información Básica\nNombre: ${nombre}\nMaterial: ${material}\nDimensiones: ${dimensiones}\nAcabado: ${acabado}\nColor: ${color}\n\n` +
                        `Información de Catálogo\nPrecio: ${precio}\nCategoría: ${categoria}\nDescripción 1: ${descripcion1}\nDescripción 2: ${descripcion2}`;

    fs.writeFileSync(path.join(productFolder, 'info.txt'), infoContent);

    // Responder al cliente
    res.json({ success: true, redirectUrl: '/colaborador/productos/stock' });
  });
});



//########################################## SEGUIMIENTO ##################################################
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

//########################################## AÑADIR ID ##################################################

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

//########################################## Catálogo ##################################################

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

app.get('/catalogo', (req, res) => {
  const productosPorPagina = 12;
  const paginaActual = parseInt(req.query.page) || 1;
  const offset = (paginaActual - 1) * productosPorPagina;
  const categoriaSeleccionada = req.query.categoria || 'Todos'; // Por defecto "Todos"
  const searchQuery = req.query.query || ''; // Verificar si hay término de búsqueda

  // Consulta base de productos
  let queryProductos = 'SELECT producto_id, nombre, precio, codigo FROM Productos WHERE 1=1';
  let values = [];

  // Si la categoría no es "Todos", aplicar el filtro
  if (categoriaSeleccionada && categoriaSeleccionada !== 'Todos') {
    queryProductos += ' AND categoria = ?';
    values.push(categoriaSeleccionada);
  }

  // Añadir filtro de búsqueda si hay un término de búsqueda
  if (searchQuery) {
    queryProductos += ' AND nombre LIKE ?';
    values.push(`%${searchQuery}%`);
  }

  // Añadir límite y desplazamiento para la paginación
  queryProductos += ' LIMIT ? OFFSET ?';
  values.push(productosPorPagina, offset);

  // Consultar productos con la búsqueda o la categoría
  db.query(queryProductos, values, (err, productos) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).send('Error fetching products');
    }

    // Añadir la lógica para obtener la imagen principal de cada producto
    productos.forEach(producto => {
      const productImagePath = path.join(__dirname, 'src', 'public', 'Products', String(producto.producto_id), 'a.webp');

      // Verificar si la imagen existe
      if (fs.existsSync(productImagePath)) {
        producto.imagePath = `/public/Products/${producto.producto_id}/a.webp`;
      } else {
        producto.imagePath = '/public/placeholder.png'; // Imagen placeholder si no existe la imagen
      }
    });

    // Consulta para contar el número total de productos
    let queryCount = 'SELECT COUNT(*) AS total FROM Productos WHERE 1=1';
    let countValues = [];

    // Aplicar la lógica para la categoría en el conteo de productos, excepto si es "Todos"
    if (categoriaSeleccionada && categoriaSeleccionada !== 'Todos') {
      queryCount += ' AND categoria = ?';
      countValues.push(categoriaSeleccionada);
    }

    if (searchQuery) {
      queryCount += ' AND nombre LIKE ?';
      countValues.push(`%${searchQuery}%`);
    }

    // Ejecutar la consulta de conteo de productos
    db.query(queryCount, countValues, (err, countResults) => {
      if (err) {
        console.error('Error counting products:', err);
        return res.status(500).send('Error counting products');
      }

      const totalProductos = countResults[0].total;
      const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

      // Consulta para contar las categorías
      let queryCategorias = 'SELECT categoria, COUNT(*) AS cantidad FROM Productos GROUP BY categoria';

      db.query(queryCategorias, (err, categorias) => {
        if (err) {
          console.error('Error fetching categories:', err);
          return res.status(500).send('Error fetching categories');
        }

        // Añadir manualmente la categoría "Todos" al principio de la lista
        const totalProductosQuery = 'SELECT COUNT(*) AS cantidad FROM Productos';
        db.query(totalProductosQuery, (err, resultadoTotal) => {
          if (err) {
            console.error('Error fetching total product count:', err);
            return res.status(500).send('Error fetching total product count');
          }

          const totalProductosEnDB = resultadoTotal[0].cantidad;

          // Agregar "Todos" como categoría manualmente
          categorias.unshift({ categoria: 'Todos', cantidad: totalProductosEnDB });

          // Renderizar la vista
          res.render('catalogo', {
            productos: productos,
            paginaActual: paginaActual,
            totalPaginas: totalPaginas,
            categorias: categorias, // Enviar categorías con la cantidad de productos
            categoriaSeleccionada: categoriaSeleccionada, // Pasar la categoría seleccionada
            searchQuery: searchQuery // Pasar el término de búsqueda
          });
        });
      });
    });
  });
});


app.get('/buscar', (req, res) => {
  const searchQuery = req.query.query; // Obtener la consulta de búsqueda
  const productosPorPagina = 12; // Número de productos por página
  const paginaActual = parseInt(req.query.page) || 1; // Página actual (por defecto la 1)
  const offset = (paginaActual - 1) * productosPorPagina;

  const query = `SELECT producto_id, nombre, precio, codigo FROM Productos WHERE nombre LIKE ? OR codigo LIKE ? LIMIT ? OFFSET ?`;
  const values = [`%${searchQuery}%`, `%${searchQuery}%`, productosPorPagina, offset];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error during search:', err);
      return res.status(500).send('Error fetching products');
    }

    // Obtener el número total de productos que coinciden con la búsqueda
    db.query(`SELECT COUNT(*) AS total FROM Productos WHERE nombre LIKE ? OR codigo LIKE ?`, [`%${searchQuery}%`, `%${searchQuery}%`], (err, countResults) => {
      if (err) {
        console.error('Error counting products:', err);
        return res.status(500).send('Error counting products');
      }

      const totalProductos = countResults[0].total;
      const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

      // Renderizar la vista con los productos encontrados, y los valores de paginación
      res.render('catalogo', {
        productos: results,
        paginaActual: paginaActual,
        totalPaginas: totalPaginas,
        searchQuery: searchQuery // Pasar también la consulta de búsqueda
      });
    });
  });
});




app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});