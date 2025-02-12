const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { PORT, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT } = require('./config');
const multer = require('multer'); // Asegúrate de tener esto aquí
const bcrypt = require('bcrypt'); // Asegúrate de tener esta línea
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const fetch = require('node-fetch'); 
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const router = express.Router();

const archiver = require('archiver');

const EMPRESA_EMAIL = "diochoglez@gmail.com"; // Aquí defines el correo de la empresa contacto@caribbeanhousestudio.com

const cors = require('cors');
app.use(cors());

app.use(cookieParser());

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configuración del cliente S3 con las nuevas credenciales
const s3 = new S3Client({
  region: 'auto', // Cloudflare R2 no requiere región específica
  endpoint: 'https://9da33335d2c28a44cc8e07d04747ed4c.r2.cloudflarestorage.com', // Endpoint de tu bucket
  credentials: {
    accessKeyId: 'a8a5ce4145688c3d1ed0212da9e362d1', // Access Key ID actualizado
    secretAccessKey: '2cd1ebbf7b8812d92f85904620328dcb474ea864f14c294ec88a9952faa663a0', // Secret Access Key actualizado
  },
});

// Configuración de multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Archivo: index.js (o tu archivo principal del servidor)

// Cargar variables de entorno
require('dotenv').config(); // Si usas un archivo .env

// Constante para el bucket de imágenes de Cloudflare
const CFI = process.env.CFI || "https://pub-9eb3385798dc4bcba46fb69f616dc1a0.r2.dev";

// Hacer que la constante esté disponible para todas las vistas
app.use((req, res, next) => {
  res.locals.CFI = CFI; // Esto hace que `CFI` esté disponible en EJS
  next();
});

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: DB_PORT,
  database: DB_NAME
});

// Configuración de la sesión
const sessionStore = new MySQLStore({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT
});

app.use(session({
  key: 'caribbeanhouse_session', // Cambia el nombre de la cookie si lo deseas
  secret: 'tusuperclaveultrasecreta12345', // Cambia esta clave secreta por algo más seguro
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 día de duración de la sesión
  }
}));

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Mantener la conexión viva usando un ping cada 5 minutos (300000 ms)
setInterval(() => {
  db.ping((err) => {
    if (err) {
      console.error('Error pinging MySQL:', err);
    } else {
      console.log('MySQL connection is alive');
    }
  });
}, 300000); // 5 minutos en milisegundos

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'src')));
app.use(bodyParser.json());



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
app.get('/colaborador/estadisticas', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/estadisticas.html'));
});

app.get('/colaborador/productos/crear', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/crear_producto.html'));
});

let anuncioHabilitado = false; // Por defecto deshabilitado
// Endpoint para /colaborador/anuncios (renderización del HTML)
// Endpoint para /colaborador/anuncios (renderización del HTML)
app.get('/colaborador/anuncios', authMiddleware, (req, res) => {
  const timestamp = Date.now();
  const anuncioPath = `https://pub-9eb3385798dc4bcba46fb69f616dc1a0.r2.dev/Anuncios/anuncio.webp?t=${timestamp}`;

  // Leer el archivo HTML y reemplazar un marcador con la URL del anuncio y habilitación
  const fs = require('fs');
  const htmlPath = path.join(__dirname, 'src/colaborador/anuncios.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer el archivo HTML:', err);
      return res.status(500).send('Error interno del servidor');
    }

    // Incluir el valor de habilitación
    const htmlConAnuncio = data
      .replace('{{anuncioPath}}', anuncioPath)
      .replace('{{anuncioHabilitado}}', anuncioHabilitado ? 'true' : 'false'); // Agregar variable
    res.send(htmlConAnuncio);
  });
});


// Endpoint para procesar la subida de la imagen
app.post('/colaborador/anuncios/upload', authMiddleware, upload.single('imagen'), async (req, res) => {
  try {
    const activo = req.body.activo === 'true'; // Estado del checkbox
    anuncioHabilitado = activo; // Actualizar el estado global

    // Si no hay imagen, solo actualizar el estado del anuncio
    if (!req.file) {
      console.log(`El estado del anuncio se actualizó: ${anuncioHabilitado ? 'Habilitado' : 'Deshabilitado'}`);
      return res.status(200).json({
        success: true,
        message: 'Estado del anuncio actualizado correctamente.',
        habilitado: anuncioHabilitado,
      });
    }

    // Si hay una imagen, procesarla y subirla al bucket
    const fileName = 'anuncio.webp';
    const productPath = `Anuncios/`;
    const filePath = `${productPath}${fileName}`;

    const params = {
      Bucket: 'products', // El bucket configurado
      Key: filePath,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));
    console.log(`Imagen subida correctamente: ${filePath}`);

    // Construir la URL pública
    const imageUrl = `${CFI}/${filePath}`;
    res.status(200).json({
      success: true,
      message: 'Imagen y estado del anuncio actualizados correctamente.',
      url: imageUrl,
      habilitado: anuncioHabilitado,
    });
  } catch (error) {
    console.error('Error al procesar la imagen o actualizar el estado:', error);
    res.status(500).send('Error al procesar la solicitud.');
  }
});



// Estado global para habilitar o deshabilitar el anuncio


app.get('/anuncio', async (req, res) => {
  try {
    if (!anuncioHabilitado) {
      return res.json({ success: false, message: 'El anuncio no está habilitado.' });
    }

    const lastAnuncioTime = req.cookies.lastAnuncioTime;
    const currentTime = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutos en milisegundos

    if (lastAnuncioTime && currentTime - lastAnuncioTime < thirtyMinutes) {
      return res.json({ success: false, message: 'El anuncio ya fue mostrado recientemente.' });
    }

    // Actualizar la cookie con el tiempo actual
    res.cookie('lastAnuncioTime', currentTime, {
      maxAge: thirtyMinutes, // La cookie expira en 30 minutos
      httpOnly: true, // Solo accesible por el servidor
    });

    const timestamp = Date.now();
    const anuncioPath = `https://pub-9eb3385798dc4bcba46fb69f616dc1a0.r2.dev/Anuncios/anuncio.webp?t=${timestamp}`;
    res.json({ success: true, url: anuncioPath });
  } catch (error) {
    console.error('Error al cargar el anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al cargar el anuncio.' });
  }
});



//########################################################### STOCK  ##################################################

app.get('/colaborador/productos/stock', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/stock.html'));
});

// Ruta para obtener los productos y enviar los datos al frontend
app.get('/colaborador/productos/data', authMiddleware, (req, res) => {
  const query = `
      SELECT 
          p.producto_id,
          p.codigo, 
          p.nombre, 
          p.precio, 
          p.categoria, 
          COALESCE(pd.color, 'Sin color') AS color_principal, 
          COALESCE(pd.color_hex, NULL) AS color_hex_principal, 
          p.stock AS stock_total, 
          COALESCE(c.color, NULL) AS color_alterno, 
          COALESCE(c.color_hex, NULL) AS color_hex_alterno, 
          c.color_id AS color_alterno_id,
          c.stock AS stock_alterno, 
          p.destacado,
          p.BV  -- 🔥 Asegurar que BV sea parte de la consulta
      FROM Productos p
      LEFT JOIN Productos_detalles pd ON p.producto_id = pd.producto_id
      LEFT JOIN ColoresAlternos c ON p.producto_id = c.producto_id
      ORDER BY p.codigo, c.color_id;
  `;

  db.query(query, (err, results) => {
    if (err) {
        console.error('❌ Error fetching products:', err);
        return res.status(500).json({ error: 'Error fetching products' });
    }

    const productos = [];
    const productosMap = {};

    results.forEach(row => {
        if (!productosMap[row.codigo]) {
            // Agregar el producto principal solo una vez
            productosMap[row.codigo] = {
                producto_id: row.producto_id,
                codigo: row.codigo,
                nombre: row.nombre,
                precio: row.precio,
                categoria: row.categoria || 'Sin categoría',
                color: row.color_principal,
                color_hex: row.color_hex_principal,
                stock: row.stock_total || 0,
                destacado: row.destacado,
                BV: row.BV || 0,  // 🔥 Agregar el campo BV con valor por defecto 0 si es NULL
                alternos: []
            };
        }

        // Agregar colores alternos al producto correspondiente
        if (row.color_alterno) {
            productosMap[row.codigo].alternos.push({
                producto_id: row.producto_id,
                codigo: row.codigo,
                nombre: `↳ ${row.nombre} ALT${row.color_alterno_id}`,
                precio: row.precio,
                categoria: row.categoria || 'Sin categoría',
                color: row.color_alterno,
                color_hex: row.color_hex_alterno,
                stock: row.stock_alterno || 0,
                destacado: row.destacado,
                BV: row.BV || 0,  // 🔥 Agregar BV también en los productos alternos
                esAlterno: true
            });
        }
    });

      // Convertir el mapa a una lista ordenada
      Object.values(productosMap).forEach(producto => {
          productos.push(producto); // Agregar el producto principal
          productos.push(...producto.alternos); // Agregar sus alternos inmediatamente después
      });

      res.json({ productos });
  });
});




// **Ruta para actualizar el valor de BV (Bolsa de Valores)**
app.post("/colaborador/productos/actualizar-bv", async (req, res) => {
  const { codigo, BV } = req.body;

  if (BV !== 0 && BV !== 1) {
      return res.status(400).json({ success: false, error: "Valor de BV inválido." });
  }

  try {
      await db.promise().query(
          "UPDATE Productos SET BV = ? WHERE codigo = ?",
          [BV, codigo]
      );
      res.json({ success: true, message: "BV actualizado correctamente." });
  } catch (error) {
      console.error("❌ Error al actualizar BV:", error);
      res.status(500).json({ success: false, error: "Error al actualizar BV." });
  }
});


//########################################################### eliminar productos ##################################################
const { DeleteObjectCommand, ListObjectsCommand } = require('@aws-sdk/client-s3');
app.delete('/colaborador/productos/eliminar/:codigo', authMiddleware, async (req, res) => {
  const productoCodigo = req.params.codigo;

  try {
    // Buscar el producto por código para obtener su ID
    const [result] = await db.promise().query('SELECT producto_id FROM Productos WHERE codigo = ?', [productoCodigo]);
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const productId = result[0].producto_id;

    // Eliminar referencias en la tabla Registros relacionadas con el producto
    const deleteRegistros = await db.promise().query('DELETE FROM Registros WHERE product_id = ?', [productId]);
    console.log(`Eliminadas ${deleteRegistros[0].affectedRows} filas de Registros`);

    // Eliminar referencias en la tabla Compras relacionadas con el producto
    const deleteCompras = await db.promise().query('DELETE FROM Compras WHERE producto_id = ?', [productId]);
    console.log(`Eliminadas ${deleteCompras[0].affectedRows} filas de Compras`);

    // Eliminar entradas relacionadas en la tabla ColoresAlternos
    const [coloresAlternos] = await db.promise().query('SELECT color_id FROM ColoresAlternos WHERE producto_id = ?', [productId]);
    const deleteColoresAlternos = await db.promise().query('DELETE FROM ColoresAlternos WHERE producto_id = ?', [productId]);
    console.log(`Eliminadas ${deleteColoresAlternos[0].affectedRows} filas de ColoresAlternos`);

    // Eliminar entrada relacionada en la tabla Productos_detalles
    const deleteDetalles = await db.promise().query('DELETE FROM Productos_detalles WHERE producto_id = ?', [productId]);
    console.log(`Eliminada la fila correspondiente en Productos_detalles`);

    // Eliminar el producto de la base de datos
    const deleteProducto = await db.promise().query('DELETE FROM Productos WHERE codigo = ?', [productoCodigo]);
    if (deleteProducto[0].affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado para eliminar' });
    }
    console.log('Producto eliminado correctamente de la base de datos.');


    // Eliminar archivos del bucket en Colors/{productId}/{colorId}/
    for (const { color_id: colorId } of coloresAlternos) {
      const colorFolderPath = `Colors/${productId}/${colorId}/`;
      const listColorParams = {
        Bucket: 'products',
        Prefix: colorFolderPath,
      };
      const listedColorObjects = await s3.send(new ListObjectsCommand(listColorParams));
      if (listedColorObjects.Contents && listedColorObjects.Contents.length > 0) {
        for (const object of listedColorObjects.Contents) {
          const deleteParams = {
            Bucket: 'products',
            Key: object.Key,
          };
          await s3.send(new DeleteObjectCommand(deleteParams));
          console.log(`Eliminado del bucket: ${object.Key}`);
        }
      }
    }

    // Eliminar archivos del bucket en Products/{productId}/
    const folderPath = `Products/${productId}/`;
    const listParams = {
      Bucket: 'products',
      Prefix: folderPath,
    };
    const listedObjects = await s3.send(new ListObjectsCommand(listParams));
    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      for (const object of listedObjects.Contents) {
        const deleteParams = {
          Bucket: 'products',
          Key: object.Key,
        };
        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log(`Eliminado del bucket: ${object.Key}`);
      }
    }

    res.json({ success: true, message: 'Producto, colores alternos y todas sus referencias eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar el producto:', error.message);
    res.status(500).json({ success: false, error: 'Error interno al eliminar el producto' });
  }
});





