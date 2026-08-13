#!/bin/sh
set -e

if [ -f "/app/node_modules/prisma/build/index.js" ]; then
  echo "[entrypoint] running prisma migrate deploy..."
  node /app/node_modules/prisma/build/index.js migrate deploy \
    --schema=/app/packages/db/prisma/schema.prisma
else
  echo "[entrypoint] prisma CLI missing; skip migrate"
fi

exec node apps/server/server.js
