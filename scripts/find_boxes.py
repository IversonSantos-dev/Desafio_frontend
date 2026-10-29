from PIL import Image
import numpy as np

im = Image.open('img/extracted/Desktop/Início.png').convert('RGB')
arr = np.array(im)

# The background color is approximately (20, 13, 10)
bg = np.array([20, 13, 10])

# Let's find contiguous regions or search specific known areas
# Let's print colors or find distinct image blocks
print("Hero region scan:")
# Hero ape is roughly in upper right quadrant: x in [800, 1350], y in [20, 600]
hero_crop = im.crop((869, 27, 1320, 480))
# Let's check non-bg bounding box in this area
hero_sub = np.array(im.crop((800, 20, 1400, 600)))
diff = np.abs(hero_sub.astype(int) - bg).sum(axis=2) > 30
y_indices, x_indices = np.where(diff)
if len(y_indices) > 0:
    min_x, max_x = x_indices.min() + 800, x_indices.max() + 800
    min_y, max_y = y_indices.min() + 20, y_indices.max() + 20
    print(f"Hero ape bounding box: x=({min_x}, {max_x}), y=({min_y}, {max_y}), size=({max_x - min_x}, {max_y - min_y})")

# Let's check the catalog cards (y in [700, 2000])
# Left sidebar is x in [0, 450], grid is x in [450, 1400]
print("\nCatalog grid scan:")
catalog_sub = np.array(im.crop((460, 750, 1350, 2000)))
# Let's find distinct card image regions