// Ruta para actualizar el stock de los productos
app.post('/colaborador/productos/actualizar-stock', authMiddleware, (req, res) => {
  const productos = req.body.productos;

  // Validar que haya productos
  if (!productos || productos.length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron productos para actualizar' });
  }

  const queries = [];
  productos.forEach(producto => {
    const { nombre, stock } = producto;

    // Verificar si es un color alterno por la presencia de ↳ ALT
    if (nombre.includes('↳')) {
      const colorIdMatch = nombre.match(/ALT(\d+)/); // Extraer el ID del color alterno
      if (colorIdMatch) {
        const colorId = parseInt(colorIdMatch[1], 10);
        queries.push(new Promise((resolve, reject) => {
          db.query('UPDATE ColoresAlternos SET stock = ? WHERE color_id = ?', [stock, colorId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        }));
      }
    } else {
      // Producto principal
      queries.push(new Promise((resolve, reject) => {
        db.query('UPDATE Productos SET stock = ? WHERE codigo = ?', [stock, producto.codigo], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      }));
    }
  });

  // Ejecutar todas las consultas y enviar la respuesta
  Promise.all(queries)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Error al actualizar el stock:', err);
      res.status(500).json({ success: false, error: 'Error al actualizar el stock' });
    });
});



// Ruta para actualizar el estado de destacado de un producto
app.post('/colaborador/productos/actualizar-destacado', authMiddleware, (req, res) => {
  const { codigo, destacado } = req.body;

  // Validar si ya hay 6 productos destacados
  const queryCount = 'SELECT COUNT(*) AS count FROM Productos WHERE destacado = 1';
  const queryUpdate = 'UPDATE Productos SET destacado = ? WHERE codigo = ?';

  db.query(queryCount, (err, results) => {
    if (err) {
      console.error('Error al contar productos destacados:', err);
      return res.status(500).json({ error: 'Error al contar productos destacados' });
    }

    const destacadosActuales = results[0].count;

    // Permitir el cambio si se está desmarcando o si hay menos de 6 destacados
    if (!destacado || destacadosActuales < 6) {
      db.query(queryUpdate, [destacado ? 1 : 0, codigo], (err, results) => {
        if (err) {
          console.error('Error al actualizar producto destacado:', err);
          return res.status(500).json({ error: 'Error al actualizar producto destacado' });
        }

        res.json({ success: true });
      });
    } else {
      res.status(400).json({ error: 'Solo puedes tener un máximo de 6 productos destacados.' });
    }
  });
});




//########################################## CREAR PRODUCTOS ###################################### crear productos
// Middleware Multer configurado para manejar colores alternos dinámicamente
app.post('/colaborador/productos/crear', upload.fields([
  { name: 'imagen_a', maxCount: 1 },
  { name: 'imagen_b', maxCount: 1 },
  { name: 'imagen_c', maxCount: 1 },
  { name: 'imagen_d', maxCount: 1 },
  // Campos dinámicos para colores alternos
  { name: 'imagen_color_a[]', maxCount: 10 },
  { name: 'imagen_color_b[]', maxCount: 10 },
  { name: 'imagen_color_c[]', maxCount: 10 },
  { name: 'imagen_color_d[]', maxCount: 10 },
]), async (req, res) => {
  const {
    nombre,
    precio,
    categoria,
    codigo,
    stock,
    material,
    dimensiones,
    acabado,
    color,
    color_hex,
    descripcion1,
    descripcion2,
    habilitar_colores_alternos,
    color_alterno = [],
    hex_alterno = [],
    stock_alterno = []
  } = req.body;

  // Validación de campos principales
  const errores = [];
  if (!nombre) errores.push("Nombre");
  if (!precio) errores.push("Precio");
  if (!categoria) errores.push("Categoría");
  if (!codigo) errores.push("Código");
  if (!stock) errores.push("Stock");
  if (!color) errores.push("Color principal");
  if (!color_hex) errores.push("Hexadecimal principal");

  if (errores.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Por favor, completa los siguientes campos: ${errores.join(", ")}`
    });
  }

  try {
    // Crear el producto principal
    const productoQuery = `INSERT INTO Productos (nombre, precio, categoria, codigo, stock, precioOG) VALUES (?, ?, ?, ?, ?,?)`;
    const productoValues = [nombre, precio, categoria, codigo, stock, precio];

    const [results] = await db.promise().query(productoQuery, productoValues);
    const productId = results.insertId;

    // Insertar detalles del producto con color_hex
    const detallesQuery = `
      INSERT INTO Productos_detalles (producto_id, material, dimensiones, acabado, color, color_hex, descripcion1, descripcion2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const detallesValues = [
      productId,
      material || null,
      dimensiones || null,
      acabado || null,
      color || null,
      color_hex || null,
      descripcion1 || null,
      descripcion2 || null
    ];
    await db.promise().query(detallesQuery, detallesValues);

    // Manejo de imágenes principales
    const productPath = `Products/${productId}/`;
    const imageNames = { imagen_a: 'a.webp', imagen_b: 'b.webp', imagen_c: 'c.webp', imagen_d: 'd.webp' };
    for (const [fieldName, fileName] of Object.entries(imageNames)) {
      const file = req.files[fieldName]?.[0] || null;
      const imagePath = `${productPath}${fileName}`;
      await subirImagen(file, imagePath);
    }

    // Manejo de colores alternos
    try {
      const alternoInsertPromises = [];
      for (let i = 0; i < color_alterno.length; i++) {
        const colorValue = color_alterno[i];
        const hexValue = hex_alterno[i];
        const stockValue = parseInt(stock_alterno[i], 10) || 0;

        if (!colorValue || !hexValue) {
          console.log(`Color alterno ${i} está incompleto. Ignorando...`);
          continue;
        }

        // Insertar color alterno en la base de datos
        const alternoQuery = `
          INSERT INTO ColoresAlternos (producto_id, color, color_hex, stock)
          VALUES (?, ?, ?, ?)
        `;
        const [altResults] = await db.promise().query(alternoQuery, [productId, colorValue, hexValue, stockValue]);
        const colorId = altResults.insertId;

        // Manejo de imágenes para el color alterno
        const colorPath = `Colors/${productId}/${colorId}/`;
        const alternoImageNames = {
          [`imagen_color_a[]`]: 'a.webp',
          [`imagen_color_b[]`]: 'b.webp',
          [`imagen_color_c[]`]: 'c.webp',
          [`imagen_color_d[]`]: 'd.webp',
        };

        for (const [fieldName, fileName] of Object.entries(alternoImageNames)) {
          const file = req.files[fieldName]?.[i] || null;
          const imagePath = `${colorPath}${fileName}`;
          await subirImagen(file, imagePath);
        }
      }

      console.log("Colores alternos y sus imágenes procesados correctamente.");
    } catch (altErr) {
      console.warn("No se pudieron procesar los colores alternos:", altErr.message);
    }

    res.json({ success: true, redirectUrl: '/colaborador/productos/stock' });
  } catch (err) {
    console.error('Error general:', err.message);
    res.status(500).json({ success: false, error: 'Error general al procesar el producto' });
  }
});

// Función para subir imágenes
async function subirImagen(file, imagePath) {
  const placeholderPath = path.join(__dirname, 'src', 'Templates', 'placeholder.webp');
  const params = file
    ? { Bucket: 'products', Key: imagePath, Body: file.buffer, ContentType: file.mimetype }
    : { Bucket: 'products', Key: imagePath, Body: fs.readFileSync(placeholderPath), ContentType: 'image/webp' };

  try {
    await s3.send(new PutObjectCommand(params));
    console.log(`Imagen subida correctamente: ${imagePath}`);
  } catch (uploadError) {
    console.error(`Error subiendo imagen: ${uploadError.message}`);
  }
}







//################################# crear codigS ##################################################

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

  const query = `
    SELECT MAX(CAST(SUBSTRING(codigo, LENGTH(?) + 1) AS UNSIGNED)) AS max_codigo
    FROM Productos
    WHERE codigo LIKE ?
  `;

  const likePrefix = `${prefix}%`;

  db.query(query, [prefix, likePrefix], (err, results) => {
    if (err) {
      console.error('Error al generar el código:', err);
      return res.status(500).json({ success: false, error: 'Error al generar el código' });
    }

    const maxCodigo = results[0].max_codigo || 0; // Si no hay registros, comienza desde 0
    const nextCodigo = maxCodigo + 1;
    const codigo = `${prefix}${String(nextCodigo).padStart(5, '0')}`;

    res.json({ codigo });
  });
});

//############################################# modificar producto #########################################

app.post(
  "/colaborador/productos/modificar/:codigo",
  upload.fields([
    { name: "imagenA", maxCount: 1 },
    { name: "imagenB", maxCount: 1 },
    { name: "imagenC", maxCount: 1 },
    { name: "imagenD", maxCount: 1 },
    // Campos dinámicos para colores alternos
    { name: "imagen_color_a[]", maxCount: 10 },
    { name: "imagen_color_b[]", maxCount: 10 },
    { name: "imagen_color_c[]", maxCount: 10 },
    { name: "imagen_color_d[]", maxCount: 10 },
  ]),
  async (req, res) => {
    const {
      nombre,
      precio,
      categoria,
      codigo,
      stock,
      material,
      dimensiones,
      acabado,
      color,
      color_hex,
      descripcion1,
      descripcion2,
      color_id = [],
      color_alterno = [],
      hex_alterno = [],
      stock_alterno = [],
      eliminar_colores = [],
    } = req.body;

    const codigoProducto = req.params.codigo;

    if (!nombre || !precio || !categoria || !stock || !codigo) {
      return res.status(400).json({
        success: false,
        error:
          "Los campos nombre, precio, categoría, código y stock son obligatorios",
      });
    }

    try {
      // Obtener el producto_id basado en el código del producto original
      const [productoResult] = await db
        .promise()
        .query("SELECT producto_id FROM Productos WHERE codigo = ?", [
          codigoProducto,
        ]);
      if (productoResult.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Producto no encontrado" });
      }

      const productoId = productoResult[0].producto_id;

      // Actualizar datos del producto principal, incluyendo el nuevo código
      const updateProductoQuery = `
        UPDATE Productos 
        SET nombre = ?, precio = ?, categoria = ?, codigo = ?, stock = ? ,precioOG = ?
        WHERE producto_id = ?
      `;
      await db
        .promise()
        .query(updateProductoQuery, [
          nombre,
          precio,
          categoria,
          codigo,
          stock,
          precio,
          productoId,
        ]);

      // Actualizar detalles del producto
      const updateDetallesQuery = `
        INSERT INTO Productos_detalles 
        (producto_id, material, dimensiones, acabado, color, color_hex, descripcion1, descripcion2)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          material = VALUES(material),
          dimensiones = VALUES(dimensiones),
          acabado = VALUES(acabado),
          color = VALUES(color),
          color_hex = VALUES(color_hex),
          descripcion1 = VALUES(descripcion1),
          descripcion2 = VALUES(descripcion2)
      `;
      await db
        .promise()
        .query(updateDetallesQuery, [
          productoId,
          material,
          dimensiones,
          acabado,
          color,
          color_hex,
          descripcion1,
          descripcion2,
        ]);

      // Manejo de imágenes principales
      const productPath = `Products/${productoId}/`;
      const imageNames = {
        imagenA: "a.webp",
        imagenB: "b.webp",
        imagenC: "c.webp",
        imagenD: "d.webp",
      };

      for (const [fieldName, fileName] of Object.entries(imageNames)) {
        const file = req.files[fieldName]?.[0] || null;

        if (file) {
          // Solo subir la imagen si existe un archivo cargado
          const imagePath = `${productPath}${fileName}`;
          await subirImagen(file, imagePath);
        }
      }

      // Procesar colores alternos
      const procesados = new Set();
      for (let i = 0; i < color_alterno.length; i++) {
        const colorId = parseInt(color_id[i], 10) || null;
        const colorValue = color_alterno[i]?.trim();
        const hexValue = hex_alterno[i]?.trim();
        const stockValue = parseInt(stock_alterno[i], 10) || 0;

        if (!colorValue || !hexValue || procesados.has(`${colorValue}-${hexValue}`)) continue;
        procesados.add(`${colorValue}-${hexValue}`);

        if (colorId) {
          // Actualizar color alterno existente
          await db.promise().query(
            `
              UPDATE ColoresAlternos
              SET color = ?, color_hex = ?, stock = ?
              WHERE color_id = ? AND producto_id = ?
            `,
            [colorValue, hexValue, stockValue, colorId, productoId]
          );

          // Manejo de imágenes para el color alterno
          const colorPath = `Colors/${productoId}/${colorId}/`;
          const alternoImageNames = {
            [`imagen_color_a[]`]: "a.webp",
            [`imagen_color_b[]`]: "b.webp",
            [`imagen_color_c[]`]: "c.webp",
            [`imagen_color_d[]`]: "d.webp",
          };

          for (const [fieldName, fileName] of Object.entries(alternoImageNames)) {
            const file = req.files[fieldName]?.[i] || null;

            if (file) {
              // Solo subir la imagen si existe un archivo cargado
              const imagePath = `${colorPath}${fileName}`;
              await subirImagen(file, imagePath);
            }
          }
        } else {
          // Insertar nuevo color alterno
          const [result] = await db.promise().query(
            `
              INSERT INTO ColoresAlternos (producto_id, color, color_hex, stock)
              VALUES (?, ?, ?, ?)
            `,
            [productoId, colorValue, hexValue, stockValue]
          );

          const newColorId = result.insertId;

          // Manejo de imágenes para el nuevo color alterno
          const colorPath = `Colors/${productoId}/${newColorId}/`;
          const alternoImageNames = {
            [`imagen_color_a[]`]: "a.webp",
            [`imagen_color_b[]`]: "b.webp",
            [`imagen_color_c[]`]: "c.webp",
            [`imagen_color_d[]`]: "d.webp",
          };

          for (const [fieldName, fileName] of Object.entries(alternoImageNames)) {
            const file = req.files[fieldName]?.[i] || null;

            if (file) {
              // Solo subir la imagen si existe un archivo cargado
              const imagePath = `${colorPath}${fileName}`;
              await subirImagen(file, imagePath);
            }
          }
        }
      }

      // Eliminar colores alternos según IDs
      if (eliminar_colores.length > 0) {
        const deleteQuery = `
          DELETE FROM ColoresAlternos 
          WHERE color_id IN (?) AND producto_id = ?
        `;
        await db.promise().query(deleteQuery, [eliminar_colores, productoId]);
      }

      res.json({
        success: true,
        message: "Producto y colores alternos actualizados correctamente.",
      });
    } catch (err) {
      console.error("Error al modificar el producto:", err);
      res.status(500).json({
        success: false,
        error: "Error al modificar el producto",
      });
    }
  }
);



//################################ Eliminar colores alternos #################################


app.delete('/colaborador/colores-alternos/eliminar/:colorId', authMiddleware, async (req, res) => {
  const colorId = parseInt(req.params.colorId, 10);

  if (!colorId) {
    return res.status(400).json({ success: false, error: 'ID de color alterno inválido.' });
  }

  try {
    // Buscar información del color alterno
    const [colorResult] = await db.promise().query('SELECT producto_id FROM ColoresAlternos WHERE color_id = ?', [colorId]);
    if (colorResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Color alterno no encontrado.' });
    }

    const productId = colorResult[0].producto_id;

    // Eliminar el color alterno de la base de datos
    const deleteColorQuery = 'DELETE FROM ColoresAlternos WHERE color_id = ?';
    const [deleteResult] = await db.promise().query(deleteColorQuery, [colorId]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'No se pudo eliminar el color alterno.' });
    }
    console.log(`Color alterno con ID ${colorId} eliminado de la base de datos.`);

    // Eliminar las imágenes del bucket asociadas al color alterno
    const colorFolderPath = `Colors/${productId}/${colorId}/`;
    const listParams = {
      Bucket: 'products',
      Prefix: colorFolderPath,
    };

    const listedObjects = await s3.send(new ListObjectsCommand(listParams));
    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      for (const object of listedObjects.Contents) {
        const deleteParams = {
          Bucket: 'products',
          Key: object.Key,
        };
        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log(`Eliminado del bucket: ${object.Key}`);
      }
    }

    res.json({ success: true, message: `Color alterno con ID ${colorId} y sus imágenes asociadas eliminados correctamente.` });
  } catch (error) {
    console.error('Error al eliminar el color alterno:', error.message);
    res.status(500).json({ success: false, error: 'Error interno al eliminar el color alterno.' });
  }
});


