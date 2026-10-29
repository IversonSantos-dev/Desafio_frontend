from PIL import Image
import os

im = Image.open('img/extracted/Desktop/Início.png').convert('RGB')
os.makedirs('public/images', exist_ok=True)

# Helper to find exact x boundaries of images in a row given y_range
def find_x_boxes(y_min, y_max, min_width=100):
    boxes = []
    # column activity
    active_cols = []
    for x in range(0, im.width):
        # check if column has any non-bg pixel in y range
        has_pixel = False
        for y in range(y_min, y_max, 5):
            r, g, b = im.getpixel((x, y))
            # bg is (20, 13, 10)
            if abs(r-20) + abs(g-13) + abs(b-10) > 40:
                has_pixel = True
                break
        if has_pixel:
            active_cols.append(x)
    
    # cluster contiguous columns
    if not active_cols:
        return []
    start = active_cols[0]
    prev = start
    for x in active_cols[1:]:
        if x == prev + 1:
            prev = x
        else:
            if prev - start >= min_width:
                boxes.append((start, prev))
            start = x
            prev = x
    if prev - start >= min_width:
        boxes.append((start, prev))
    return boxes

print("Row 1 (y: 730..970):", find_x_boxes(730, 970))
print("Row 2 (y: 1140..1410):", find_x_boxes(1140, 1410))
print("Row 3 (y: 1570..1820):", find_x_boxes(1570, 1820))
print("Promo row (y: 2120..2360):", find_x_boxes(2120, 2360))
print("Blog row (y: 2570..2760):", find_x_boxes(2570, 2760))
