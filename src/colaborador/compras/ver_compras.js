const express = require('express');
const router = express.Router();
const { db } = require('../../../config');

// Ruta para obtener las compras con paginación
router.get('/ver', (req, res) => {
  const comprasPorPagina = 10;
  const paginaActual = parseInt(req.query.page) || 1;
  const offset = (paginaActual - 1) * comprasPorPagina;

  const queryCompras = `
    SELECT Compras.fecha_compra, Productos.nombre AS producto, Usuarios.nombre AS cliente, Compras.cantidad, Compras.estado 
    FROM Compras 
    JOIN Usuarios ON Compras.usuario_id = Usuarios.usuario_id 
    JOIN Productos ON Compras.producto_id = Productos.producto_id 
    LIMIT ? OFFSET ?
  `;

  db.query(queryCompras, [comprasPorPagina, offset], (err, compras) => {
    if (err) {
      console.error('Error al obtener las compras:', err);
      return res.status(500).send('Error interno del servidor');
    }

    // Consulta para obtener el total de compras
    db.query('SELECT COUNT(*) AS total FROM Compras', (err, result) => {
      if (err) {
        console.error('Error al contar las compras:', err);
        return res.status(500).send('Error interno del servidor');
      }

      const totalCompras = result[0].total;
      const totalPaginas = Math.ceil(totalCompras / comprasPorPagina);

      res.json({
        compras,
        paginaActual,
        totalPaginas
      });
    });
  });
});

module.exports = router;