//################################# OBTENER PRODUCTO Y DETALLES ##################################################
// Ruta para obtener datos del producto, sus detalles y colores alternos
app.get('/colaborador/productos/data/:codigo', async (req, res) => {
  const codigoProducto = req.params.codigo;

  try {
    // Consultar datos del producto principal
    const [productoResult] = await db.promise().query(`
      SELECT 
        p.producto_id, 
        p.nombre, 
        p.precio, 
        p.categoria, 
        p.codigo, 
        p.stock, 
        pd.material, 
        pd.dimensiones, 
        pd.acabado, 
        pd.color AS color_principal, 
        pd.color_hex AS color_hex_principal, 
        pd.descripcion1, 
        pd.descripcion2
      FROM Productos p
      LEFT JOIN Productos_detalles pd ON p.producto_id = pd.producto_id
      WHERE p.codigo = ?
    `, [codigoProducto]);

    if (productoResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const producto = productoResult[0];

    // Consultar colores alternos y sus imágenes
    const [coloresAlternosResult] = await db.promise().query(`
      SELECT 
        c.color_id, 
        c.color, 
        c.color_hex, 
        c.stock,
        CONCAT('Colors/', c.producto_id, '/', c.color_id, '/a.webp') AS imagen_a,
        CONCAT('Colors/', c.producto_id, '/', c.color_id, '/b.webp') AS imagen_b,
        CONCAT('Colors/', c.producto_id, '/', c.color_id, '/c.webp') AS imagen_c,
        CONCAT('Colors/', c.producto_id, '/', c.color_id, '/d.webp') AS imagen_d
      FROM ColoresAlternos c
      INNER JOIN Productos p ON c.producto_id = p.producto_id
      WHERE p.codigo = ? AND c.color IS NOT NULL AND c.color_hex IS NOT NULL
    `, [codigoProducto]);

    // Filtrar cualquier fila que tenga datos incompletos
    const coloresAlternos = coloresAlternosResult.filter(color => 
      color.color && color.color_hex && color.stock !== null
    );

    res.json({ success: true, producto, coloresAlternos });
  } catch (err) {
    console.error('Error al obtener los datos del producto:', err);
    res.status(500).json({ success: false, error: 'Error al obtener los datos del producto' });
  }
});


//################################# SERVIR FORMULARIO DE MODIFICACIÓN ##################################################
// Ruta para servir la página de modificación del producto
app.get('/colaborador/productos/modificar', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/productos/modificar_producto.html'));
});

//####################################### COMPRAS MONITOREO Y MODIFICACION DESDE COLABORADOT #####################################

app.get('/colaborador/ordenes', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/ordenes.html'));
});

