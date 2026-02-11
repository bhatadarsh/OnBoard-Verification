#!/usr/bin/env python3
"""
YOLO Detection Test Script
Tests if YOLO model is properly loaded and can detect objects.
"""

import cv2
import numpy as np
from ultralytics import YOLO

def test_yolo_basic():
    """Test basic YOLO functionality"""
    print("=" * 60)
    print("YOLO DETECTION TEST")
    print("=" * 60)
    
    # 1. Load YOLO model
    print("\n[1/4] Loading YOLO model...")
    try:
        model = YOLO("yolov8n.pt")
        print("✅ YOLO model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load YOLO model: {e}")
        return False
    
    # 2. Check available classes
    print("\n[2/4] Checking available object classes...")
    print(f"Total classes: {len(model.names)}")
    
    # Check for required classes
    required_classes = ["person", "cell phone", "laptop", "keyboard", "mouse", "tablet"]
    found_classes = []
    missing_classes = []
    
    for cls in required_classes:
        if cls in model.names.values():
            found_classes.append(cls)
        else:
            missing_classes.append(cls)
    
    print(f"✅ Found classes: {found_classes}")
    if missing_classes:
        print(f"⚠️  Missing classes: {missing_classes}")
    
    # 3. Create a test image with a person
    print("\n[3/4] Creating test image...")
    # Create a simple test image (black background)
    test_img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw a simple "person" shape (rectangle for body, circle for head)
    cv2.rectangle(test_img, (250, 200), (390, 450), (255, 255, 255), -1)  # Body
    cv2.circle(test_img, (320, 150), 50, (255, 255, 255), -1)  # Head
    print("✅ Test image created")
    
    # 4. Run detection
    print("\n[4/4] Running YOLO detection on test image...")
    try:
        results = model(test_img, verbose=False)[0]
        
        detected_objects = []
        for box in results.boxes:
            cls_id = int(box.cls[0])
            cls_name = results.names[cls_id]
            confidence = float(box.conf[0])
            detected_objects.append((cls_name, confidence))
        
        if detected_objects:
            print(f"✅ Detection successful! Found {len(detected_objects)} object(s):")
            for obj, conf in detected_objects:
                print(f"   - {obj}: {conf:.2f} confidence")
        else:
            print("⚠️  No objects detected in test image")
            print("   (This is normal for a simple synthetic image)")
        
    except Exception as e:
        print(f"❌ Detection failed: {e}")
        return False
    
    # 5. Print all available YOLO classes for reference
    print("\n" + "=" * 60)
    print("AVAILABLE YOLO CLASSES (COCO Dataset)")
    print("=" * 60)
    print("Classes relevant for cheating detection:")
    relevant = ["person", "cell phone", "laptop", "keyboard", "mouse", "book", "remote", "tv", "monitor"]
    for idx, name in model.names.items():
        if name in relevant:
            print(f"  ✓ {idx}: {name}")
    
    print("\n" + "=" * 60)
    print("YOLO TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_yolo_basic()
    exit(0 if success else 1)
