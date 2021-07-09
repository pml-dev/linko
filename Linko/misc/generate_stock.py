from os import listdir, path
import cv2

mypath = "C:\\Users\\Geoffrey\\Downloads\\BGA cartes"
# dim = (60, 80)
# dim = (240, 320)

# selected_files = [f for f in listdir(mypath) if f.endswith(".png")]
selected_files = ['linkoone_cards_front2.png', 'linkoone_cards_front12.png', 'linkoone_cards_front22.png', 'linkoone_cards_front32.png',
                  'linkoone_cards_front52.png', 'linkoone_cards_front62.png', 'linkoone_cards_front72.png', 'linkoone_cards_front92.png']
output_path = 'img/linkoone_cards_128.png'
dim = (96, 128)
# dim = (240, 320)

# # This is used for game_banner
# selected_files = ['linkoone_cards_front12.png', 'linkoone_cards_front22.png', 'linkoone_cards_front32.png',
#                   'linkoone_cards_front72.png', 'linkoone_cards_front52.png', 'linkoone_cards_front62.png']
# output_path = 'img/game_banner.jpg'
# dim = (231, 400)

# #This is used for game_display0
# selected_files = ['linkoone_cards_front6.png', 'linkoone_cards_front7.png']
# output_path = 'img/game_display0.jpg'
# dim = (300, 400)


list_im = [path.join(mypath, f) for f in selected_files]

imgs = [cv2.imread(i) for i in list_im]

print(list_im)

def resize(img):
    # scale_percent = 25  # percent of original size
    # width = int(img.shape[1] * scale_percent / 100)
    # height = int(img.shape[0] * scale_percent / 100)
    # dim = (width, height)
    return cv2.resize(img, dim, interpolation=cv2.INTER_AREA)


im_v = cv2.hconcat(list(map(resize, imgs)))
# cv2.imwrite('img/linkoone_cards.png', im_v)
cv2.imwrite(output_path, im_v)