app.get('/colaborador/ordenes/data', authMiddleware, (req, res) => {
  const query = `
    SELECT 
      ordenes.orden_id,  -- Asegúrate de incluir este campo
      ordenes.numero_orden, 
      Usuarios.nombre AS cliente_nombre, 
      ordenes.referencia, 
      ordenes.fecha_orden 
    FROM ordenes
    INNER JOIN Usuarios ON ordenes.usuario_id = Usuarios.usuario_id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: 'Error fetching orders' });
    }

    res.json({ ordenes: results });
  });
});

app.get('/colaborador/ordenes/compras/:orden_id', authMiddleware, (req, res) => {
  const ordenId = req.params.orden_id;

  const query = `
    SELECT 
      c.compra_id,
      COALESCE(p.nombre, pc.nombre) AS producto_nombre, -- Muestra el nombre del producto normal o personalizado
      c.cantidad,
      c.fecha_compra,
      c.direccion_envio,
      c.estado,
      c.color -- 🔥 Se agregó la columna 'color' desde la tabla Compras
    FROM Compras c
    LEFT JOIN Productos p ON c.producto_id = p.producto_id
    LEFT JOIN ProductCostum pc ON c.CostumProduct_id = pc.CostumProduct_id
    WHERE c.orden_id = ?
  `;

  db.query(query, [ordenId], (err, results) => {
    if (err) {
      console.error('Error fetching purchases:', err);
      return res.status(500).json({ error: 'Error fetching purchases' });
    }

    res.json({ compras: results });
  });
});


app.get('/colaborador/compras/:ordenId', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/compras.html'));
});



app.get('/colaborador/compras/descargar-anexos/:CostumProduct_id', authMiddleware, (req, res) => {
  const CostumProductId = req.params.CostumProduct_id;

  // Ruta de la carpeta de CustomProducts
  const folderPath = path.join(__dirname, `public/CustomProducts/${CostumProductId}`);

  // Verificar que la carpeta existe
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Archivos no encontrados.' });
  }

  // Crear un archivo ZIP
  const zipFileName = `CustomProduct_${CostumProductId}_Anexos.zip`;
  const output = fs.createWriteStream(zipFileName);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Mayor compresión
  });

  // Manejar errores de archivo
  archive.on('error', (err) => {
    console.error('Error al crear el archivo ZIP:', err);
    res.status(500).json({ error: 'Error al crear el archivo ZIP.' });
  });

  // Enviar el archivo al cliente
  output.on('close', () => {
    res.download(zipFileName, () => {
      // Eliminar el archivo ZIP después de enviarlo
      fs.unlinkSync(zipFileName);
    });
  });

  archive.pipe(output);

  // Agregar todos los archivos de la carpeta al archivo ZIP
  archive.directory(folderPath, false);

  // Finalizar el proceso de compresión
  archive.finalize();
});


//####################################### crear compra #####################################ds

// Endpoint para verificar si el correo ya existe en la base de datos
app.post('/colaborador/ordenes/verificar-correo', authMiddleware, (req, res) => {
  const { correo } = req.body;

  if (!correo) {
      return res.status(400).json({ success: false, error: 'El correo es obligatorio.' });
  }

  db.query('SELECT usuario_id, nombre, telefono FROM Usuarios WHERE correo = ?', [correo], (err, results) => {
      if (err) {
          console.error('Error al verificar el correo:', err);
          return res.status(500).json({ success: false, error: 'Error interno del servidor al verificar el correo.' });
      }

      if (results.length > 0) {
          const usuario = results[0];
          res.json({
              success: true,
              registrado: true,
              datos: { nombre: usuario.nombre, telefono: usuario.telefono },
          });
      } else {
          res.json({ success: true, registrado: false });
      }
  });
});


// Endpoint para renderizar la página de crear orden
app.get('/colaborador/ordenes/crear', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/crear_orden.html'));
});

// Endpoint para pasar a la selección de productos después de agregar la dirección
app.post('/colaborador/ordenes/direccion', authMiddleware, (req, res) => {
  const { direccion, correo, nombre, telefono, referencia } = req.body;

  if (!direccion || !correo || !nombre || !telefono || !referencia) {
    return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
  }

  // Guardar dirección temporalmente en sesión (o una estructura similar)
  req.session.ordenTemporal = { direccion, correo, nombre, telefono, referencia };
  res.json({ success: true, message: 'Dirección registrada. Continúa con la selección de productos.' });
});

// Endpoint para renderizar la página de productos
app.get('/colaborador/ordenes/productos', authMiddleware, (req, res) => {
  if (!req.session.ordenTemporal) {
    return res.redirect('/colaborador/ordenes/crear'); // Redirige si no hay datos previos
  }
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/productos.html'));
});

// Endpoint para manejar la creación final de la orden
// Endpoint para manejar la creación final de la orden
// Endpoint para manejar la creación final de la orden
app.post('/colaborador/ordenes/finalizar', authMiddleware, async (req, res) => {
  const { productos } = req.body;

  if (!req.session.ordenTemporal) {
    return res.status(400).json({ success: false, error: 'No se encontraron datos de la orden.' });
  }

  if (!productos || productos.length === 0) {
    return res.status(400).json({ success: false, error: 'Debes agregar al menos un producto.' });
  }

  const { direccion, correo, nombre, telefono, referencia } = req.session.ordenTemporal;

  try {
    const [usuarioResult] = await db.promise().query(
      'SELECT usuario_id FROM Usuarios WHERE correo = ?',
      [correo]
    );

    let usuarioId = usuarioResult.length > 0 ? usuarioResult[0].usuario_id : null;

    if (!usuarioId) {
      const [nuevoUsuario] = await db.promise().query(
        'INSERT INTO Usuarios (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
        [nombre, correo, telefono, '']
      );
      usuarioId = nuevoUsuario.insertId;
    }

    const [ultimoNumero] = await db.promise().query(
      'SELECT numero_orden FROM ordenes ORDER BY orden_id DESC LIMIT 1'
    );
    const nuevoNumeroOrden = generarNumeroOrden(
      ultimoNumero.length > 0 ? ultimoNumero[0].numero_orden : 'ORD-0000'
    );

    const [nuevaOrden] = await db.promise().query(
      'INSERT INTO ordenes (numero_orden, usuario_id, referencia, fecha_orden) VALUES (?, ?, ?, NOW())',
      [nuevoNumeroOrden, usuarioId, referencia]
    );
    const ordenId = nuevaOrden.insertId;

    const compras = [];
    const registros = [];

    for (const producto of productos) {
      const { codigo, cantidad } = producto;

      // Obtener el product_id y precio basado en el código
      const [productoData] = await db.promise().query(
        `SELECT producto_id, precio FROM Productos WHERE codigo = ?`,
        [codigo]
      );

      if (productoData.length === 0) {
        return res.status(400).json({ success: false, error: `El producto con código ${codigo} no existe.` });
      }

      const { producto_id, precio } = productoData[0];

      // Agregar a la tabla Compras
      compras.push([
        producto_id,
        usuarioId,
        new Date(),
        1, // Estado por defecto
        direccion,
        cantidad,
        ordenId,
      ]);

      // Agregar a la tabla Registros
      registros.push([
        producto_id,
        'compra',
        new Date(),
        precio,
      ]);

      // Actualizar el stock
      if (producto.color_id) {
        // Si es un color alterno
        await db.promise().query(
          `UPDATE ColoresAlternos SET stock = stock - ? WHERE color_id = ? AND stock > 0`,
          [cantidad, producto.color_id]
        );
      } else {
        // Si es el producto principal
        await db.promise().query(
          `UPDATE Productos SET stock = stock - ? WHERE producto_id = ? AND stock > 0`,
          [cantidad, producto_id]
        );
      }
    }

    // Insertar las compras
    await db.promise().query(
      'INSERT INTO Compras (producto_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad, orden_id) VALUES ?',
      [compras]
    );

    // Insertar en registros
    await db.promise().query(
      'INSERT INTO Registros (product_id, evento, fecha, precio) VALUES ?',
      [registros]
    );

    req.session.ordenTemporal = null;
    res.json({ success: true, message: 'Orden creada exitosamente.' });
  } catch (err) {
    console.error('Error al procesar la orden:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

function generarNumeroOrden(ultimoNumero) {
  const hex = ultimoNumero.split('-')[1];
  const nuevoHex = (parseInt(hex, 16) + 1).toString(16).toUpperCase().padStart(4, '0');
  return `ORD-${nuevoHex}`;
}


//####################################### Modificar estado #####################################

// Endpoint para obtener los datos de una compra específica
app.get('/colaborador/compras/data/:compra_id', authMiddleware, (req, res) => {
  const compraId = req.params.compra_id;

  // Intentamos obtener la compra asociada a un producto normal primero
  const queryNormal = `
    SELECT Compras.compra_id, Productos.nombre AS producto_nombre, Compras.estado, Compras.FechaEstimada
    FROM Compras
    JOIN Productos ON Compras.producto_id = Productos.producto_id
    WHERE Compras.compra_id = ?
  `;

  db.query(queryNormal, [compraId], (err, results) => {
    if (err) {
      console.error('Error al obtener compra normal:', err);
      return res.status(500).json({ success: false, error: 'Error al obtener la compra' });
    }

    if (results.length > 0) {
      // Si encontramos una compra normal, devolvemos los datos
      return res.json({ success: true, compra: results[0] });
    }

    // Si no es una compra normal, intentamos obtener una compra costumizada
    const queryCostum = `
      SELECT Compras.compra_id, ProductCostum.nombre AS producto_nombre, Compras.estado, Compras.FechaEstimada
      FROM Compras
      JOIN ProductCostum ON Compras.CostumProduct_id = ProductCostum.CostumProduct_id
      WHERE Compras.compra_id = ?
    `;

    db.query(queryCostum, [compraId], (err, results) => {
      if (err) {
        console.error('Error al obtener compra costumizada:', err);
        return res.status(500).json({ success: false, error: 'Error al obtener la compra costumizada' });
      }

      if (results.length === 0) {
        // Si no se encuentra ninguna compra, devolvemos un error 404
        return res.status(404).json({ success: false, error: 'Compra no encontrada' });
      }

      // Si encontramos una compra costumizada, devolvemos los datos
      res.json({ success: true, compra: results[0] });
    });
  });
});

// Endpoint para mostrar la página de modificar estado
app.get('/colaborador/compras/modificar-estado/:compra_id', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/compras/modificar_estado.html'));
});

// Endpoint para actualizar el estado o la fecha estimada
app.post('/colaborador/compras/modificar-estado/:compra_id', authMiddleware, (req, res) => {
  const compraId = req.params.compra_id;
  const { estado, FechaEstimada } = req.body;

  // Validar que al menos uno de los campos tenga un valor
  if (!estado && !FechaEstimada) {
    return res.status(400).json({ success: false, error: 'Debe proporcionar un estado o una fecha estimada.' });
  }

  const updates = [];
  const values = [];

  if (estado) {
    updates.push('estado = ?');
    values.push(estado);
  }

  if (FechaEstimada) {
    updates.push('FechaEstimada = ?');
    values.push(FechaEstimada);
  }

  const query = `UPDATE Compras SET ${updates.join(', ')} WHERE compra_id = ?`;
  values.push(compraId);

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error al actualizar estado o fecha estimada:', err);
      return res.status(500).json({ success: false, error: 'Error al actualizar el estado o la fecha estimada.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada.' });
    }

    res.json({ success: true, message: 'Estado o fecha estimada actualizados correctamente.' });
  });
});



// ########################################## PRODUCTOS CUSTOMIZADOS
app.get('/colaborador/costumProductCrear', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/CostumProyects/crearCosProd.html'));
});




// ########################################## PRODUCTOS CUSTOMIZADOS
app.post(
  '/colaborador/productos/costumizado/crear',
  upload.fields([
    { name: 'imagen_principal', maxCount: 1 }, // Imagen principal obligatoria
    { name: 'archivos_anexos', maxCount: 5 }   // Hasta 5 archivos anexos opcionales
  ]),
  async (req, res) => {
    const { nombre, precio, material, dimensiones, acabado, cantidad, fecha_estimada } = req.body; // Campo debe coincidir con el frontend

    console.log("Request Body:", req.body); // Log del body del request

    // Validar campos requeridos
    if (!nombre || !precio || !material || !dimensiones || !acabado || !cantidad || !fecha_estimada) {
      console.error("Validation Error: Missing required fields");
      return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    }

    if (!req.files || !req.files['imagen_principal']) {
      console.error("Validation Error: Missing required image");
      return res.status(400).json({ success: false, error: 'La imagen principal es obligatoria.' });
    }

    try {
      const queryProductCostum = 'INSERT INTO ProductCostum (nombre, precio, material, dimensiones, acabado, cantidad) VALUES (?, ?, ?, ?, ?, ?)';
      const productValues = [nombre, precio, material, dimensiones, acabado, cantidad];

      db.query(queryProductCostum, productValues, async (err, results) => {
        if (err) {
          console.error('Error al crear producto customizado:', err.message);
          return res.status(500).json({ success: false, error: 'Error al crear producto customizado.' });
        }

        const costumProductId = results.insertId;
        console.log("Producto Customizado Creado, ID:", costumProductId);

        const productPath = `CustomProducts/${costumProductId}/`;

        // Manejo de la imagen principal
        const imagenPrincipal = req.files['imagen_principal'][0];
        const imagenPath = `${productPath}principal.webp`;
        const imagenParams = {
          Bucket: 'products',
          Key: imagenPath,
          Body: imagenPrincipal.buffer,
          ContentType: imagenPrincipal.mimetype
        };

        try {
          await s3.send(new PutObjectCommand(imagenParams));
          console.log(`Imagen principal subida correctamente: ${imagenPath}`);
        } catch (uploadError) {
          console.error('Error subiendo la imagen principal:', uploadError.message);
          return res.status(500).json({ success: false, error: 'Error al subir la imagen principal.' });
        }

        if (req.files['archivos_anexos']) {
          for (const [index, file] of req.files['archivos_anexos'].entries()) {
            const anexoPath = `${productPath}anexo_${index + 1}.${file.originalname.split('.').pop()}`;
            const anexoParams = {
              Bucket: 'products',
              Key: anexoPath,
              Body: file.buffer,
              ContentType: file.mimetype
            };

            try {
              await s3.send(new PutObjectCommand(anexoParams));
              console.log(`Archivo anexo subido correctamente: ${anexoPath}`);
            } catch (uploadError) {
              console.error(`Error subiendo archivo anexo ${index + 1}:`, uploadError.message);
              return res.status(500).json({ success: false, error: `Error al subir archivo anexo ${index + 1}` });
            }
          }
        }

        crearOrdenCostum(costumProductId, fecha_estimada); // Usar fecha_estimada correctamente
      });

      function crearOrdenCostum(costumProductId, fecha_estimada) {
        const { direccion, correo, nombre, telefono, referencia } = req.session.ordenTemporal;

        console.log("Datos de la sesión:", req.session.ordenTemporal);

        db.query('SELECT usuario_id FROM Usuarios WHERE correo = ?', [correo], (err, results) => {
          if (err) {
            console.error('Error al verificar cliente:', err);
            return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
          }

          const usuarioId = results.length > 0 ? results[0].usuario_id : null;
          console.log("Usuario ID:", usuarioId);

          if (!usuarioId) {
            db.query('INSERT INTO Usuarios (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
              [nombre, correo, telefono, ''],
              (err, result) => {
                if (err) {
                  console.error('Error al crear cliente:', err);
                  return res.status(500).json({ success: false, error: 'Error al registrar el cliente.' });
                }
                procesarOrden(result.insertId, costumProductId, fecha_estimada);
              }
            );
          } else {
            procesarOrden(usuarioId, costumProductId, fecha_estimada);
          }
        });
      }
      
      function procesarOrden(usuarioId, costumProductId, fecha_estimada) {
        const queryUltimoNumero = 'SELECT numero_orden FROM ordenes ORDER BY orden_id DESC LIMIT 1';
      
        db.query(queryUltimoNumero, (err, result) => {
          if (err) {
            console.error('Error al obtener el último número de orden:', err);
            return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
          }
      
          const ultimoNumero = result.length > 0 ? result[0].numero_orden : 'ORD-0000';
          const nuevoNumeroOrden = generarNumeroOrden(ultimoNumero);
      
          console.log("Nuevo Número de Orden:", nuevoNumeroOrden);
      
          const referencia = req.session.ordenTemporal?.referencia || 'Sin referencia';
      
          const queryOrden = 'INSERT INTO ordenes (numero_orden, usuario_id, referencia, fecha_orden) VALUES (?, ?, ?, NOW())';
      
          db.query(queryOrden, [nuevoNumeroOrden, usuarioId, referencia], (err, result) => {
            if (err) {
              console.error('Error al crear orden:', err);
              return res.status(500).json({ success: false, error: 'Error al crear la orden.' });
            }
      
            const ordenId = result.insertId;
            console.log("Orden Creada, ID:", ordenId);
      
            // Formatear dirección
            const direccion = req.session.ordenTemporal?.direccion || {};
            const direccionCompleta = `${direccion.calle}, ${direccion.ciudad}, ${direccion.estado}, ${direccion.codigoPostal}`;
      
            const queryCompraCostum = `
              INSERT INTO Compras (CostumProduct_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad, orden_id, FechaEstimada) 
              VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)
            `;
      
            const compraValues = [costumProductId, usuarioId, 0, direccionCompleta, cantidad, ordenId, fecha_estimada];
            console.log("Valores de CompraCostum:", compraValues);
      
            db.query(queryCompraCostum, compraValues, (err) => {
              if (err) {
                console.error('Error al registrar la compra del producto costumizado:', err.message);
                return res.status(500).json({ success: false, error: 'Error al registrar la compra.' });
              }
      
              console.log("CompraCostum registrada con éxito");
              req.session.ordenTemporal = null;
              res.json({ success: true, message: 'Producto costumizado creado y orden registrada exitosamente.', redirectUrl: '/colaborador/ordenes' });
            });
          });
        });
      }
      


      function generarNumeroOrden(ultimoNumero) {
        const hex = ultimoNumero.split('-')[1];
        const nuevoHex = (parseInt(hex, 16) + 1).toString(16).toUpperCase().padStart(4, '0');
        return `ORD-${nuevoHex}`;
      }
    } catch (err) {
      console.error('Error general al procesar el producto costumizado:', err.message);
      res.status(500).json({ success: false, error: 'Error general al procesar el producto costumizado.' });
    }
  }
);









































//###################################### SEGUIMIENTO 
app.get('/seguimiento', async (req, res) => {
  const userId = req.session.userId;

  // Verificar que el usuario esté autenticado
  if (!userId) {
    return res.redirect('/login');
  }

  const idCompra = req.query.id;

  try {
    // Obtener la compra
    const [compraResults] = await db.promise().query(
      'SELECT * FROM Compras WHERE compra_id = ?', [idCompra]
    );

    if (compraResults.length === 0) {
      return res.send('Compra no encontrada');
    }

    const compra = compraResults[0];

    let producto = {};
    let detalles = { material: 'No disponible', dimensiones: 'No disponible', acabado: 'No disponible' };
    let path_imagen = '';

    // Obtener dirección desde la base de datos
    const [direccionResults] = await db.promise().query(
      'SELECT * FROM Direcciones WHERE direccion_id = ?', [compra.direccion_envio]
    );
    const direccion = direccionResults.length > 0 ? direccionResults[0] : {};

    // Determinar si es un producto normal o costumizado
    if (compra.producto_id) {
      // Producto normal
      const [productoResults] = await db.promise().query(
        'SELECT * FROM Productos WHERE producto_id = ?', [compra.producto_id]
      );
      if (productoResults.length === 0) {
        return res.send('Producto no encontrado');
      }
      producto = productoResults[0];

      // Obtener los detalles del producto normal
      const [detallesResults] = await db.promise().query(
        'SELECT material, dimensiones, acabado FROM Productos_detalles WHERE producto_id = ?', 
        [compra.producto_id]
      );
      if (detallesResults.length > 0) {
        detalles = detallesResults[0];
      }

      // Verificar si el producto tiene un color alterno
      const [colorAlternoResults] = await db.promise().query(
        'SELECT color_id FROM ColoresAlternos WHERE producto_id = ? AND color = ?', 
        [compra.producto_id, compra.color]
      );
      const colorAlterno = colorAlternoResults.length > 0 ? colorAlternoResults[0].color_id : null;

      // Generar el path de la imagen dependiendo si es un color alterno o no
      path_imagen = colorAlterno
        ? `${CFI}/Colors/${compra.producto_id}/${colorAlterno}/a.webp`
        : `${CFI}/Products/${compra.producto_id}/a.webp`;
      
    } else if (compra.CostumProduct_id) {
      // Producto costumizado
      const [productoResults] = await db.promise().query(
        'SELECT * FROM ProductCostum WHERE CostumProduct_id = ?', [compra.CostumProduct_id]
      );
      if (productoResults.length === 0) {
        return res.send('Producto costumizado no encontrado');
      }
      producto = productoResults[0];

      // Obtener detalles del producto costumizado
      detalles = {
        material: producto.material || 'No disponible',
        dimensiones: producto.dimensiones || 'No disponible',
        acabado: producto.acabado || 'No disponible',
      };

      // Generar el path de la imagen para productos costumizados
      path_imagen = `${CFI}/CustomProducts/${compra.CostumProduct_id}/principal.webp`;
    } else {
      return res.send('Producto no encontrado');
    }

    // Formatear FechaEstimada a formato 10/ENE/2025
    let fechaEstimada = ''; // Valor por defecto si no hay FechaEstimada
    if (compra.FechaEstimada) {
      const opcionesFecha = { day: '2-digit', month: 'short', year: 'numeric' };
      fechaEstimada = new Date(compra.FechaEstimada).toLocaleDateString('es-ES', opcionesFecha).toUpperCase();
    }

    // Renderizar la página
    res.render('seguimiento', {
      idCompra,
      estado: compra.estado,
      producto: {
        ...producto,
        path_imagen, // Aseguramos que el path_imagen correcto es pasado al frontend
      },
      info: {
        ...detalles,
        color: compra.color || 'No disponible' // ✅ Ahora el color se toma directamente de Compras
      },
      direccion: {
        calle: direccion.calle || 'No especificado',
        colonia: direccion.colonia || 'No especificado', 
        ciudad: direccion.ciudad || 'No especificado',
        estado: direccion.estado || 'No especificado',
        codigoPostal: direccion.cp || 'No especificado',
      },
      fechaEstimada, // Pasar FechaEstimada al frontend
    });
  } catch (error) {
    console.error(`Error en la ruta /seguimiento: ${error.message}`);
    res.status(500).send('Error interno del servidor');
  }
});




//########################################## COMPRAS ##########################################
app.get('/compras', (req, res) => {
  const userId = req.session.userId;

  // Verificar que el usuario esté autenticado
  if (!userId) {
    return res.redirect('/login');
  }

  // Paso 1: Consultar las órdenes del usuario
  db.query('SELECT * FROM ordenes WHERE usuario_id = ?', [userId], (error, ordenes) => {
    if (error) {
      console.error('Error al consultar órdenes:', error);
      return res.status(500).send('Error interno del servidor');
    }

    if (ordenes.length === 0) {
      return res.render('compras', {
        ordenes: [],
        compras: [],
        mensaje: 'No se encontraron órdenes para este usuario.',
        searchQuery: '' // Asegurar `searchQuery` para evitar errores en el EJS
      });
    }

    // Paso 2: Obtener las compras relacionadas con las órdenes
    const ordenIds = ordenes.map(orden => orden.orden_id);

    const query = `
        SELECT 
          Compras.*, 
          Productos.nombre AS producto_nombre, 
          Productos.precio AS producto_precio, 
          Productos.categoria AS producto_categoria, 
          Productos.codigo AS producto_codigo,
          Productos_detalles.material AS producto_material,
          Productos_detalles.dimensiones AS producto_dimensiones,
          Productos_detalles.acabado AS producto_acabado,
          ColoresAlternos.color_id AS alterno_color_id,
          ColoresAlternos.color AS alterno_color,
          ColoresAlternos.color_hex AS alterno_color_hex,
          ProductCostum.nombre AS costum_nombre,
          ProductCostum.precio AS costum_precio,
          ProductCostum.material AS costum_material,
          ProductCostum.dimensiones AS costum_dimensiones,
          ProductCostum.acabado AS costum_acabado,
          Direcciones.calle AS direccion_calle,
          Direcciones.colonia AS direccion_colonia,
          Direcciones.ciudad AS direccion_ciudad,
          Direcciones.estado AS direccion_estado,
          Direcciones.cp AS direccion_cp
        FROM 
          Compras 
        LEFT JOIN 
          Productos 
        ON 
          Compras.producto_id = Productos.producto_id
        LEFT JOIN
          Productos_detalles
        ON
          Compras.producto_id = Productos_detalles.producto_id
        LEFT JOIN
          ColoresAlternos
        ON
          Compras.producto_id = ColoresAlternos.producto_id AND Compras.color = ColoresAlternos.color
        LEFT JOIN
          ProductCostum
        ON
          Compras.CostumProduct_id = ProductCostum.CostumProduct_id
        LEFT JOIN
          Direcciones
        ON
          Compras.direccion_envio = Direcciones.direccion_id
        WHERE 
          Compras.orden_id IN (?)
        ORDER BY Compras.orden_id DESC, Compras.compra_id DESC; -- 🔥 Aquí se ordenan primero las órdenes más recientes
      `;


      db.query(query, [ordenIds], (error, compras) => {
        if (error) {
          console.error('Error al consultar compras:', error);
          return res.status(500).send('Error interno del servidor');
        }
      
        if (compras.length === 0) {
          return res.render('compras', {
            ordenes,
            compras: [],
            mensaje: 'No se encontraron compras asociadas a las órdenes.',
            searchQuery: ''
          });
        }
      
        // Ordenar las órdenes por ID de forma descendente antes de renderizar
        ordenes.sort((a, b) => b.orden_id - a.orden_id);
      
        // Paso 3: Procesar las compras y renderizar
        const comprasConInfo = compras.map(compra => {
          let producto = {};
      
          // Determinar la ruta de la imagen
          let path_imagen = compra.alterno_color_id
            ? `${CFI}/Colors/${compra.producto_id}/${compra.alterno_color_id}/a.webp`
            : `${CFI}/Products/${compra.producto_id}/a.webp`;
      
          if (compra.producto_id) {
            // Producto normal o con color alterno
            producto = {
              nombre: compra.producto_nombre,
              precio: compra.producto_precio,
              categoria: compra.producto_categoria,
              codigo: compra.producto_codigo,
              path_imagen: path_imagen,
              material: compra.producto_material || 'No disponible',
              dimensiones: compra.producto_dimensiones || 'No disponible',
              acabado: compra.producto_acabado || 'No disponible',
              color: compra.alterno_color || compra.color || 'No disponible',
              color_hex: compra.alterno_color_hex || 'No disponible'
            };
          } else if (compra.CostumProduct_id) {
            // Producto customizado
            producto = {
              nombre: compra.costum_nombre,
              precio: compra.costum_precio,
              categoria: 'Costumizado',
              codigo: `COSTUM-${compra.CostumProduct_id}`,
              path_imagen: `${CFI}/CustomProducts/${compra.CostumProduct_id}/principal.webp`,
              material: compra.costum_material || 'No disponible',
              dimensiones: compra.costum_dimensiones || 'No disponible',
              acabado: compra.costum_acabado || 'No disponible',
              color: 'No disponible'
            };
          }
      
          return {
            ...compra,
            producto,
            direccion: {
              calle: compra.direccion_calle || 'N/A',
              colonia: compra.direccion_colonia || 'N/A',
              ciudad: compra.direccion_ciudad || 'N/A',
              estado: compra.direccion_estado || 'N/A',
              codigoPostal: compra.direccion_cp || 'N/A'
            }
          };
        });
      
        res.render('compras', {
          ordenes,  // Aquí ya están ordenadas
          compras: comprasConInfo,
          mensaje: null,
          searchQuery: ''
        });
      });
      
  });
});


app.get('/comprasbuscar', (req, res) => {
  const userId = req.session.userId;

  // Redireccionar ?=pablo a ?q=pablo
  if (req.query[''] && !req.query.q) {
    return res.redirect(`/comprasbuscar?q=${req.query['']}`);
  }

  const searchQuery = req.query.q || ''; // Captura 'q'

  if (!userId) {
    return res.redirect('/login');
  }

  // Consulta para buscar órdenes basadas en la referencia o productos
  const queryordenes = `
    SELECT 
      ordenes.orden_id,
      ordenes.numero_orden,
      ordenes.referencia,
      ordenes.fecha_orden
    FROM 
      ordenes
    LEFT JOIN 
      Compras
      ON ordenes.orden_id = Compras.orden_id
    LEFT JOIN 
      Productos
      ON Compras.producto_id = Productos.producto_id
    LEFT JOIN
      ProductCostum
      ON Compras.CostumProduct_id = ProductCostum.CostumProduct_id
    WHERE 
      ordenes.usuario_id = ? AND
      (ordenes.referencia LIKE ? OR Productos.nombre LIKE ? OR ProductCostum.nombre LIKE ?)
  `;

  const valuesordenes = [userId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];

  db.query(queryordenes, valuesordenes, (error, ordenes) => {
    if (error) {
      console.error('Error al consultar órdenes:', error);
      return res.status(500).send('Error interno del servidor');
    }

    if (ordenes.length === 0) {
      return res.render('compras', { ordenes: [], compras: [], mensaje: 'No se encontraron resultados.', searchQuery });
    }

    const ordenIds = Array.from(new Set(ordenes.map(orden => orden.orden_id))); // Eliminar duplicados

    // Consulta solo las compras que coinciden con el término buscado
    const queryCompras = `
      SELECT 
        Compras.*,
        COALESCE(Productos.nombre, ProductCostum.nombre) AS producto_nombre,
        COALESCE(Productos.precio, ProductCostum.precio) AS producto_precio,
        COALESCE(Productos.categoria, 'Costumizado') AS producto_categoria,
        COALESCE(Productos.codigo, 'N/A') AS producto_codigo,
        Productos.producto_id,
        ProductCostum.CostumProduct_id,
        COALESCE(Productos_detalles.material, ProductCostum.material) AS producto_material,
        COALESCE(Productos_detalles.dimensiones, ProductCostum.dimensiones) AS producto_dimensiones,
        COALESCE(Productos_detalles.acabado, ProductCostum.acabado) AS producto_acabado,
        COALESCE(Productos_detalles.color, ProductCostum.color) AS producto_color
      FROM 
        Compras
      LEFT JOIN 
        Productos 
      ON 
        Compras.producto_id = Productos.producto_id
      LEFT JOIN
        Productos_detalles
      ON
        Productos.producto_id = Productos_detalles.producto_id
      LEFT JOIN
        ProductCostum
      ON
        Compras.CostumProduct_id = ProductCostum.CostumProduct_id
      WHERE 
        Compras.orden_id IN (?) AND
        (Productos.nombre LIKE ? OR ProductCostum.nombre LIKE ?)
    `;
  

    const valuesCompras = [ordenIds, `%${searchQuery}%`, `%${searchQuery}%`];

    db.query(queryCompras, valuesCompras, (error, compras) => {
      if (error) {
        console.error('Error al consultar compras:', error);
        return res.status(500).send('Error interno del servidor');
      }

      const comprasConInfo = compras.map((compra) => {
        const direccionParts = compra.direccion_envio.split(', ');
        const isCostumProduct = compra.CostumProduct_id !== null;

        return {
          ...compra,
          producto: {
            nombre: compra.producto_nombre,
            precio: compra.producto_precio,
            categoria: compra.producto_categoria,
            codigo: compra.producto_codigo,
            path_imagen: isCostumProduct
              ? `${CFI}/CustomProducts/${compra.CostumProduct_id}/principal.webp`
              : `${CFI}/Products/${compra.producto_id}/a.webp`,
            material: compra.producto_material || 'No disponible',
            dimensiones: compra.producto_dimensiones || 'No disponible',
            acabado: compra.producto_acabado || 'No disponible',
            color: compra.producto_color || 'No disponible',
          },
          direccion: {
            calle: direccionParts[0] || 'N/A',
            ciudad: direccionParts[1] || 'N/A',
            estado: direccionParts[2] || 'N/A',
            codigoPostal: direccionParts[3] || 'N/A',
          },
        };
      });

      res.render('compras', {
        ordenes,
        compras: comprasConInfo,
        mensaje: null,
        searchQuery,
      });
    });
  });
});



//########################################## Catálogo ##################################################
app.get('/producto', async (req, res) => {
  const productoId = req.query.id;

  try {
    // Obtener disponibilidad mediante la función
    

    // Paso 1: Consultar el producto en la base de datos
    const [productoResult] = await db.promise().query(
      'SELECT * FROM Productos WHERE producto_id = ?',
      [productoId]
    );

    if (productoResult.length === 0) {
      return res.status(404).send('Producto no encontrado');
    }

    const producto = productoResult[0];

    // Paso 2: Consultar los detalles del producto en la tabla Productos_detalles
    const [detallesResult] = await db.promise().query(
      'SELECT * FROM Productos_detalles WHERE producto_id = ?',
      [productoId]
    );

    const detalles = detallesResult.length > 0 ? detallesResult[0] : {};

    // **Registrar la visita en la tabla Registros**
    const queryInsertVisita = `
      INSERT INTO Registros (product_id, evento, fecha, precio)
      SELECT ?, 'visita', NOW(), precio
      FROM Productos
      WHERE producto_id = ?
    `;
    await db.promise().query(queryInsertVisita, [productoId, productoId]);

    // Paso 3: Consultar las compras del último mes
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

    const [comprasMes] = await db.promise().query(
      `SELECT DATE(fecha) AS fecha, MAX(precio) AS precio
       FROM Registros
       WHERE product_id = ? 
         AND fecha IS NOT NULL
         AND fecha >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) -- 🔥 Solo últimos 30 días
         AND (evento = 'compra' OR evento = 'sim') -- Filtra por compra o sim
       GROUP BY DATE(fecha)
       ORDER BY fecha ASC`,
      [productoId, lastMonthDate]
    );

    const chartData = comprasMes.map((compra) => ({
      time: compra.fecha.toISOString().split('T')[0],
      value: compra.precio,
    }));

    console.log('Datos obtenidos para chartData:', chartData);

    // Paso 4: Seleccionar productos relacionados
    const [relatedProducts] = await db.promise().query(
      'SELECT * FROM Productos WHERE categoria = ? AND producto_id != ? ORDER BY RAND() LIMIT 3',
      [producto.categoria, productoId]
    );

    // Renderizar la plantilla EJS con los datos del producto y disponibilidad
    res.render('producto', {
      producto,
      descripcion1: detalles.descripcion1 || 'No disponible',
      descripcion2: detalles.descripcion2 || 'No disponible',
      material: detalles.material || 'No disponible',
      dimensiones: detalles.dimensiones || 'No disponible',
      acabado: detalles.acabado || 'No disponible',
      color: detalles.color || 'No disponible',
      productosRelacionados: relatedProducts,
      chartData,
      
    });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).send('Error interno del servidor');
  }
});
// Endpoint para colores con stock y disponibilidad



app.get('/colores', async (req, res) => {
  const productoId = req.query.id;

  try {
    if (!productoId) {
      return res.status(400).json({ error: 'Falta el parámetro "id".' });
    }

    // Buscar el color principal y su información desde Productos_detalles
    const [detallesResult] = await db.promise().query(
      'SELECT color_hex, color FROM Productos_detalles WHERE producto_id = ?',
      [productoId]
    );

    if (detallesResult.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en detalles.' });
    }

    // Obtener el stock del producto principal desde la tabla Productos
    const [productoStockResult] = await db.promise().query(
      'SELECT stock FROM Productos WHERE producto_id = ?',
      [productoId]
    );

    if (productoStockResult.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const stockPrincipal = productoStockResult[0].stock;

    const colorPrincipal = {
      color_id: null, // El color principal no tiene un ID específico
      color_hex: detallesResult[0].color_hex,
      color: detallesResult[0].color || 'Color Principal',
      ruta_imagenes: `${CFI}/Products/${productoId}`,
      disponible: stockPrincipal > 0, // Disponibilidad basada en el stock
    };

    // Buscar colores alternos y sus stocks desde ColoresAlternos
    const [coloresAlternosResult] = await db.promise().query(
      'SELECT color_id, color_hex, color, stock FROM ColoresAlternos WHERE producto_id = ?',
      [productoId]
    );

    const coloresAlternos = coloresAlternosResult.map((color) => ({
      color_id: color.color_id,
      color_hex: color.color_hex,
      color: color.color || 'Color Alterno',
      ruta_imagenes: `${CFI}/Colors/${productoId}/${color.color_id}`,
      disponible: color.stock > 0, // Disponibilidad basada en el stock
    }));

    // Enviar todos los colores (principal + alternos) junto con su disponibilidad
    res.json({
      success: true,
      colores: [colorPrincipal, ...coloresAlternos],
    });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});



app.get('/catalogo', (req, res) => {
  const productosPorPagina = 15;
  const paginaActual = parseInt(req.query.page) || 1;
  const offset = (paginaActual - 1) * productosPorPagina;
  const categoriaSeleccionada = req.query.categoria || 'Todos';
  const searchQuery = req.query.query || '';

  let queryProductos = 'SELECT producto_id, nombre, precio, codigo, stock, categoria FROM Productos';
  let values = [];
  let whereConditions = [];

  // Agregar filtros dinámicos
  if (categoriaSeleccionada !== 'Todos') {
      whereConditions.push('categoria = ?');
      values.push(categoriaSeleccionada);
  }
  if (searchQuery) {
      whereConditions.push('(nombre LIKE ? OR codigo LIKE ?)');
      values.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  // Agregar la cláusula WHERE solo si hay condiciones
  if (whereConditions.length > 0) {
      queryProductos += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Agregar paginación
  queryProductos += ' LIMIT ? OFFSET ?';
  values.push(productosPorPagina, offset);

  db.query(queryProductos, values, (err, productos) => {
      if (err) {
          console.error('Error fetching products:', err);
          return res.status(500).send('Error fetching products');
      }

      productos.forEach(producto => {
          producto.imagePath = `${CFI}/Products/${producto.producto_id}/a.webp`;
      });

      // **Consulta de conteo corregida**
      let queryCount = 'SELECT COUNT(*) AS total FROM Productos';
      let countValues = [...values]; // Copiar los valores

      if (whereConditions.length > 0) {
          queryCount += ' WHERE ' + whereConditions.join(' AND ');
      } else {
          countValues = []; // Si no hay condiciones, evitar valores basura
      }

      db.query(queryCount, countValues, (err, countResults) => {
          if (err) {
              console.error('Error counting products:', err);
              return res.status(500).send('Error counting products');
          }

          const totalProductos = countResults[0].total;
          const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

          // Obtener categorías correctamente
          let queryCategorias = 'SELECT categoria, COUNT(*) AS cantidad FROM Productos GROUP BY categoria';

          db.query(queryCategorias, (err, categorias) => {
              if (err) {
                  console.error('Error fetching categories:', err);
                  return res.status(500).send('Error fetching categories');
              }

              // Obtener total de productos sin filtrar
              db.query('SELECT COUNT(*) AS cantidad FROM Productos', (err, resultadoTotal) => {
                  if (err) {
                      console.error('Error fetching total product count:', err);
                      return res.status(500).send('Error fetching total product count');
                  }

                  categorias.unshift({ categoria: 'Todos', cantidad: resultadoTotal[0].cantidad });

                  // Renderizar la vista con datos corregidos
                  res.render('catalogo', {
                      productos: productos,
                      paginaActual: paginaActual,
                      totalPaginas: totalPaginas,
                      categorias: categorias,
                      categoriaSeleccionada: categoriaSeleccionada,
                      searchQuery: searchQuery
                  });
              });
          });
      });
  });
});




app.get('/buscar', (req, res) => {
  const searchQuery = req.query.query; 
  const productosPorPagina = 12;
  const paginaActual = parseInt(req.query.page) || 1;
  const offset = (paginaActual - 1) * productosPorPagina;

  let query = `
      SELECT producto_id, nombre, precio, codigo, stock, categoria 
      FROM Productos 
      WHERE (nombre LIKE ? OR codigo LIKE ?) 
      LIMIT ? OFFSET ?
  `;

  const values = [`%${searchQuery}%`, `%${searchQuery}%`, productosPorPagina, offset];

  db.query(query, values, (err, results) => {
      if (err) {
          console.error('Error durante la búsqueda:', err);
          return res.status(500).send('Error al obtener productos');
      }

      // **Corrección en la consulta de conteo**
      let countQuery = `SELECT COUNT(*) AS total FROM Productos WHERE (nombre LIKE ? OR codigo LIKE ?)`;
      let countValues = [`%${searchQuery}%`, `%${searchQuery}%`];

      db.query(countQuery, countValues, (err, countResults) => {
          if (err) {
              console.error('Error contando productos:', err);
              return res.status(500).send('Error al contar productos');
          }

          const totalProductos = countResults[0].total;
          const totalPaginas = Math.ceil(totalProductos / productosPorPagina);

          res.render('catalogo', {
              productos: results,
              paginaActual: paginaActual,
              totalPaginas: totalPaginas,
              searchQuery: searchQuery
          });
      });
  });
});



//################################################## INICIO DE SESION ##################################################


app.use(express.urlencoded({ extended: true }));
app.use(express.json());



// Middleware global para que el correo del usuario esté disponible en todas las vistas
app.use((req, res, next) => {
  res.locals.correo = req.session.correo || null; // Si hay una sesión activa, pasa el correo del usuario, si no, es null
  next();
});


// Ruta para mostrar la página de inicio de sesión
app.get('/login', (req, res) => {
  res.render('login'); // Renderiza la vista login.ejs
});

// Ruta para mostrar la página de creación de cuenta
app.get('/crear-cuenta', (req, res) => {
  res.render('crear-cuenta'); // Renderiza la vista crear-cuenta.ejs
});


// Ruta para verificar el estado de la sesión
// Ruta para verificar el estado de la sesión
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    // Si hay una sesión activa, devolver el correo del usuario
    res.json({ isAuthenticated: true, correo: req.session.correo });
  } else {
    // Si no hay una sesión activa
    res.json({ isAuthenticated: false });
  }
});

// Ruta para manejar el inicio de sesión
// Ruta para manejar el inicio de sesión
app.post('/login', (req, res) => {
  //console.log('Datos recibidos del formulario:', req.body);
  const { correo, password } = req.body;

  if (!correo || !password) {
      console.error('Faltan datos:', req.body);
      return res.status(400).send('Correo y contraseña son obligatorios');
  }

  db.query('SELECT * FROM Usuarios WHERE correo = ?', [correo], (err, results) => {
      if (err) {
          //console.error('Error fetching user:', err);
          return res.status(500).send('Error interno del servidor');
      }

      if (results.length === 0) {
          //console.warn('Usuario no encontrado:', correo);
          return res.status(401).send('Correo o contraseña incorrectos');
      }

      const user = results[0];

      //console.log('Contraseña ingresada:', password);
      //console.log('Contraseña almacenada:', user.password);

      bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
              console.error('Error comparing passwords:', err);
              return res.status(500).send('Error interno del servidor');
          }

          if (!isMatch) {
              console.warn('Contraseña no coincide para el usuario:', correo);
              return res.status(401).send('Correo o contraseña incorrectos');
          }

          req.session.userId = user.usuario_id;
          req.session.nombre = user.nombre;
          req.session.correo = user.correo;

          console.log('Inicio de sesión exitoso:', user.nombre);
          res.redirect('/');
      });
  });
});

app.post('/crear-cuenta', (req, res) => {
  const { nombre, correo, telefono, password } = req.body;

  // Verifica que todos los campos estén presentes
  if (!correo || !password) {
    return res.status(400).send('El correo y la contraseña son obligatorios');
  }

  // Verifica si el correo ya está en uso
  db.query('SELECT * FROM Usuarios WHERE correo = ?', [correo], (err, results) => {
    if (err) {
      console.error('Error verificando el correo:', err);
      return res.status(500).send('Error interno del servidor');
    }

    if (results.length > 0) {
      const usuario = results[0];

      // Si el correo ya está asociado a una cuenta con contraseña
      if (usuario.password && usuario.password.trim() !== '') {
        return res.status(400).send('El correo ya está asociado a una cuenta existente');
      }

      // Si el correo está asociado a una cuenta sin contraseña
      // Permitir actualizar los datos y asignar una contraseña
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error encriptando la contraseña:', err);
          return res.status(500).send('Error interno del servidor');
        }

        // Actualiza los datos en la base de datos
        db.query(
          'UPDATE Usuarios SET nombre = ?, telefono = ?, password = ? WHERE correo = ?',
          [nombre || usuario.nombre, telefono || usuario.telefono, hashedPassword, correo],
          (err) => {
            if (err) {
              console.error('Error actualizando los datos del usuario:', err);
              return res.status(500).send('Error al actualizar la cuenta');
            }

            // Redirige al usuario a la página de inicio de sesión
            res.redirect('/login');
          }
        );
      });
    } else {
      // Si el correo no está en uso, crea un nuevo usuario
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error encriptando la contraseña:', err);
          return res.status(500).send('Error interno del servidor');
        }

        // Inserta el nuevo usuario en la base de datos
        db.query(
          'INSERT INTO Usuarios (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
          [nombre, correo, telefono, hashedPassword],
          (err) => {
            if (err) {
              console.error('Error creando el usuario:', err);
              return res.status(500).send('Error al crear la cuenta');
            }

            // Redirige al usuario a la página de inicio de sesión
            res.redirect('/login');
          }
        );
      });
    }
  });
});


app.get('/logout', (req, res) => {
  // Renderiza una página que pide confirmación
  res.render('confirm_logout'); // Enviamos la vista confirm_logout.ejs
});

app.post('/logout', (req, res) => {
  // Solo se ejecuta si el usuario confirma
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error al cerrar la sesión');
    }
    // Redirige al usuario al inicio después de cerrar sesión
    res.redirect('/');
  });
});

//############################### PAGINA HOME ######################################
app.get('/', async (req, res) => {
  const productosPorPagina = 7; // Mostrar los 7 productos más recientes
  const queryRecientes = `
    SELECT producto_id, nombre, precio, codigo, categoria, stock 
    FROM Productos 
    WHERE stock > 0 
    ORDER BY created_at DESC 
    LIMIT 6`;

  const queryDestacados = `
    SELECT producto_id, nombre, precio, codigo, categoria, stock 
    FROM Productos 
    WHERE destacado = 1 
    LIMIT 6`; // Mostrar 6 productos destacados

  // Colores pastel predefinidos
  const colores = [
    '#C4A7E7', // Morado pastel
    '#F2A1A1', // Rojo pastel
    '#F6C28B', // Naranja pastel
    '#FDE9A9', // Amarillo pastel
    '#A5D1CE', // Verde pastel
    '#A8C6EA', // Azul pastel
  ];

  try {
    // Obtener productos destacados
    const destacados = await db.promise().query(queryDestacados);
    destacados[0].forEach((producto, index) => {
      producto.imagePath = `${CFI}/Products/${producto.producto_id}/a.webp`;
      producto.color = colores[index % colores.length]; // Asignar color basado en el índice
    });

    // Obtener productos recientes
    const recientes = await db.promise().query(queryRecientes);
    recientes[0].forEach(producto => {
      producto.imagePath = `${CFI}/Products/${producto.producto_id}/a.webp`;
    });

    // Renderizar la vista 'index.ejs' con ambos conjuntos de productos
    res.render('index', { recientes: recientes[0], destacados: destacados[0] });
  } catch (err) {
    console.error('Error al cargar los datos:', err);
    res.status(500).send('Error interno del servidor');
  }
});

//############################### HISTORIAL DE PRODUCTO #############################
app.get('/producto-historial/:id', async (req, res) => {
  const productoId = req.params.id;

  try {
    // 🔥 Nueva consulta con JOIN para obtener el nombre del producto
    const [historial] = await db.promise().query(
      `SELECT 
        DATE(r.fecha) AS fecha, 
        MAX(r.precio) AS precio, 
        (
            SELECT nombre 
            FROM Productos 
            WHERE producto_id = ? 
              AND nombre NOT LIKE '%ALT%' -- 🔥 Filtra nombres que NO contengan "ALT"
            LIMIT 1
        ) AS nombre_producto
    FROM Registros r
    WHERE r.product_id = ? 
      AND r.fecha IS NOT NULL
      AND r.fecha >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) -- Solo últimos 30 días
      AND (r.evento = 'compra' OR r.evento = 'sim') -- Filtra por compra o sim
    GROUP BY DATE(r.fecha)
    ORDER BY fecha ASC;
