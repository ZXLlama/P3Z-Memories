# generate_playlist.py
import os
import json

# --- 設定 ---
PHOTOS_DIR = 'photos'  # 照片的父資料夾名稱
MUSIC_DIR = 'music'    # 音樂資料夾名稱
OUTPUT_FILE = 'playlist.js' # 輸出的 JS 檔案名稱

# 支援的檔案類型
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
MUSIC_EXTS = {'.mp3', '.wav', '.ogg', '.m4a', '.flac'}

# --- 主程式 ---
def create_playlist():
    # 1. 處理照片
    playlist_data = []
    if not os.path.isdir(PHOTOS_DIR):
        print(f"錯誤：找不到 '{PHOTOS_DIR}' 資料夾。")
        return

    # 取得所有子資料夾 (e.g., '2024 東京之旅', '畢業典禮')
    subfolders = sorted([f.name for f in os.scandir(PHOTOS_DIR) if f.is_dir()])

    for folder_name in subfolders:
        folder_path = os.path.join(PHOTOS_DIR, folder_name)
        photos = sorted([
            f for f in os.listdir(folder_path)
            if os.path.splitext(f)[1].lower() in IMAGE_EXTS
        ])

        if not photos:
            continue # 跳過沒有照片的資料夾

        for photo in photos:
            # 將路徑中的反斜線 \ 轉換為斜線 / 以確保網頁相容性
            full_path = os.path.join(folder_path, photo).replace('\\', '/')
            playlist_data.append({
                "src": full_path,
                "subtitle": folder_name, # 字幕就是資料夾名稱
                "duration": 5000  # 預設每張 5 秒，您可以在這裡修改
            })

    # 2. 處理音樂
    music_data = []
    if os.path.isdir(MUSIC_DIR):
        music_files = sorted([
            f for f in os.listdir(MUSIC_DIR)
            if os.path.splitext(f)[1].lower() in MUSIC_EXTS
        ])
        for music_file in music_files:
            music_data.append(os.path.join(MUSIC_DIR, music_file).replace('\\', '/'))
    else:
        print(f"提示：找不到 '{MUSIC_DIR}' 資料夾，將不會載入音樂。")


    # 3. 寫入 JS 檔案
    # 使用 json.dumps 確保特殊字元 (如引號) 被正確轉義
    js_content = f"""
// 這個檔案是由 generate_playlist.py 自動產生的，請勿手動修改！

const playlist = {json.dumps(playlist_data, indent=2, ensure_ascii=False)};

const musicList = {json.dumps(music_data, indent=2, ensure_ascii=False)};
"""

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"成功！已產生 '{OUTPUT_FILE}'。")
    print(f"總共找到 {len(playlist_data)} 張照片 和 {len(music_data)} 首音樂。")

if __name__ == "__main__":
    create_playlist()