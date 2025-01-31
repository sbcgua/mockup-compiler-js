#!/bin/sh

# This script is used to build the single executable distribution
# It is supposed to run from the package root directory

if [ ! -f "package.json" ]; then
    echo "This script must be run from the package root directory"
    exit 1
fi

if ! grep -q '"name": "mockup-compiler-js"' package.json; then
    echo "This script must be run from the root directory of the 'mockup-compiler-js' package"
    exit 1
fi

# Clean previous build
echo "Cleaning previous build..."
rm -f _build/bundle.js _build/sea-prep.blob _build/mockup-compiler.exe

# Build the js single file
echo "Building the js single file..."
npm run build:bundle || exit 1

# Build the sea-prep.blob
echo "Building the sea-prep.blob..."
node --experimental-sea-config sea-config.json || exit 1

# Copy node executable
echo "Copying node executable..."
node -e "require('fs').copyFileSync(process.execPath, '_build/mockup-compiler.exe')" || exit 1

# Remove signature
echo "Removing signature..."
signtool remove //s _build/mockup-compiler.exe || exit 1

# Injecting the sea-prep.blob
echo "Injecting the sea-prep.blob..."
npx postject _build/mockup-compiler.exe NODE_SEA_BLOB _build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 || exit 1

# Adding icon
# echo "Adding icon..."
# resedit -i _build/mockup-compiler.exe -o _build/mockup-compiler.exe --icon 1,doc/icon.ico || exit 1

# Sign the executable
echo "Signing the executable..."
signtool sign //fd SHA256 _build/mockup-compiler.exe || exit 1
