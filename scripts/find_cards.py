from PIL import Image
import os

im = Image.open('img/extracted/Desktop/Início.png').convert('RGB')
w, h = im.size

# Background is (20, 13, 10). Card border/inner is very bright.
def is_img_pixel(rgb):
    # If distance from bg > 30 and not pure black
    return abs(rgb[0]-20) + abs(rgb[1]-13) + abs(rgb[2]-10) > 40

# Let's inspect rows around y=800..2000 in x=460..1300
cards = []

# Row 1 cards
# Check vertical column around x=580, 860, 1140
for col_center_x, name_col in [(590, 0), (870, 1), (1150, 2)]:
    for y_approx in [850, 1300, 1750]:
        # find top
        y_top = y_approx
        while y_top > 700 and is_img_pixel(im.getpixel((col_center_x, y_top))):
            y_top -= 1
        y_bottom = y_approx
        while y_bottom < 2100 and is_img_pixel(im.getpixel((col_center_x, y_bottom))):
            y_bottom += 1
        
        # if valid height (around 240..270)
        card_h = y_bottom - y_top
        if 200 < card_h < 350:
            # find left and right
            y_mid = (y_top + y_bottom) // 2
            x_left = col_center_x
            while x_left > 400 and is_img_pixel(im.getpixel((x_left, y_mid))):
                x_left -= 1
            x_right = col_center_x
            while x_right < 1350 and is_img_pixel(im.getpixel((x_right, y_mid))):
                x_right += 1
            
            box = (x_left + 1, y_top + 1, x_right, y_bottom)
            if box not in cards:
                cards.append(box)

print("Detected catalog cards:", len(cards))
for i, box in enumerate(cards):
    print(f"Card {i}: box={box}, size=({box[2]-box[0]}, {box[3]-box[1]})")

# Featured NFT on sidebar (around x=115..385, y=2100..2500)
# Let's find it:
feat_sub = im.crop((100, 2050, 420, 2600))
# Let's check non-bg pixels
y_top = 2200
while y_top > 2050 and is_img_pixel(im.getpixel((260, y_top))):
    y_top -= 1
y_bottom = 2200
while y_bottom < 2600 and is_img_pixel(im.getpixel((260, y_bottom))):
    y_bottom += 1
x_left = 260
while x_left > 100 and is_img_pixel(im.getpixel((x_left, (y_top+y_bottom)//2))):
    x_left -= 1
x_right = 260
while x_right < 420 and is_img_pixel(im.getpixel((x_right, (y_top+y_bottom)//2))):
    x_right += 1
feat_box = (x_left+1, y_top+1, x_right, y_bottom)
print(f"Featured NFT: box={feat_box}, size=({feat_box[2]-feat_box[0]}, {feat_box[3]-feat_box[1]})")

# Promo banners (around y=2300..2600, x=115..1320)
# Promo 1 is around x=115..390, y=2300..2600
# Promo 2 is around x=730..1010, y=2300..2600
for x_probe in [240, 850]:
    y_probe = 2450
    if is_img_pixel(im.getpixel((x_probe, y_probe))):
        yt = y_probe
        while yt > 2200 and is_img_pixel(im.getpixel((x_probe, yt))):
            yt -= 1
        yb = y_probe
        while yb < 2700 and is_img_pixel(im.getpixel((x_probe, yb))):
            yb += 1
        ym = (yt + yb) // 2
        xl = x_probe
        while xl > 50 and is_img_pixel(im.getpixel((xl, ym))):
            xl -= 1
        xr = x_probe
        while xr < 1350 and is_img_pixel(im.getpixel((xr, ym))):
            xr += 1
        print(f"Promo banner image at x={x_probe}: box=({xl+1}, {yt+1}, {xr}, {yb}), size=({xr-xl-1}, {yb-yt-1})")

# Blog cards (around y=2850..3150, 4 columns: x probe ~230, 520, 810, 1100)
for x_probe in [240, 530, 820, 1110]:
    y_probe = 2950
    if is_img_pixel(im.getpixel((x_probe, y_probe))):
        yt = y_probe
        while yt > 2700 and is_img_pixel(im.getpixel((x_probe, yt))):
            yt -= 1
        yb = y_probe
        while yb < 3200 and is_img_pixel(im.getpixel((x_probe, yb))):
            yb += 1
        ym = (yt + yb) // 2
        xl = x_probe
        while xl > 50 and is_img_pixel(im.getpixel((xl, ym))):
            xl -= 1
        xr = x_probe
        while xr < 1400 and is_img_pixel(im.getpixel((xr, ym))):
            xr += 1
        print(f"Blog card image at x={x_probe}: box=({xl+1}, {yt+1}, {xr}, {yb}), size=({xr-xl-1}, {yb-yt-1})")
