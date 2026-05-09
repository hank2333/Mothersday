const SELECTORS = {
  reveal: ".reveal-up",
  typewriter: ".typewriter-text",
  closingMessage: ".closing-message",
  particleButton: ".particle-button",
  scrollButton: "[data-scroll-target]"
};

document.addEventListener("DOMContentLoaded", () => {
  setupBackgroundMusic();
  setupRevealAnimations();
  setupTypewriters();
  setupClosingMessage();
  setupButtons();
});

function setupBackgroundMusic() {
  const audio = document.querySelector("#page-bgm");
  const toggle = document.querySelector("#music-toggle");
  const modal = document.querySelector("#music-modal");
  const modalButton = document.querySelector("#music-modal-button");

  if (!audio || !toggle) {
    return;
  }

  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  let wantsMusic = true;
  let unlocked = false;
  let modalTimerId = 0;
  const text = toggle.querySelector(".music-toggle-text");

  audio.volume = 0.35;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");
  audio.load();

  function withWeChatBridge(callback) {
    if (typeof window.WeixinJSBridge === "undefined") {
      callback();
      return;
    }

    try {
      // In WeChat WebView, invoking a bridge API first often helps unlock media playback.
      window.WeixinJSBridge.invoke("getNetworkType", {}, () => {
        callback();
      });
    } catch {
      callback();
    }
  }

  function primeAudioElement() {
    try {
      audio.muted = true;
      const playAttempt = audio.play();

      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
          })
          .catch(() => {
            audio.muted = false;
          });
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    } catch {
      audio.muted = false;
    }
  }

  function setButtonState(state) {
    const isPlaying = state === "playing";

    toggle.classList.toggle("is-muted", state === "paused");
    toggle.classList.toggle("is-pending", state === "pending");
    toggle.setAttribute("aria-pressed", String(isPlaying));
    toggle.setAttribute("aria-label", isPlaying ? "关闭背景音乐" : "开启背景音乐");
    toggle.title = isPlaying ? "关闭背景音乐" : "开启背景音乐";

    if (!text) {
      return;
    }

    if (state === "playing") {
      text.textContent = "音乐开";
      return;
    }

    if (state === "pending") {
      text.textContent = "点开音乐";
      return;
    }

    text.textContent = "音乐关";
  }

  function showMusicModal() {
    if (!modal || !wantsMusic || unlocked || !audio.paused) {
      return;
    }

    modal.hidden = false;
  }

  function hideMusicModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;
  }

  function clearModalTimer() {
    if (!modalTimerId) {
      return;
    }

    window.clearTimeout(modalTimerId);
    modalTimerId = 0;
  }

  function scheduleModalFallback() {
    clearModalTimer();
    modalTimerId = window.setTimeout(() => {
      if (wantsMusic && audio.paused) {
        setButtonState("pending");
        showMusicModal();
      }
    }, isWeChat ? 900 : 1400);
  }

  async function playMusic() {
    if (!wantsMusic || !audio.currentSrc) {
      setButtonState("paused");
      return false;
    }

    try {
      await audio.play();
      unlocked = true;
      clearModalTimer();
      hideMusicModal();
      setButtonState("playing");
      return true;
    } catch {
      setButtonState("pending");
      scheduleModalFallback();
      return false;
    }
  }

  function attemptPlayFromUserGesture() {
    if (!wantsMusic || !audio.currentSrc) {
      setButtonState("paused");
      return;
    }

    const playAttempt = audio.play();

    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt
        .then(() => {
          unlocked = true;
          clearModalTimer();
          hideMusicModal();
          setButtonState("playing");
        })
        .catch(() => {
          setButtonState("pending");
          showMusicModal();
        });
      return;
    }

    unlocked = true;
    clearModalTimer();
    hideMusicModal();
    setButtonState("playing");
  }

  async function playMusicWithWeChatBridge() {
    if (!isWeChat) {
      return playMusic();
    }

    return new Promise((resolve) => {
      withWeChatBridge(async () => {
        const played = await playMusic();
        resolve(played);
      });
    });
  }

  function pauseMusic(manual = false) {
    if (manual) {
      wantsMusic = false;
    }

    clearModalTimer();
    hideMusicModal();
    audio.pause();
    setButtonState(manual ? "paused" : "pending");
  }

  async function unlockAndPlay() {
    if (!wantsMusic) {
      return;
    }

    await playMusicWithWeChatBridge();
  }

  async function handleUserUnlock() {
    if (!unlocked && wantsMusic && audio.paused) {
      await unlockAndPlay();
    }
  }

  async function handleToggleClick() {
    if (!audio.paused) {
      pauseMusic(true);
      return;
    }

    wantsMusic = true;
    attemptPlayFromUserGesture();

    if (audio.paused) {
      await unlockAndPlay();
    }
  }

  async function handleWeChatBridgeReady() {
    if (!wantsMusic || !audio.paused) {
      return;
    }

    await playMusicWithWeChatBridge();
  }

  toggle.addEventListener("click", handleToggleClick);

  if (modalButton) {
    const handleModalPress = async (event) => {
      event.preventDefault();
      wantsMusic = true;
      attemptPlayFromUserGesture();

      if (audio.paused) {
        await unlockAndPlay();
      }

      if (audio.paused) {
        showMusicModal();
      }
    };

    modalButton.addEventListener("click", handleModalPress);
    modalButton.addEventListener("touchend", handleModalPress, { passive: false });
  }

  document.addEventListener("pointerdown", handleUserUnlock, { passive: true });
  document.addEventListener("touchend", handleUserUnlock, { passive: true });
  document.addEventListener("click", handleUserUnlock, { passive: true });
  document.addEventListener("keydown", handleUserUnlock);
  document.addEventListener("WeixinJSBridgeReady", handleWeChatBridgeReady, false);
  document.addEventListener("YixinJSBridgeReady", handleWeChatBridgeReady, false);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && wantsMusic && audio.paused) {
      unlockAndPlay();
    }
  });

  audio.addEventListener("play", () => {
    unlocked = true;
    clearModalTimer();
    hideMusicModal();
    setButtonState("playing");
  });

  audio.addEventListener("pause", () => {
    if (wantsMusic) {
      setButtonState("pending");
      scheduleModalFallback();
      return;
    }

    setButtonState("paused");
  });

  audio.addEventListener("error", () => {
    wantsMusic = false;
    clearModalTimer();
    hideMusicModal();
    setButtonState("paused");
  });

  setButtonState("pending");
  scheduleModalFallback();
  primeAudioElement();
  playMusicWithWeChatBridge();

  if (isWeChat) {
    showMusicModal();
  }
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(SELECTORS.reveal);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function setupTypewriters() {
  const blocks = document.querySelectorAll(SELECTORS.typewriter);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.dataset.played === "true") {
          return;
        }

        entry.target.dataset.played = "true";
        playTypewriter(entry.target);
      });
    },
    { threshold: 0.45 }
  );

  blocks.forEach((block) => observer.observe(block));
}

