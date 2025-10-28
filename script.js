// 全域變數（保留原有）
let currentIndex = 0;
let timer;
let playing = false;
let userHasInteracted = false;

const audioPlayer = document.getElementById("bg-music");
const imgElement = document.getElementById("slide-img");
const captionElement = document.getElementById("caption");
const progressBar = document.getElementById("progressBar");
const slideshowContainer = document.getElementById("slideshow");
const pauseOverlay = document.getElementById("pauseOverlay");
const playPauseBtn = document.getElementById("playPause");

// === 新增：圖片預載器與同步控制 ===
const PRELOAD_AHEAD = 4; // 你想預載幾張就改這裡
let showToken = 0;        // 用來避免非最新的一次 show() 把舊結果覆寫

class ImagePreloader {
  static cache = new Map(); // url -> Promise<HTMLImageElement>

  static load(url) {
    if (!url) return Promise.reject(new Error("空的圖片 URL"));
    if (this.cache.has(url)) return this.cache.get(url);

    const p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`圖片載入失敗: ${url}`));
      img.src = url;
    });

    this.cache.set(url, p);
    return p;
  }

  static warm(urls) {
    urls.forEach(u => this.load(u).catch(() => {}));
  }
}

// 依你原本的 playlist 打散
const shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);

// --- Audio 啟用（保留原有） ---
function enableAudioOnFirstInteraction() {
  if (userHasInteracted || !audioPlayer) return;
  userHasInteracted = true;
  audioPlayer.muted = false;
  if (audioPlayer.paused) {
    audioPlayer.play().catch(e => console.error("互動後播放失敗:", e));
  }
}

// --- Progress Bar 控制（抽成函式，確保「載入完成後」才啟動） ---
function startProgress(durationMs) {
  progressBar.style.animation = 'none';
  // 觸發 reflow 重置動畫
  void progressBar.offsetWidth;
  progressBar.style.animation = `shrink ${durationMs / 1000}s linear forwards`;
  progressBar.style.animationPlayState = playing ? 'running' : 'paused';
}

// --- Slideshow（重寫 show，保證圖文同步） ---
const Slideshow = {
  async show(index) {
    if (shuffledPlaylist.length === 0) return;

    // 讓上一輪的計時器與動畫先停掉，避免不同步
    clearTimeout(timer);
    progressBar.style.animation = 'none';

    // 計算索引
    currentIndex = (index + shuffledPlaylist.length) % shuffledPlaylist.length;
    const item = shuffledPlaylist[currentIndex];
    const myToken = ++showToken;

    try {
      // 1) 等圖片預載完成
      const loadedImg = await ImagePreloader.load(item.src);

      // 若在等待期間，又有更新 show()，則丟棄舊結果
      if (myToken !== showToken) return;

      // 2) 同步更新 圖片 + 文字（此時圖片已在快取中，切換秒出）
      imgElement.classList.remove("active"); // 若你有淡入動畫，可先移除再加上
      imgElement.src = loadedImg.src;
      captionElement.textContent = item.subtitle || "";

      // 3) 啟動動畫（確保載入後才開始算時間）
      imgElement.classList.add("active");
      startProgress(item.duration || 5000);

      // 4) 排程下一張（如果正在播放）
      if (playing) {
        timer = setTimeout(() => this.next(), item.duration || 5000);
      }

      // 5) 預載後面幾張
      const toWarm = [];
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const nextItem = shuffledPlaylist[(currentIndex + i) % shuffledPlaylist.length];
        if (nextItem?.src) toWarm.push(nextItem.src);
      }
      ImagePreloader.warm(toWarm);

    } catch (err) {
      console.error(err);
      // 載入失敗就嘗試跳下一張，避免卡住
      if (myToken === showToken) this.next();
    }
  },

  next() { this.show(currentIndex + 1); },
  prev() { this.show(currentIndex - 1); },

  resetTimer() {
    clearTimeout(timer);
    if (!playing) return;
    const currentDuration = shuffledPlaylist[currentIndex]?.duration || 5000;
    timer = setTimeout(() => this.next(), currentDuration);
  },

  togglePlay() {
    playing = !playing;
    if (playing) {
      playPauseBtn.textContent = "❚❚";
      pauseOverlay.textContent = "❚❚";
      slideshowContainer.classList.remove('paused');
      if (audioPlayer.src && audioPlayer.paused) audioPlayer.play();
      // 重新以當前張為主，確保動畫與計時從頭算
      this.show(currentIndex);
    } else {
      clearTimeout(timer);
      playPauseBtn.textContent = "▶";
      pauseOverlay.textContent = "▶";
      slideshowContainer.classList.add('paused');
      audioPlayer.pause();
      progressBar.style.animationPlayState = 'paused';
    }
  }
};

// --- Music（沿用你原本的隨機播法） ---
const Music = {
  list: [...musicList],
  index: 0,
  init() {
    if (this.list.length > 0) {
      this.index = Math.floor(Math.random() * this.list.length);
      audioPlayer.src = this.list[this.index];
      audioPlayer.muted = true;
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn("靜音自動播放被阻止。等待使用者互動後再播放。");
        });
      }
    }
    audioPlayer.addEventListener("ended", () => this.next());
  },
  next() {
    if (this.list.length <= 1) {
      if (this.list.length === 1) audioPlayer.play();
      return;
    }
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.list.length);
    } while (newIndex === this.index);
    this.index = newIndex;
    audioPlayer.src = this.list[this.index];
    if (playing) audioPlayer.play();
  }
};

// --- Initializer & Event Listeners ---
function initializeApp() {
  if (typeof playlist === 'undefined' || playlist.length === 0) {
    captionElement.textContent = "請先執行 generate_playlist.py";
    progressBar.style.display = 'none';
    return;
  }
  playPauseBtn.textContent = "▶";
  slideshowContainer.classList.add('paused');

  // 首張：先預載 + 顯示（即使暫停也會只做「載入與同步顯示」，不啟動計時）
  Slideshow.show(0);

  // 預先把後面幾張暖起來
  const toWarm = [];
  for (let i = 1; i <= PRELOAD_AHEAD; i++) {
    const nextItem = shuffledPlaylist[(0 + i) % shuffledPlaylist.length];
    if (nextItem?.src) toWarm.push(nextItem.src);
  }
  ImagePreloader.warm(toWarm);

  Music.init();
}

// 點擊區域：先解除靜音，再切換播放
slideshowContainer.addEventListener('click', () => {
  enableAudioOnFirstInteraction();
  Slideshow.togglePlay();
});

document.getElementById("next").addEventListener("click", (event) => {
  event.stopPropagation();
  enableAudioOnFirstInteraction();
  Slideshow.next();
});

document.getElementById("prev").addEventListener("click", (event) => {
  event.stopPropagation();
  enableAudioOnFirstInteraction();
  Slideshow.prev();
});

playPauseBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  enableAudioOnFirstInteraction();
  Slideshow.togglePlay();
});

// 啟動
initializeApp();
