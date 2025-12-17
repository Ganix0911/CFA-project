#!/bin/bash

echo "🚀 TableTopLive Backend Installation Script"
echo "==========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB:"
    echo "   Local: mongod"
    echo "   Or configure MongoDB Atlas in .env"
fi

# Check if Stockfish is installed
if ! command -v stockfish &> /dev/null; then
    echo "❌ Stockfish is not installed."
    echo "   macOS: brew install stockfish"
    echo "   Ubuntu: sudo apt-get install stockfish"
    echo "   Or download from: https://stockfishchess.org/download/"
    exit 1
fi

echo "✅ Stockfish $(stockfish --help | head -1) detected"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env .env.backup 2>/dev/null || true
    cat > .env << EOL
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tabletoplive
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
STOCKFISH_PATH=$(which stockfish)
EOL
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start MongoDB: mongod"
echo "2. Start the server: npm run dev"
echo "3. Server will be available at: http://localhost:3001"
echo ""
echo "Health check: curl http://localhost:3001/health"