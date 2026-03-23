import cv2
import numpy as np
import os
import glob
import json

RAW_DIR = "raw_sheets"
OUT_DIR = "assets/stickers"

# Map filename keywords to requested categories
CATEGORIES = {
    "flower": "Flowers",
    "stamp": "Stamps",
    "wax": "Stamps",
    "seal": "Stamps",
    "washi": "Washi Tapes",
    "tape": "Washi Tapes",
    "bow": "Bows",
    "ribbon": "Bows",
    "polaroid": "Misc",
    "frame": "Misc",
    "character": "Misc",
    "text": "Misc",
    "word": "Misc",
    "spotify": "Misc",
    "letter": "Misc",
    "alphabet": "Misc"
}

def get_category(filename):
    fname = filename.lower()
    for key, cat in CATEGORIES.items():
        if key in fname:
            return cat
    return "Misc"

def process_image(img_path):
    cat = get_category(os.path.basename(img_path))
    cat_dir = os.path.join(OUT_DIR, cat)
    os.makedirs(cat_dir, exist_ok=True)
    
    img = cv2.imread(img_path)
    if img is None:
        print(f"Failed to read {img_path}")
        return []

    img_bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    
    # Use color distance for better foreground segmentation
    h, w, _ = img.shape
    border_pixels = np.concatenate([img[0, :], img[-1, :], img[:, 0], img[:, -1]])
    median_bg_color = np.median(border_pixels, axis=0)
    
    diff = cv2.absdiff(img, median_bg_color.astype(np.uint8))
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Anything significantly different from the background color is foreground
    # A threshold of 20 accounts for jpeg artifacts and off-white backgrounds
    _, thresh = cv2.threshold(gray_diff, 20, 255, cv2.THRESH_BINARY)
    
    # Connect nearby components cleanly without merging separate stickers placed close together
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    min_area = 500
    valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
    
    base_name = os.path.splitext(os.path.basename(img_path))[0]
    paths = []
    
    for i, c in enumerate(valid_contours):
        x, y, cw, ch = cv2.boundingRect(c)
        pad = 8
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(w, x + cw + pad)
        y2 = min(h, y + ch + pad)
        
        cropped = img_bgra[y1:y2, x1:x2].copy()
        
        # Shift contour origin to match the bounding rect
        shifted_c = c - [x1, y1]
        
        # Create a mask exactly matching the contour's shape
        contour_mask = np.zeros((y2 - y1, x2 - x1), dtype=np.uint8)
        cv2.drawContours(contour_mask, [shifted_c], -1, 255, thickness=cv2.FILLED)
        
        # Apply anti-aliasing to the mask
        contour_mask = cv2.GaussianBlur(contour_mask, (3, 3), 0)
        
        # Apply the contour mask to the alpha channel of the crop
        cropped[:, :, 3] = contour_mask
        
        # Don't save empty/completely transparent crops
        if np.count_nonzero(cropped[:, :, 3]) > 0:
            out_path = os.path.join(cat_dir, f"{base_name}_{i}.png")
            cv2.imwrite(out_path, cropped)
            paths.append({
                "category": cat,
                "path": out_path.replace("\\", "/")
            })
            
    print(f"Extracted {len(paths)} stickers from {os.path.basename(img_path)} into {cat}.")
    return paths

def main():
    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR)
        print(f"\n[INFO] Created folder: {RAW_DIR}")
        print("Please place your 9 sticker sheet images in this folder.")
        print("Tip: Rename your files to include keywords (e.g., 'vintage_flowers.jpg', 'stamps.png', 'washi_tapes.jpg') to help categorize them properly.")
        return
        
    all_files = glob.glob(os.path.join(RAW_DIR, "*.*"))
    if not all_files:
        print(f"\n[ERROR] No images found in '{RAW_DIR}'. Please add them!")
        return
        
    manifest = {
        "Flowers": [],
        "Stamps": [],
        "Washi Tapes": [],
        "Bows": [],
        "Misc": []
    }
    
    os.makedirs(OUT_DIR, exist_ok=True)
    
    for f in all_files:
        extracted = process_image(f)
        for item in extracted:
            cat = item["category"]
            if cat not in manifest:
                manifest[cat] = []
            manifest[cat].append(item["path"])
            
    js_content = "window.STICKER_MANIFEST = " + json.dumps(manifest, indent=4) + ";"
    os.makedirs("assets", exist_ok=True)
    with open("assets/stickers_manifest.js", "w") as out:
        out.write(js_content)
    print("\n[SUCCESS] Extraction complete! Generated assets/stickers_manifest.js")

if __name__ == "__main__":
    main()