`,
      [productoId, productoId]
    );
    

    // Formatear los datos para la gráfica con el nombre incluido
    const chartData = historial.map(registro => ({
      time: registro.fecha.toISOString().split('T')[0],
      value: registro.precio,
      nombre: registro.nombre_producto // 🔥 Ahora enviamos el nombre del producto
    }));

    res.json(chartData); // Enviar los datos de la gráfica como JSON
  } catch (err) {
    console.error('Error al obtener historial de precios:', err);
    res.status(500).send('Error interno del servidor');
  }
});






app.use(async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    // Incrementar contador o insertar registro para la fecha actual
    await db.promise().query(
      `
      INSERT INTO Visitas (fecha, cantidad)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE cantidad = cantidad + 1
      `,
      [today]
    );
    //console.log(`Visita registrada para la fecha: ${today}`);
  } catch (err) {
    console.error('Error al registrar visita:', err);
  }
  next(); // Continuar con la siguiente ruta
});


//################################ COSTUM PEDIDOS######################################


app.use('/static', express.static(path.join(__dirname, 'src')));


// Endpoint para obtener muebles de referencia desde la base de datos
app.get("/api/muebles", (req, res) => {
  const query = "SELECT producto_id AS id, nombre FROM Productos";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener muebles:", err);
      return res.status(500).json({ error: "Error al obtener los muebles." });
    }
    res.json(results);
  });
});
app.post("/pedido-custom", upload.array("images"), async (req, res) => {
  const { name, email, phone, referenceItem, description, dimensions, material, finish, generalNotes } = req.body;
  const images = req.files || [];

  // Email receptor (correo de los colaboradores)
  const recipientEmail = "dmasmasdz@gmail.com";
  let attachments = [];

  // Procesar imágenes como adjuntos
  if (images.length) {
    attachments = images.map((file, index) => ({
      filename: `imagen_${index + 1}.${file.mimetype.split("/")[1]}`, // Nombre dinámico
      content: file.buffer,
    }));
  }

  // Contenido del correo
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; border-radius: 10px; color: #333;">
      <h2 style="color: #8EAA6D;">Nuevo Pedido Personalizado</h2>
      <p><strong>Nombre del Cliente:</strong> ${name}</p>
      <p><strong>Correo del Cliente:</strong> ${email}</p>
      <p><strong>Teléfono del Cliente:</strong> ${phone}</p>
      <p><strong>Mueble de Referencia:</strong> ${referenceItem || "No especificado"}</p>
      <p><strong>Descripción:</strong> ${description}</p>
      <p><strong>Medidas:</strong> ${dimensions}</p>
      <p><strong>Material:</strong> ${material}</p>
      <p><strong>Acabado:</strong> ${finish}</p>
      <p><strong>Notas Generales:</strong> ${generalNotes || "Sin notas adicionales."}</p>
      ${
        attachments.length
          ? `<h3>Imágenes de Referencia:</h3><p>Se han adjuntado ${attachments.length} imagen(es).</p>`
          : "<p><strong>No se subieron imágenes.</strong></p>"
      }
    </div>
  `;

  // Configuración de Nodemailer
   // Configuración del transportador de Nodemailer
   const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dmasmasdz@gmail.com", // Tu correo
      pass: "lwqm ksts hhxy yfxy", // Contraseña generada
    },
  });
  
  // Opciones del correo
  const mailOptions = {
    from: '"Pedido Personalizado" <tu_correo@gmail.com>',
    to: recipientEmail,
    subject: `Nuevo Pedido Personalizado de ${name}`,
    html: htmlContent,
    attachments, // Adjuntar imágenes
  };

  // Enviar correo
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado:", info.response);
    res.json({ success: true, message: "Pedido enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar el pedido" });
  }
});


