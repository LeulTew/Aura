#!/usr/bin/env python
"""
Test script for FaceProcessor.
Run this from apps/core directory with venv activated:
    ./venv/bin/python test_processor.py
"""
import sys
import os
import time

# Add the current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from processor import FaceProcessor

def test_single_image():
    """Test processing a single image."""
    print("=" * 60)
    print("TEST 1: Single Image Processing")
    print("=" * 60)
    
    processor = FaceProcessor()
    
    test_img = "test_images/test_face_1.png"
    
    if not os.path.exists(test_img):
        print(f"[ERROR] Test image not found: {test_img}")
        return False
    
    print(f"Processing: {test_img}")
    start = time.time()
    embedding = processor.get_embedding(test_img)
    duration = time.time() - start
    
    if embedding is None:
        print("[FAIL] No embedding returned!")
        return False
    
    print(f"[PASS] Embedding generated successfully!")
    print(f"  - Dimensions: {len(embedding)}")
    print(f"  - First 5 values: {embedding[:5]}")
    print(f"  - Processing time: {duration:.3f}s")
    return True

def test_directory_scan():
    """Test scanning a directory of images."""
    print("\n" + "=" * 60)
    print("TEST 2: Directory Scan")
    print("=" * 60)
    
    processor = FaceProcessor()
    
    test_dir = "test_images"
    
    if not os.path.exists(test_dir):
        print(f"[ERROR] Test directory not found: {test_dir}")
        return False
    
    print(f"Scanning: {test_dir}")
    start = time.time()
    results = processor.scan_directory(test_dir)
    duration = time.time() - start
    
    print(f"[PASS] Directory scan complete!")
    print(f"  - Images processed: {len(results)}")
    print(f"  - Total time: {duration:.3f}s")
    
    for r in results:
        print(f"    - {os.path.basename(r['path'])}: {len(r['embedding'])}D embedding")
    
    return len(results) > 0

def main():
    print("\n" + "=" * 60)
    print(" AURA FACE PROCESSOR TEST SUITE ")
    print("=" * 60)
    
    results = []
    
    try:
        results.append(("Single Image", test_single_image()))
    except Exception as e:
        print(f"[ERROR] Test 1 crashed: {e}")
        results.append(("Single Image", False))
    
    try:
        results.append(("Directory Scan", test_directory_scan()))
    except Exception as e:
        print(f"[ERROR] Test 2 crashed: {e}")
        results.append(("Directory Scan", False))
    
    print("\n" + "=" * 60)
    print(" SUMMARY ")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("All tests passed! FaceProcessor is ready.")
        return 0
    else:
        print("Some tests failed. Check output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
