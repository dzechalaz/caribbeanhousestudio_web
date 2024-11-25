const { S3Client, ListObjectsCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Configuración del cliente de S3 para Cloudflare R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://9da33335d2c28a44cc8e07d04747ed4c.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'a8a5ce4145688c3d1ed0212da9e362d1', // Reemplaza con tu Access Key
    secretAccessKey: '2cd1ebbf7b8812d92f85904620328dcb474ea864f14c294ec88a9952faa663a0', // Reemplaza con tu Secret Key
  },
});

const bucketName = 'products'; // Nombre de tu bucket
const folderPath = 'Products/37/'; // Ruta de la carpeta que quieres eliminar

async function deleteFolder() {
  try {
    // Listar los objetos dentro de la carpeta
    const listParams = {
      Bucket: bucketName,
      Prefix: folderPath,
    };

    const listedObjects = await s3.send(new ListObjectsCommand(listParams));

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log('No se encontraron objetos para eliminar en la carpeta:', folderPath);
      return;
    }

    // Eliminar cada objeto dentro de la carpeta
    for (const object of listedObjects.Contents) {
      const deleteParams = {
        Bucket: bucketName,
        Key: object.Key,
      };
      await s3.send(new DeleteObjectCommand(deleteParams));
      console.log(`Objeto eliminado: ${object.Key}`);
    }

    console.log(`Carpeta "${folderPath}" eliminada correctamente del bucket "${bucketName}".`);
  } catch (error) {
    console.error('Error al eliminar la carpeta:', error.message);
  }
}

deleteFolder();