//###################### ESTADISTICAS ######################
app.get('/api/estadisticas', authMiddleware , async (req, res) => {
  try {
    // Obtener el parámetro de límite, por defecto será 5
    const limite = parseInt(req.query.limite) || 5;

    // Obtener visitas generales por día
    const [visitasPorDia] = await db.promise().query(`
      SELECT DATE(fecha) AS fecha, SUM(cantidad) AS total
      FROM Visitas
      GROUP BY DATE(fecha)
      ORDER BY fecha ASC
    `);

    // Top productos más vendidos
    const [topVendidos] = await db.promise().query(`
      SELECT Productos.nombre, COUNT(Registros.product_id) AS totalVentas
      FROM Registros
      JOIN Productos ON Registros.product_id = Productos.producto_id
      WHERE Registros.evento = "compra"
      GROUP BY Registros.product_id
      ORDER BY totalVentas DESC
      LIMIT ?
    `, [limite]);

    // Top productos más visitados
    const [topVisitados] = await db.promise().query(`
      SELECT Productos.nombre, COUNT(Registros.product_id) AS totalVisitas
      FROM Registros
      JOIN Productos ON Registros.product_id = Productos.producto_id
      WHERE Registros.evento = "visita" AND Registros.product_id IS NOT NULL
      GROUP BY Registros.product_id
      ORDER BY totalVisitas DESC
      LIMIT ?
    `, [limite]);

    // Categorías más compradas
    const [categoriasCompradas] = await db.promise().query(`
      SELECT Productos.categoria, COUNT(Registros.product_id) AS totalCompras
      FROM Registros
      JOIN Productos ON Registros.product_id = Productos.producto_id
      WHERE Registros.evento = "compra"
      GROUP BY Productos.categoria
      ORDER BY totalCompras DESC
      LIMIT ?
    `, [limite]);

    res.json({
      visitasPorDia,
      topVendidos,
      topVisitados,
      categoriasCompradas,
    });
  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).send('Error interno del servidor');
  }
});



