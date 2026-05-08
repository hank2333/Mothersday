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

  if (!audio || !toggle) {
    return;
  }

  let wantsMusic = true;
  let unlocked = false;
  const text = toggle.querySelector(".music-toggle-text");

  audio.volume = 0.35;
  audio.preload = "auto";
  audio.load();

  function setButtonState(state) {
    const isPlaying = state === "playing";

    toggle.classList.toggle("is-muted", state === "paused");
    toggle.classList.toggle("is-pending", state === "pending");
    toggle.setAttribute("aria-pressed", String(isPlaying));
    toggle.setAttribute("aria-label", isPlaying ? "关闭背景音乐" : "开启背景音乐");
    toggle.title = isPlaying ? "关闭背景音乐" : "开启背景音乐";

    if (text) {
      if (state === "playing") {
        text.textContent = "音乐开";
      } else if (state === "pending") {
        text.textContent = "点开音乐";
      } else {
        text.textContent = "音乐关";
      }
    }
  }

  async function playMusic() {
    if (!wantsMusic || !audio.currentSrc) {
      setButtonState("paused");
      return false;
    }

    try {
      await audio.play();
      unlocked = true;
      setButtonState("playing");
      return true;
    } catch {
      setButtonState("pending");
      return false;
    }
  }

  function pauseMusic(manual = false) {
    if (manual) {
      wantsMusic = false;
    }

    audio.pause();
    setButtonState(manual ? "paused" : "pending");
  }

  async function unlockAndPlay() {
    if (!wantsMusic) {
      return;
    }

    await playMusic();
  }

  async function onToggleClick() {
    if (!audio.paused) {
      pauseMusic(true);
      return;
    }

    wantsMusic = true;
    await unlockAndPlay();
  }

  async function onFirstGesture() {
    if (!unlocked && wantsMusic && audio.paused) {
      await unlockAndPlay();
    }
  }

  toggle.addEventListener("click", onToggleClick);

  window.addEventListener("pointerdown", onFirstGesture, { passive: true });
  window.addEventListener("touchend", onFirstGesture, { passive: true });
  window.addEventListener("keydown", onFirstGesture);

  audio.addEventListener("play", () => {
    unlocked = true;
    setButtonState("playing");
  });

  audio.addEventListener("pause", () => {
    if (wantsMusic) {
      setButtonState("pending");
      return;
    }

    setButtonState("paused");
  });

  audio.addEventListener("error", () => {
    wantsMusic = false;
    setButtonState("paused");
  });

  setButtonState("pending");
  playMusic();
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
