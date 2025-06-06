#!/bin/bash

# Update system packages
sudo apt-get update

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service manually since systemd is not available
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/14/main -l /var/lib/postgresql/14/main/logfile start

# Wait a moment for PostgreSQL to start
sleep 3

# Create a database user and database for the project
sudo -u postgres createuser --createdb --login freelance_user 2>/dev/null || true
sudo -u postgres createdb freelance_tracker 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER freelance_user PASSWORD 'password';" 2>/dev/null || true

# Navigate to project directory
cd /mnt/persist/workspace

# Install dependencies from existing package.json or create basic structure
if [ -f "package.json" ]; then
    npm install
else
    echo "No package.json found, initializing basic Next.js project structure"
    npm init -y
    npm install next@latest react@latest react-dom@latest
    npm install -D typescript @types/react @types/node @types/react-dom
    npm install @prisma/client prisma
    npm install tailwindcss postcss autoprefixer
fi

# Install Prisma CLI locally instead of globally
npm install -D prisma

# Initialize Prisma if not already done
if [ ! -f "prisma/schema.prisma" ]; then
    npx prisma init
fi

# Set up environment variables if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "DATABASE_URL=\"postgresql://freelance_user:password@localhost:5432/freelance_tracker\"" > .env
    echo "NEXTAUTH_SECRET=\"your-secret-key\"" >> .env
    echo "NEXTAUTH_URL=\"http://localhost:3000\"" >> .env
fi

# Update package.json scripts for development
if [ -f "package.json" ]; then
    npm pkg set scripts.dev="next dev"
    npm pkg set scripts.build="next build"
    npm pkg set scripts.start="next start"
    npm pkg set scripts.lint="next lint"
fi

# Add Node.js and npm to PATH in user profile
echo 'export PATH="/usr/bin:$PATH"' >> $HOME/.profile
echo 'export NODE_PATH="/usr/lib/node_modules"' >> $HOME/.profile

# Source the profile to make changes available
source $HOME/.profile

echo "Setup completed successfully!"
echo "PostgreSQL is running and database 'freelance_tracker' is ready"
echo "Next.js project is set up with Prisma ORM"
echo "You can now run 'npm run dev' to start the development server"