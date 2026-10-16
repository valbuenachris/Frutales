#!/bin/bash

# Configuración (Usando la ruta real de tu servidor)
COMPOSE_DIR="/home/ubuntu/proyectos-docker/opencode/workspace/frutales"
BACKUP_DIR="$COMPOSE_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/frutales_db_$DATE.sql.gz"

# Asegurar que el directorio de backups exista
mkdir -p "$BACKUP_DIR"

echo "🔄 Iniciando respaldo de la base de datos frutales..."

# Ejecutar pg_dump dentro del contenedor de la base de datos
# Nota: Usamos las variables del .env si están cargadas, o las hardcodeamos si es necesario.
# Lo más seguro es leerlas del .env de la carpeta del proyecto.
source "$COMPOSE_DIR/.env"

docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Verificar si el comando tuvo éxito
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
  echo "✅ Respaldo completado exitosamente: $BACKUP_FILE"
  
  # Eliminar respaldos más antiguos de 7 días para ahorrar espacio
  find "$BACKUP_DIR" -type f -name "frutales_db_*.sql.gz" -mtime +7 -delete
  echo "🧹 Limpieza de respaldos antiguos completada."
else
  echo "❌ Error al realizar el respaldo. Revisa los logs o si el contenedor 'db' está corriendo."
  exit 1
fi
