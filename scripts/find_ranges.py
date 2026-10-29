from PIL import Image

im = Image.open('img/extracted/Desktop/Início.png').convert('RGB')
w, h = im.size

# Let's find rows where there are pixels distinct from background (20, 13, 10) in columns 450 to 1300
row_activity = []
for y in range(0, h, 10):
    active_count = sum(1 for x in range(450, 1300, 10) if abs(im.getpixel((x, y))[0]-20) > 30)
    if active_count > 10:
        row_activity.append(y)

print("Active y ranges in catalog grid (step 10):")
ranges = []
start = None
prev = None
for y in row_activity:
    if start is None:
        start = y
        prev = y
    elif y == prev + 10:
        prev = y
    else:
        ranges.append((start, prev))
        start = y
        prev = y
if start is not None:
    ranges.append((start, prev))

for r in ranges:
    print(f"y: {r[0]} to {r[1]} (height: {r[1]-r[0]})")