//################################### Clientes 


app.get('/colaborador/clientes', authMiddleware,  (req, res) => {
  // Renderiza el archivo HTML
  res.sendFile(path.join(__dirname, 'src/colaborador/clientes.html'));
});

app.get('/api/colaborador/clientes', (req, res) => {
  // Ruta para enviar los datos en formato JSON
  const query = `
      SELECT 
          u.nombre,
          u.correo,
          u.telefono,
          COUNT(c.usuario_id) AS numero_compras
      FROM 
          Usuarios u
      LEFT JOIN 
          Compras c
      ON 
          u.usuario_id = c.usuario_id
      GROUP BY 
          u.usuario_id;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Error ejecutando la consulta:', err);
          return res.status(500).json({ error: 'Error al obtener los datos de los clientes' });
      }
      res.json(results);
  });
});

app.get('/perfil', (req, res) => {
  const userId = req.session.userId;

  // Verificar que el usuario esté autenticado
  if (!userId) {
    return res.redirect('/login');
  }

  // Obtener información del usuario desde la base de datos
  const query = `SELECT nombre, telefono FROM Usuarios WHERE usuario_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error al obtener datos del usuario:', err);
      return res.status(500).send('Error al obtener datos del usuario');
    }

    if (results.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Renderizar la página de perfil con los datos del usuario
    const user = results[0];
    res.render('perfil', { user });
  });
});


app.post('/api/update-profile', (req, res) => {
  const userId = req.session.userId;
  const { name, phone } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const query = `UPDATE Usuarios SET nombre = ?, telefono = ? WHERE usuario_id = ?`;
  db.query(query, [name, phone, userId], (err, results) => {
    if (err) {
      console.error('Error al actualizar el perfil:', err);
      return res.status(500).json({ message: 'Error al actualizar el perfil' });
    }

    res.json({ message: 'Perfil actualizado correctamente' });
  });
});


app.get('/api/direcciones', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const query = `SELECT direccion_id, nombre_direccion, calle, colonia, ciudad, estado, cp FROM Direcciones WHERE usuario_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error al obtener direcciones:', err);
      return res.status(500).json({ message: 'Error al obtener direcciones' });
    }

    res.json(results);
  });
});


app.delete('/api/direcciones/:id', (req, res) => {
  const userId = req.session.userId;
  const direccionId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const query = `DELETE FROM Direcciones WHERE direccion_id = ? AND usuario_id = ?`;

  db.query(query, [direccionId, userId], (err, result) => {
    if (err) {
      console.error('Error al eliminar dirección:', err);
      return res.status(500).json({ message: 'Error al eliminar dirección' });
    }

    res.json({  });
  });
});
app.post('/api/direcciones', (req, res) => {
  const userId = req.session.userId;
  const { nombre_direccion, calle, colonia, ciudad, estado, cp } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const query = `INSERT INTO Direcciones (usuario_id, nombre_direccion, calle, colonia, ciudad, estado, cp) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [userId, nombre_direccion, calle, colonia, ciudad, estado, cp], (err) => {
    if (err) {
      console.error('Error al agregar dirección:', err);
      return res.status(500).json({ message: 'Error al agregar dirección' });
    }

    res.status(204).send(); // No devuelve contenido si se agregó correctamente
  });
});



//################################### grafica dibujar ######################

//################################### grafica dibujar ######################

// Endpoint para servir la página
app.get('/colaborador/grafica', authMiddleware,  (req, res) => {
  res.sendFile(path.join(__dirname, 'src/colaborador/graficaDraw.html'));
});

// Obtener los registros de un producto usando su código
app.get('/api/registros/:codigo', async (req, res) => {
  const { codigo } = req.params;

  try {
    // Obtener el product_id asociado al código
    const [[producto]] = await db.promise().query(
      `SELECT producto_id FROM Productos WHERE codigo = ?`,
      [codigo]
    );

    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }

    const productId = producto.producto_id;

    // Obtener los registros para ese product_id
    const [registros] = await db.promise().query(
      `SELECT id, fecha, precio, evento
       FROM Registros
       WHERE product_id = ? AND (evento = 'compra' OR evento = 'sim')
       ORDER BY fecha ASC`,
      [productId]
    );

    const registrosFormateados = registros.map((r) => ({
      ...r,
      fecha: r.fecha.toISOString().split('T')[0],
    }));

    res.json({ success: true, registros: registrosFormateados });
  } catch (error) {
    console.error('Error al obtener los registros:', error);
    res.status(500).json({ success: false, error: 'Error al obtener los registros.' });
  }
});

// Sincronizar registros para un producto usando su código
app.post('/api/registros/:codigo/sync', async (req, res) => {
  const { codigo } = req.params;
  const { registros } = req.body;

  if (!Array.isArray(registros)) {
    return res.status(400).json({ success: false, error: 'Datos inválidos.' });
  }

  try {
    // Obtener el product_id asociado al código
    const [[producto]] = await db.promise().query(
      `SELECT producto_id FROM Productos WHERE codigo = ?`,
      [codigo]
    );

    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }

    const productId = producto.producto_id;

    await db.promise().query('START TRANSACTION');

    await db.promise().query(
      `DELETE FROM Registros WHERE product_id = ? AND (evento = 'compra' OR evento = 'sim')`,
      [productId]
    );

    const valores = registros.map(({ fecha, precio }) => {
      const formattedFecha = new Date(fecha).toISOString().split('T')[0];
      return [productId, 'sim', formattedFecha, parseFloat(precio) || 0.0];
    });

    if (valores.length > 0) {
      await db.promise().query(
        `INSERT INTO Registros (product_id, evento, fecha, precio) VALUES ?`,
        [valores]
      );
    }

    await db.promise().query('COMMIT');

    res.json({ success: true, message: 'Registros sincronizados correctamente.' });
  } catch (error) {
    await db.promise().query('ROLLBACK');
    console.error('Error al sincronizar los registros:', error);
    res.status(500).json({ success: false, error: `Error al sincronizar los registros: ${error.message}` });
  }
});


//#################### carrito de compras ######################

app.get('/carrito', (req, res) => {
  res.render('carrito');
});