async function playTypewriter(element) {
  const lines = parseLines(element.dataset.lines);
  element.textContent = "";

  for (const line of lines) {
    const lineNode = document.createElement("span");
    lineNode.className = "typewriter-line";
    element.appendChild(lineNode);
    await typeLine(lineNode, line);
    await wait(260);
  }
}

function setupClosingMessage() {
  const closingMessage = document.querySelector(SELECTORS.closingMessage);
  if (!closingMessage) {
    return;
  }

  const lines = parseLines(closingMessage.dataset.lines);
  const paragraphs = closingMessage.querySelectorAll("p");

  paragraphs.forEach((paragraph, index) => {
    if (lines[index]) {
      paragraph.textContent = lines[index];
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(closingMessage);
}

function setupButtons() {
  const buttons = document.querySelectorAll(SELECTORS.particleButton);

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      createHeartBurst(event.currentTarget);
    });
  });

  document.querySelectorAll(SELECTORS.scrollButton).forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scrollTarget);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

async function typeLine(target, text) {
  const cursor = document.createElement("span");
  cursor.className = "typewriter-cursor";
  cursor.textContent = "|";
  target.appendChild(cursor);

  for (const char of text) {
    cursor.insertAdjacentText("beforebegin", char);
    await wait(getTypingDelay(char));
  }

  cursor.remove();
}

function createHeartBurst(button) {
  const template = document.querySelector("#heart-particle-template");
  const rect = button.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let index = 0; index < 8; index += 1) {
    const particle = template.content.firstElementChild.cloneNode(true);
    const angle = (Math.PI * 2 * index) / 8;
    const distance = 26 + Math.random() * 18;

    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    particle.style.animationDelay = `${index * 0.03}s`;

    document.body.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
  }
}

function parseLines(rawValue) {
  try {
    const parsed = JSON.parse(rawValue ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTypingDelay(char) {
  if ("，。！？；：,.!?".includes(char)) {
    return 140;
  }

  return 42;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
