// 全域變數
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
const shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);

function enableAudioOnFirstInteraction() {
  if (userHasInteracted || !audioPlayer) return;
  userHasInteracted = true;
  audioPlayer.muted = false;
  if (audioPlayer.paused) {
    audioPlayer.play().catch(e => console.error("互動後播放失敗:", e));
  }
}

// --- Slideshow --- (此區塊無變動)
const Slideshow = {
  show(index) {
    if (shuffledPlaylist.length === 0) return;
    clearTimeout(timer);
    currentIndex = (index + shuffledPlaylist.length) % shuffledPlaylist.length;
    const itemToShow = shuffledPlaylist[currentIndex];
    imgElement.src = itemToShow.src;
    captionElement.textContent = itemToShow.subtitle || "";
    imgElement.classList.remove("active"); 
    imgElement.classList.add("active");
    this.resetTimer();
    progressBar.style.animation = 'none';
    void progressBar.offsetWidth;
    progressBar.style.animation = `shrink ${itemToShow.duration / 1000}s linear forwards`;
    progressBar.style.animationPlayState = playing ? 'running' : 'paused';
  },
  next() { this.show(currentIndex + 1); },
  prev() { this.show(currentIndex - 1); },
  resetTimer() {
    if (playing) {
      const currentDuration = shuffledPlaylist[currentIndex]?.duration || 5000;
      timer = setTimeout(() => this.next(), currentDuration);
    }
  },
  togglePlay() {
    playing = !playing;
    if (playing) {
      this.resetTimer();
      playPauseBtn.textContent = "❚❚";
      pauseOverlay.textContent = "❚❚";
      slideshowContainer.classList.remove('paused');
      if (audioPlayer.src && audioPlayer.paused) {
        audioPlayer.play();
      }
      progressBar.style.animationPlayState = 'running';
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

// --- Music --- (核心修改)
const Music = {
  list: [...musicList], // 直接使用原始列表，不再預先打亂
  index: 0,

  init() {
    if (this.list.length > 0) {
      // 1. 隨機選擇一首作為開始
      this.index = Math.floor(Math.random() * this.list.length);
      audioPlayer.src = this.list[this.index];
      audioPlayer.muted = true;
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("靜音自動播放被阻止。等待使用者互動後再播放。");
        });
      }
    }
    audioPlayer.addEventListener("ended", () => this.next());
  },

  // 2. 核心修改：next() 現在會選擇一首全新的隨機歌曲
  next() {
    if (this.list.length <= 1) { // 如果只有一首或沒有歌曲
      if(this.list.length === 1) audioPlayer.play(); // 重新播放唯一的歌曲
      return;
    }

    let newIndex;
    // 持續產生新的隨機索引，直到它和目前的索引不同
    do {
      newIndex = Math.floor(Math.random() * this.list.length);
    } while (newIndex === this.index);

    this.index = newIndex; // 更新為新的隨機索引
    audioPlayer.src = this.list[this.index];
    if (playing) {
      audioPlayer.play();
    }
  }
};

// --- Initializer & Event Listeners --- (此區塊無變動)
function initializeApp() {
    if (typeof playlist === 'undefined' || playlist.length === 0) {
        captionElement.textContent = "請先執行 generate_playlist.py";
        progressBar.style.display = 'none';
        return;
    }
    playPauseBtn.textContent = "▶";
    slideshowContainer.classList.add('paused');
    Slideshow.show(0);
    Music.init();
}

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

// --- Start the App ---
initializeApp();