<?php
// Conexión a la base de datos
$servername = "localhost";
$username = "root";
$password = "RiasSempai123"; // La contraseña que usaste para MySQL
$dbname = "MiBaseDeDatos";

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Obtener el nuevo valor del botón
$nuevoValor = $_POST['valor'];

// Actualizar el valor en la base de datos
$sql = "UPDATE Datos SET valor = $nuevoValor WHERE id = '463912'";
if ($conn->query($sql) === TRUE) {
    echo "Valor actualizado correctamente";
} else {
    echo "Error al actualizar el valor: " . $conn->error;
}

// Cerrar conexión
$conn->close();
?>
