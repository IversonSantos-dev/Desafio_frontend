from PIL import Image
import os

os.makedirs('public/images', exist_ok=True)

im_home = Image.open('img/extracted/Desktop/Início.png').convert('RGB')
im_login = Image.open('img/extracted/Desktop/Login.png').convert('RGB')
im_detail = Image.open('img/extracted/Desktop/Detalhes do NFT.png').convert('RGB')
im_confirm = Image.open('img/extracted/Desktop/Confirmação de Pedido.png').convert('RGB')

# Hero Ape on Home
hero = im_home.crop((869, 58, 1319, 508))
hero.save('public/images/hero_ape.png')

# Featured Sidebar Ape
# In Desktop/Início.png, sidebar card is x: 120..429, y: 1570..1980 (approx)
# Let's inspect the exact box of the featured ape image
feat = im_home.crop((120, 1600, 429, 2000))
feat.save('public/images/featured_sidebar.png')

# Catalog Row 1 (y: 730..970)
emerald_ape = im_home.crop((482, 730, 731, 970))
emerald_ape.save('public/images/nft_emerald_ape.png')

sage_nomad = im_home.crop((774, 730, 1023, 970))
sage_nomad.save('public/images/nft_sage_nomad.png')

neon_vessel = im_home.crop((1066, 730, 1315, 970))
neon_vessel.save('public/images/nft_neon_vessel.png')

# Catalog Row 2 (y: 1140..1380)
# Note: we check the height is 240, so 1140..1380
cosmic_bloom = im_home.crop((482, 1140, 731, 1380))
cosmic_bloom.save('public/images/nft_cosmic_bloom.png')

violet_nomad = im_home.crop((774, 1140, 1023, 1380))
violet_nomad.save('public/images/nft_violet_nomad.png')

ivory_baron = im_home.crop((1066, 1140, 1315, 1380))
ivory_baron.save('public/images/nft_ivory_baron.png')

# Catalog Row 3 (y: 1570..1810)
golden_beat = im_home.crop((482, 1570, 731, 1810))
golden_beat.save('public/images/nft_golden_beat.png')

golden_freq = im_login.crop((774, 1570, 1023, 1810))
golden_freq.save('public/images/nft_golden_frequency.png')

golden_signal = im_home.crop((1066, 1570, 1315, 1810))
golden_signal.save('public/images/nft_golden_signal.png')

# Detail Main Image
detail_main = im_detail.crop((260, 103, 679, 522))
detail_main.save('public/images/nft_detail_main.png')

# Detail Thumbnails (4 items at x: 120..220)
# Let's crop them
thumb1 = im_detail.crop((120, 103, 220, 203))
thumb1.save('public/images/thumb_1.png')
thumb2 = im_detail.crop((120, 210, 220, 310))
thumb2.save('public/images/thumb_2.png')
thumb3 = im_detail.crop((120, 317, 220, 417))
thumb3.save('public/images/thumb_3.png')
thumb4 = im_detail.crop((120, 424, 220, 524))
thumb4.save('public/images/thumb_4.png')

# Promo banners (y: 2120..2360)
promo_genesis = im_home.crop((120, 2120, 406, 2360))
promo_genesis.save('public/images/promo_genesis.png')

promo_curated = im_home.crop((734, 2120, 1022, 2360))
promo_curated.save('public/images/promo_curated.png')

# Blog Cards (y: 2570..2760)
blog1 = im_home.crop((120, 2570, 387, 2760))
blog1.save('public/images/blog_1.png')

blog2 = im_home.crop((412, 2570, 679, 2760))
blog2.save('public/images/blog_2.png')

blog3 = im_home.crop((704, 2570, 971, 2760))
blog3.save('public/images/blog_3.png')

blog4 = im_home.crop((996, 2570, 1263, 2760))
blog4.save('public/images/blog_4.png')

# Thank you icon/envelope on confirmation modal
# Let's find envelope in im_confirm around x=650..790, y=200..350
env = im_confirm.crop((684, 212, 756, 284))
env.save('public/images/thank_you_icon.png')

print("All assets cropped and saved successfully!")
