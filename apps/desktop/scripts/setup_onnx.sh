#!/usr/bin/env bash
# Aura Desktop - Setup ONNX Runtime (Linux)
#
# This script manually downloads and sets up ONNX Runtime libraries
# because the 'download-binaries' Cargo feature has TLS issues in the current environment.

set -e

# Configuration
ORT_VERSION="1.17.3"
ARCH="linux-x64"
FILENAME="onnxruntime-${ARCH}-${ORT_VERSION}"
URL="https://github.com/microsoft/onnxruntime/releases/download/v${ORT_VERSION}/${FILENAME}.tgz"

# Setup directories (use local deps folder)
PROJECT_ROOT="$(dirname "$(dirname "$(readlink -f "$0")")")"
DEPS_DIR="${PROJECT_ROOT}/src-tauri/deps"
mkdir -p "$DEPS_DIR"

echo "Aura Desktop - ONNX Runtime Setup"
echo "================================="
echo "Target Version: ${ORT_VERSION}"
echo "Install Dir:    ${DEPS_DIR}"
echo ""

# Check if already installed
if [ -d "${DEPS_DIR}/${FILENAME}" ]; then
    echo "✓ ONNX Runtime already exists in ${DEPS_DIR}"
else
    echo "Downloading ${FILENAME}.tgz..."
    cd "$DEPS_DIR"
    
    if command -v curl &> /dev/null; then
        curl -L -O "$URL" --progress-bar
    elif command -v wget &> /dev/null; then
        wget "$URL" --show-progress
    else
        echo "Error: curl or wget is required"
        exit 1
    fi
    
    echo "Extracting..."
    tar -xzf "${FILENAME}.tgz"
    rm "${FILENAME}.tgz"
    echo "✓ Installed to ${DEPS_DIR}/${FILENAME}"
fi

# Link libraries to a 'lib' folder for easier pkg-config or linking
mkdir -p "${DEPS_DIR}/lib"
cp "${DEPS_DIR}/${FILENAME}/lib/"* "${DEPS_DIR}/lib/" || true

echo ""
echo "Setup complete. To build, run:"
echo "export ORT_STRATEGY=system"
echo "export ORT_LIB_LOCATION=${DEPS_DIR}/lib"
echo "cargo build --features ai"
