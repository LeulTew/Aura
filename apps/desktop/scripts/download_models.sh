#!/usr/bin/env bash
# Aura Desktop - Download ONNX Models for Local AI
#
# This script downloads the required face detection and recognition models.
# Models are from InsightFace and are used for offline face search.

set -e

# Determine model directory
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    MODELS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/aura-desktop/models"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    MODELS_DIR="$HOME/Library/Application Support/aura-desktop/models"
else
    # Windows (Git Bash / WSL)
    MODELS_DIR="$LOCALAPPDATA/aura-desktop/models"
fi

echo "Aura Desktop - Model Downloader"
echo "================================"
echo ""
echo "Models will be saved to: $MODELS_DIR"
echo ""

# Create directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Model URLs (InsightFace ONNX models)
# Note: These URLs may need to be updated if upstream changes
DETECTOR_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/det_10g.onnx"
RECOGNIZER_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx"

download_model() {
    local url=$1
    local output=$2
    local name=$3

    if [ -f "$output" ]; then
        echo "✓ $name already exists, skipping..."
        return 0
    fi

    echo "Downloading $name..."
    if command -v curl &> /dev/null; then
        curl -L -o "$output" "$url" --progress-bar
    elif command -v wget &> /dev/null; then
        wget -O "$output" "$url" --show-progress
    else
        echo "Error: curl or wget is required"
        exit 1
    fi
    echo "✓ Downloaded $name"
}

# Download models
download_model "$DETECTOR_URL" "$MODELS_DIR/det_10g.onnx" "SCRFD Face Detector (det_10g.onnx)"
download_model "$RECOGNIZER_URL" "$MODELS_DIR/w600k_r50.onnx" "ArcFace Recognizer (w600k_r50.onnx)"

echo ""
echo "================================"
echo "✓ All models downloaded!"
echo ""
echo "You can now enable Local AI in Aura Desktop Settings."
