#!/bin/bash

echo "🚀 Setting up RouteMatrix Backend with FlightLabs utilities..."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOL
# FlightLabs API Configuration
FLIGHTLABS_ACCESS_KEY=your_access_key_here

# Optional: Override API base URL (default: https://app.goflightlabs.com)
# FLIGHTLABS_BASE_URL=https://app.goflightlabs.com

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_SECONDS=60
CACHE_MAX_ENTRIES=100
CACHE_CLEANUP_INTERVAL=300

# API Request Configuration
API_TIMEOUT=30000
API_MAX_RETRIES=3
API_RETRY_DELAY=1000
EOL
    echo "✅ Created .env file - Please update FLIGHTLABS_ACCESS_KEY with your API key"
else
    echo "✅ .env file already exists"
fi

# Build the project
echo ""
echo "🔨 Building TypeScript files..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and add your FLIGHTLABS_ACCESS_KEY"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Check src/examples/flightlabs-usage.ts for usage examples"
echo ""
echo "📚 Documentation:"
echo "- FlightLabs utilities: src/utils/flightlabs/README.md"
echo "- Backend overview: README.md" 