app.get('/api/carrito', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
  }

  const query = `
    SELECT 
      c.id AS carrito_id,
      c.cantidad,
      c.color AS color_carrito,
      p.producto_id,
      p.nombre AS producto_nombre,
      p.precio AS producto_precio,
      p.categoria AS producto_categoria,
      p.codigo AS producto_codigo,
      p.stock AS stock_producto,
      pd.color AS producto_color_principal,
      pd.color_hex AS producto_color_hex,
      ca.color_id AS alterno_color_id,
      ca.color AS alterno_color,
      ca.color_hex AS alterno_color_hex,
      ca.stock AS stock_alterno
    FROM carrito c
    LEFT JOIN Productos p ON c.producto_id = p.producto_id
    LEFT JOIN Productos_detalles pd ON c.producto_id = pd.producto_id
    LEFT JOIN ColoresAlternos ca ON c.producto_id = ca.producto_id AND c.color = ca.color
    WHERE c.usuario_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error al obtener el carrito:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener el carrito.' });
    }

    const carrito = results.map((item) => {
      const esPrincipal = item.color_carrito === item.producto_color_principal;
      const stockDisponible = esPrincipal ? item.stock_producto : item.stock_alterno;

      return {
        carrito_id: item.carrito_id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        precio: parseFloat(item.producto_precio),
        categoria: item.producto_categoria,
        codigo: item.producto_codigo,
        color: esPrincipal ? item.producto_color_principal : item.alterno_color,
        color_hex: esPrincipal ? item.producto_color_hex : item.alterno_color_hex,
        cantidad: item.cantidad,
        stock: stockDisponible,
        disponibilidad: item.cantidad > stockDisponible
          ? 'Entrega en 10-14 días'
          : 'Disponible para envío inmediato',
        path_imagen: esPrincipal
          ? `${CFI}/Products/${item.producto_id}/a.webp`
          : `${CFI}/Colors/${item.producto_id}/${item.alterno_color_id}/a.webp`,
      };
    });

    res.json({ success: true, carrito });
  });
});





// borrar del carrito
app.delete('/api/carrito/:carritoId', (req, res) => {
  const carritoId = req.params.carritoId;

  // Verificar que se envíe un ID válido
  if (!carritoId) {
    return res.status(400).json({ success: false, message: 'ID del carrito no proporcionado.' });
  }

  const query = `
    DELETE FROM carrito
    WHERE id = ?
  `;

  db.query(query, [carritoId], (err, result) => {
    if (err) {
      console.error('Error al eliminar el producto del carrito:', err);
      return res.status(500).json({ success: false, message: 'Error al eliminar el producto del carrito.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Elemento no encontrado en el carrito.' });
    }

    res.json({ success: true, message: 'Producto eliminado del carrito correctamente.' });
  });
});



app.put('/api/carrito/:carritoId',  (req, res) => {
  const { carritoId } = req.params;
  const { cantidad } = req.body;

  if (!carritoId || typeof cantidad !== 'number' || cantidad <= 0) {
    return res.status(400).json({ success: false, message: 'Datos inválidos.' });
  }

  const queryStock = `
    SELECT c.color, p.stock AS stock_producto, ca.stock AS stock_alterno
    FROM carrito c
    LEFT JOIN Productos p ON c.producto_id = p.producto_id
    LEFT JOIN ColoresAlternos ca ON c.producto_id = ca.producto_id AND c.color = ca.color
    WHERE c.id = ?
  `;

  db.query(queryStock, [carritoId], (err, results) => {
    if (err) {
      console.error('Error al verificar el stock:', err);
      return res.status(500).json({ success: false, message: 'Error al verificar el stock.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en el carrito.' });
    }

    const item = results[0];
    const stockDisponible = item.stock_alterno !== null ? item.stock_alterno : item.stock_producto;

    // Determinar la disponibilidad
    const disponibilidad =
      cantidad > stockDisponible
        ? 'Entrega en 10-14 días'
        : 'Disponible para envío inmediato';

    const updateQuery = 'UPDATE carrito SET cantidad = ? WHERE id = ?';
    db.query(updateQuery, [cantidad, carritoId], (err) => {
      if (err) {
        console.error('Error al actualizar la cantidad:', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar la cantidad.' });
      }

      res.json({
        success: true,
        message: 'Cantidad actualizada correctamente.',
        disponibilidad,
        stockDisponible,
      });
    });
  });
});



// Endpoint para añadir al carrito
app.post('/addToCart/:product_id', async (req, res) => {
  const { product_id } = req.params; // ID del producto desde el URL
  const { color_name = null } = req.body; // Nombre del color seleccionado
  const userId = req.session.userId; // ID del usuario desde la sesión actual

  // Verificar que el usuario esté autenticado
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado.' });
  }

  try {
    let colorNombre = color_name;

    // Validar si el color existe
    if (colorNombre) {
      const [colorCheck] = await db.promise().query(
        `SELECT 1 
         FROM Productos_detalles 
         WHERE producto_id = ? AND color = ?
         UNION
         SELECT 1 
         FROM ColoresAlternos 
         WHERE producto_id = ? AND color = ?`,
        [product_id, colorNombre, product_id, colorNombre]
      );

      if (colorCheck.length === 0) {
        return res.status(404).json({ success: false, error: 'Color no encontrado.' });
      }
    } else {
      const [defaultColor] = await db.promise().query(
        'SELECT color FROM Productos_detalles WHERE producto_id = ?',
        [product_id]
      );

      if (defaultColor.length === 0) {
        return res.status(404).json({ success: false, error: 'Color principal no encontrado.' });
      }

      colorNombre = defaultColor[0].color;
    }

    // Insertar un nuevo registro en la tabla carrito
    const queryInsertCarrito = `
      INSERT INTO carrito (usuario_id, producto_id, cantidad, color)
      VALUES (?, ?, ?, ?)
    `;

    // Ejecutar la consulta para insertar en el carrito
    await db.promise().query(queryInsertCarrito, [userId, product_id, 1, colorNombre]);

    res.json({
      success: true,
      message: 'Producto añadido al carrito exitosamente.',
      color: colorNombre,
    });
  } catch (err) {
    console.error('Error al añadir al carrito:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});



//     direcciones


// 🔹 Obtener todas las direcciones del usuario (solo para el carrito)
app.get("/api/direccionesCarrito", (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Usuario no autenticado." });
  }

  const query = "SELECT * FROM Direcciones WHERE usuario_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("❌ Error al obtener direcciones (Carrito):", err);
      return res.status(500).json({ success: false, message: "Error al obtener direcciones." });
    }

    
    res.json(results);
  });
});


// 🔹 Endpoint para seleccionar una dirección de envío en el carrito
app.put("/api/direccionesCarrito/seleccionar", (req, res) => {
  const userId = req.session.userId;
  const { direccion_id } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Usuario no autenticado." });
  }

  if (!direccion_id) {
    return res.status(400).json({ success: false, message: "ID de dirección no proporcionado." });
  }

  // 🔹 Primero, poner todas las direcciones en 'f' (falso)
  const queryReset = "UPDATE Direcciones SET Seleccionada = 'f' WHERE usuario_id = ?";
  db.query(queryReset, [userId], (err) => {
    if (err) {
      console.error("❌ Error al actualizar direcciones (Carrito):", err);
      return res.status(500).json({ success: false, message: "Error interno del servidor." });
    }

    // 🔹 Ahora, poner la dirección seleccionada en 't' (true)
    const querySet = "UPDATE Direcciones SET Seleccionada = 't' WHERE direccion_id = ? AND usuario_id = ?";
    db.query(querySet, [direccion_id, userId], (err) => {
      if (err) {
        console.error("❌ Error al seleccionar dirección (Carrito):", err);
        return res.status(500).json({ success: false, message: "Error interno del servidor." });
      }
      res.json({ success: true });
    });
  });
});






// ############################# Compra en línea #######################
app.post('/api/orden/crear', async (req, res) => {
  const userId = req.session.userId;
  const { referencia } = req.body; // 📌 Recibimos la referencia desde el frontend

  if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
  }

  if (!referencia || referencia.trim() === "") {
      return res.status(400).json({ success: false, message: 'La referencia no puede estar vacía.' });
  }

  try {
      // 🔹 Obtener los productos en el carrito
      const [carrito] = await db.promise().query(
          `SELECT c.id AS carrito_id, c.producto_id, c.cantidad, c.color,
                  p.nombre AS producto_nombre, p.precio, p.stock AS stock_principal,
                  ca.color_id AS alterno_color_id, ca.stock AS stock_alterno
           FROM carrito c
           LEFT JOIN Productos p ON c.producto_id = p.producto_id
           LEFT JOIN ColoresAlternos ca ON c.producto_id = ca.producto_id AND c.color = ca.color
           WHERE c.usuario_id = ?`,
          [userId]
      );

      if (carrito.length === 0) {
          return res.status(400).json({ success: false, message: 'El carrito está vacío.' });
      }

      // 🔹 Obtener la dirección seleccionada (`Seleccionada = 't'`)
      const [direccionData] = await db.promise().query(
          `SELECT direccion_id FROM Direcciones WHERE usuario_id = ? AND Seleccionada = 't'`,
          [userId]
      );

      console.log("📌 Dirección seleccionada:", direccionData); // 🔍 Verificar en consola

      if (direccionData.length === 0) {
          return res.status(400).json({ success: false, message: 'No tienes una dirección seleccionada para la compra.' });
      }

      const direccionId = direccionData[0].direccion_id;

      // 🔹 Calcular el precio total de la orden
      let precioTotal = carrito.reduce((total, producto) => {
          return total + (producto.precio * producto.cantidad);
      }, 0);

      console.log("💰 Precio total de la orden:", precioTotal); // 🔍 Verificar total en consola

      // 🔹 Generar número de orden
      const [ultimoNumero] = await db.promise().query(
          'SELECT numero_orden FROM ordenes ORDER BY orden_id DESC LIMIT 1'
      );
      const nuevoNumeroOrden = generarNumeroOrden(
          ultimoNumero.length > 0 ? ultimoNumero[0].numero_orden : 'ORD-0000'
      );

      // 🔹 Crear la orden en la base de datos con `precioTotal` y `referencia`
      const [nuevaOrden] = await db.promise().query(
          'INSERT INTO ordenes (numero_orden, usuario_id, referencia, fecha_orden, precioTotal) VALUES (?, ?, ?, NOW(), ?)',
          [nuevoNumeroOrden, userId, referencia, precioTotal]
      );
      const ordenId = nuevaOrden.insertId;

      const compras = [];
      const registros = [];

        // 🔹 Procesar cada producto en el carrito
      for (const producto of carrito) {
        compras.push([
            producto.producto_id,
            userId,
            new Date(),
            0, // Estado = 0 (nuevo valor por defecto)
            direccionId, // Guardamos el ID en lugar de la dirección completa
            producto.cantidad,
            ordenId,
            producto.color // Guardamos el color del carrito en la compra
        ]);

        registros.push([
            producto.producto_id,
            'compra',
            new Date(),
            producto.precio
        ]);

        // 🔹 Verificar si el producto está en ColoresAlternos o Productos
        if (producto.alterno_color_id) {
            await db.promise().query(
                `UPDATE ColoresAlternos SET stock = stock - ? WHERE color_id = ?`,
                [producto.cantidad, producto.alterno_color_id]
            );
        } else {
            await db.promise().query(
                `UPDATE Productos SET stock = stock - ? WHERE producto_id = ?`,
                [producto.cantidad, producto.producto_id]
            );
        }
      }

      // 🔹 Guardar la compra en la base de datos incluyendo el `color`
      await db.promise().query(
        'INSERT INTO Compras (producto_id, usuario_id, fecha_compra, estado, direccion_envio, cantidad, orden_id, color) VALUES ?',
        [compras]
      );


      // 🔹 Guardar registro del evento de compra
      await db.promise().query(
          'INSERT INTO Registros (product_id, evento, fecha, precio) VALUES ?',
          [registros]
      );

      // 🔹 Vaciar el carrito después de la compra
      await db.promise().query('DELETE FROM carrito WHERE usuario_id = ?', [userId]);

      res.json({ success: true, message: 'Orden creada exitosamente.', ordenId, precioTotal });

  } catch (err) {
      console.error('❌ Error al procesar la orden:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});



// ##################### notificaciones PAra informar a la empresa

app.post('/api/notificacion/empresa', async (req, res) => {
  const { ordenId, usuarioId, compras, direccion } = req.body;

  if (!ordenId || !usuarioId || !compras || compras.length === 0) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para la notificación.' });
  }

  try {
      const [usuarioData] = await db.promise().query(
          'SELECT nombre, correo, telefono FROM Usuarios WHERE usuario_id = ?',
          [usuarioId]
      );

      if (usuarioData.length === 0) {
          return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      const usuario = usuarioData[0];
      const productosHTML = compras.map(c => `<li>${c[5]}x ${c[1]}</li>`).join('');

      const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
              user: 'dmasmasdz@gmail.com',
              pass: 'Dmasmas123'
          }
      });

      const mailOptions = {
          from: 'dmasmasdz@gmail.com',
          to: EMPRESA_EMAIL,
          subject: `Nueva orden #${ordenId}`,
          html: `
              <h2>Nueva compra realizada</h2>
              <p>Se ha realizado una nueva compra con la orden <strong>${ordenId}</strong>.</p>
              <h3>Datos del cliente:</h3>
              <p><strong>Nombre:</strong> ${usuario.nombre}</p>
              <p><strong>Correo:</strong> ${usuario.correo}</p>
              <p><strong>Teléfono:</strong> ${usuario.telefono}</p>
              <h3>Dirección de envío:</h3>
              <p>${direccion}</p>
              <h3>Productos comprados:</h3>
              <ul>${productosHTML}</ul>
          `
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error al enviar correo a la empresa:', error);
          } else {
              console.log('Correo enviado a la empresa:', info.response);
          }
      });

      res.json({ success: true, message: 'Notificación enviada a la empresa.' });
  } catch (err) {
      console.error('Error al notificar a la empresa:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});


//#################################################### bolsa de valores  ##############################################

const cron = require('node-cron');

// Función para registrar el precio de cada producto en la tabla Registros
async function registrarPreciosDiarios() {
  try {
    // Obtener todos los productos con su precio actual
    const [productos] = await db.promise().query(`
      SELECT producto_id, precio FROM Productos
    `);

    if (productos.length === 0) {
      console.log("No hay productos para registrar.");
      return;
    }

    // Obtener la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];

    // Crear registros de tipo "sim" para cada producto
    const registros = productos.map(producto => [
      producto.producto_id,
      'sim',
      hoy,
      producto.precio
    ]);

    // Insertar los registros en la tabla Registros
    const query = `
      INSERT INTO Registros (product_id, evento, fecha, precio)
      VALUES ?
    `;

    await db.promise().query(query, [registros]);

    console.log(`Se registraron ${productos.length} precios del día ${hoy}.`);
  } catch (err) {
    console.error('Error al registrar los precios diarios:', err);
  }
}

// 🔥 Programar la ejecución automática **cada día a las 23:59**
cron.schedule('59 23 * * *', async () => {
  console.log("⏳ Ejecutando registro automático de precios diarios...");
  await registrarPreciosDiarios();
}, {
  timezone: "America/Mexico_City" // Asegurar que se ejecuta en el huso horario correcto
});






// Configuración de parámetros ajustables
const CONFIG = {
  COEFICIENTE_AUMENTO: 0.005, // Factor de aumento por demanda
  PORCENTAJE_BAJA: 0.02, // Factor de reducción si no hay ventas
  MARGEN_MAXIMO: 1.1, // 10% sobre el precio original
  MARGEN_MINIMO: 0.9, // 10% bajo el precio original
  VENTAS_UMBRAL_ALTO: 5, // Ventas necesarias para aumentar el precio
  VENTAS_UMBRAL_BAJO: 1, // Ventas necesarias para mantener el precio
};

// **Tarea programada para ejecutarse el primer día de cada mes a las 00:00:01**
cron.schedule('1 0 1 * *', async () => {
  console.log("🔄 Iniciando ajuste de precios según las compras del mes...");

  try {
    // Obtener todos los productos con BV = 1 (solo los que deben cambiar de precio)
    const [productos] = await db.promise().query(
      `SELECT producto_id, precio, precioOG FROM Productos WHERE BV = 1`
    );

    if (productos.length === 0) {
      console.log("❌ No hay productos con BV = 1 para actualizar.");
      return;
    }

    for (let producto of productos) {
      const productoId = producto.producto_id;
      const precioActual = parseFloat(producto.precio);
      const precioBase = parseFloat(producto.precioOG);

      // Obtener el número de compras en los últimos 30 días
      const [[ventas]] = await db.promise().query(
        `SELECT COUNT(*) AS ventas_mes FROM Registros 
         WHERE product_id = ? AND evento = 'compra' 
         AND fecha >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`,
        [productoId]
      );

      const ventasMes = ventas.ventas_mes || 0;
      console.log(`📊 Producto ID ${productoId}: ${ventasMes} compras en los últimos 30 días.`);

      let nuevoPrecio = precioActual;

      if (ventasMes > CONFIG.VENTAS_UMBRAL_ALTO) {
        // Si hay muchas ventas, incrementar con la fórmula logarítmica
        nuevoPrecio = Math.min(
          precioBase * CONFIG.MARGEN_MAXIMO,  
          precioActual * (1 + CONFIG.COEFICIENTE_AUMENTO * Math.log(1 + ventasMes))
        );
      } else if (ventasMes >= CONFIG.VENTAS_UMBRAL_BAJO) {
        // Si hay pocas ventas, mantener el precio actual
        nuevoPrecio = precioActual;
      } else {
        // Si no hubo ventas, reducir el precio un porcentaje fijo
        nuevoPrecio = Math.max(
          precioBase * CONFIG.MARGEN_MINIMO,  
          precioActual * (1 - CONFIG.PORCENTAJE_BAJA)
        );
      }

      // Asegurar que el precio es válido antes de actualizar
      if (!isNaN(nuevoPrecio) && nuevoPrecio !== precioActual) {
        await db.promise().query(
          `UPDATE Productos SET precio = ? WHERE producto_id = ?`,
          [nuevoPrecio, productoId]
        );

        console.log(`✅ Producto ID ${productoId}: Precio actualizado a $${nuevoPrecio.toFixed(2)}`);

        // **Registrar el nuevo precio en la tabla Registros como "sim"**
        await db.promise().query(
          `INSERT INTO Registros (product_id, evento, fecha, precio) VALUES (?, 'sim', CURDATE(), ?)`,
          [productoId, nuevoPrecio]
        );

        console.log(`📝 Evento "sim" registrado para el producto ${productoId} con precio $${nuevoPrecio.toFixed(2)}`);
      } else {
        console.log(`🔹 Producto ID ${productoId}: No se realizaron cambios en el precio.`);
      }
    }
  } catch (error) {
    console.error("❌ Error al ajustar precios:", error);
  }
});

console.log("🚀 Cron job de ajuste de precios programado para el 1ero de cada mes a las 00:00:01!");



//test de valores
app.post('/api/actualizar-precio/130', async (req, res) => {
  const productoId = 130;

  try {
      // Obtener el precio actual y el precio base
      const [[producto]] = await db.promise().query(
          `SELECT precio, precioOG FROM Productos WHERE producto_id = ?`, 
          [productoId]
      );

      if (!producto) {
          console.error(`❌ Producto con ID ${productoId} no encontrado.`);
          return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
      }

      console.log(`📌 Producto encontrado: ID ${productoId}, Precio Actual: $${producto.precio}, Precio Base (OG): $${producto.precioOG}`);

      // Obtener cuántas ventas ha tenido en el último mes
      const [[ventas]] = await db.promise().query(
          `SELECT COUNT(*) AS ventas_mes, MIN(fecha) AS fecha_inicio, MAX(fecha) AS fecha_fin 
           FROM Registros 
           WHERE product_id = ? AND evento = 'compra' 
           AND fecha >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`, 
          [productoId]
      );

      const ventasMes = ventas.ventas_mes || 0;
      const fechaInicio = ventas.fecha_inicio || 'No hay registros';
      const fechaFin = ventas.fecha_fin || 'No hay registros';

      console.log(`📊 Ventas en el último mes para el producto ${productoId}: ${ventasMes} compras registradas entre ${fechaInicio} y ${fechaFin}`);

      // Calcular el nuevo precio basado en el algoritmo
      let nuevoPrecio = parseFloat(producto.precio); // Asegurar que sea un número

      if (ventasMes > 5) {
          nuevoPrecio = Math.min(
              parseFloat(producto.precioOG) * 1.1, // Máximo 10% sobre precioOG
              parseFloat(producto.precio) * (1 + 0.078 * Math.log(1 + ventasMes))
          );
      }

      console.log(`🔢 Nuevo precio calculado: $${nuevoPrecio.toFixed(2)}`);

      // Validar que nuevoPrecio es un número válido antes de guardarlo
      if (isNaN(nuevoPrecio)) {
          console.error("❌ Error: nuevoPrecio es NaN, no se puede actualizar.");
          return res.status(500).json({ success: false, error: "Cálculo de precio inválido." });
      }

      // Guardar el nuevo precio en la base de datos
      await db.promise().query(
          `UPDATE Productos SET precio = ? WHERE producto_id = ?`,
          [nuevoPrecio, productoId]
      );

      console.log(`✅ Precio del producto ID ${productoId} actualizado a $${nuevoPrecio.toFixed(2)} correctamente.`);

      // 🔥 **Registrar el cambio en la tabla Registros**
      await db.promise().query(
          `INSERT INTO Registros (product_id, evento, fecha, precio) VALUES (?, 'sim', CURDATE(), ?)`,
          [productoId, nuevoPrecio]
      );

      console.log(`📝 Evento "sim" registrado en Registros con el nuevo precio de $${nuevoPrecio.toFixed(2)}`);

      res.json({ success: true, nuevo_precio: nuevoPrecio.toFixed(2) });

  } catch (error) {
      console.error("❌ Error al actualizar el precio:", error);
      res.status(500).json({ success: false, error: "Error al actualizar el precio." });
  }
});



app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});