#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push

echo "Generating Prisma client..."
npx prisma generate

echo "Seeding database..."
npx prisma db seed

echo "Starting app..."
npm run dev