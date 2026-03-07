#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push

echo "Seeding database..."
npx prisma db seed

echo "Starting app..."
npm run dev