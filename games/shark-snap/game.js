(function () {
  "use strict";

  const TOTAL_TEETH = 18;
  const BITE_REVEAL_DELAY_MS = 1050;
  const THEMES = [
    { id: "deep", name: "深海巡游" },
    { id: "coral", name: "珊瑚泡泡" },
    { id: "mint", name: "薄荷汽水" },
    { id: "violet", name: "星夜幻鲨" },
    { id: "sunset", name: "落日柠鲨" }
  ];
  // SVG stage coordinates: each tooth follows the curve of its own gum line.
  const TOOTH_LAYOUT = [
    { row: "upper", x: 75, y: 248, w: 20, h: 41, angle: -30 },
    { row: "upper", x: 99, y: 242, w: 26, h: 58, angle: -18 },
    { row: "upper", x: 122, y: 238, w: 23, h: 44, angle: -12 },
    { row: "upper", x: 146, y: 234, w: 28, h: 58, angle: -7 },
    { row: "upper", x: 169, y: 231, w: 24, h: 51, angle: -2 },
    { row: "upper", x: 193, y: 231, w: 27, h: 59, angle: 4 },
    { row: "upper", x: 216, y: 234, w: 23, h: 45, angle: 10 },
    { row: "upper", x: 237, y: 239, w: 28, h: 58, angle: 16 },
    { row: "upper", x: 259, y: 244, w: 23, h: 49, angle: 22 },
    { row: "upper", x: 281, y: 250, w: 22, h: 39, angle: 30 },
    { row: "lower", x: 85, y: 307, w: 22, h: 38, angle: 27 },
    { row: "lower", x: 111, y: 299, w: 26, h: 54, angle: 18 },
    { row: "lower", x: 139, y: 316, w: 23, h: 45, angle: 10 },
    { row: "lower", x: 168, y: 305, w: 27, h: 59, angle: 3 },
    { row: "lower", x: 195, y: 315, w: 24, h: 49, angle: -4 },
    { row: "lower", x: 224, y: 319, w: 23, h: 40, angle: -12 },
    { row: "lower", x: 252, y: 299, w: 26, h: 53, angle: -19 },
    { row: "lower", x: 278, y: 308, w: 22, h: 36, angle: -27 }
  ];
  const TOOTH_PATHS = [
    "M2 6Q20 -1 38 6C37 20 30 40 23 50Q20 55 17 50C10 39 3 20 2 6Z",
    "M3 6Q19 0 37 7C37 21 29 39 22 49Q20 54 18 50C10 38 4 21 3 6Z",
    "M3 5Q20 0 37 5C38 19 31 39 23 50Q20 54 17 50C10 36 3 20 3 5Z",
    "M2 6Q20 -1 38 8C36 22 29 40 21 50Q18 54 16 49C9 34 4 19 2 6Z"
  ];

  function randomIndex(count) {
    const cryptoObject = window.crypto;
    if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
      try {
        const value = new Uint32Array(1);
        const limit = Math.floor(0x100000000 / count) * count;
        do {
          cryptoObject.getRandomValues(value);
        } while (value[0] >= limit);
        return value[0] % count;
      } catch (_) {
        // A restricted WebView may expose crypto but reject this call.
      }
    }
    return Math.floor(Math.random() * count);
  }

  class SharkGame {
    constructor(root) {
      if (!root) throw new Error("SharkGame requires a root element.");

      this.root = root;
      this.toothLayer = root.querySelector("#tooth-layer");
      this.turnNumber = root.querySelector("#turn-number");
      this.safeCount = root.querySelector("#safe-count");
      this.statusText = root.querySelector("#status-text");
      this.themeLabel = root.querySelector("#theme-label");
      this.themeFootnote = root.querySelector("#theme-footnote");
      this.introTheme = root.querySelector("#intro-theme");
      this.startOverlay = root.querySelector("#start-overlay");
      this.resultOverlay = root.querySelector("#result-overlay");
      this.resultTitle = root.querySelector("#result-title");
      this.resultSubtitle = root.querySelector("#result-subtitle");
      this.sharkStage = root.querySelector("#shark-stage");
      this.biteFlash = root.querySelector("#bite-flash");
      this.soundToggle = root.querySelector("#sound-toggle");
      this.audioContext = null;
      this.soundEnabled = true;
      this.revealTimer = null;
      this.round = 0;
      this.themeIndex = -1;
      this.hasStarted = false;

      if (!this.toothLayer) throw new Error("SharkGame requires #tooth-layer.");
      if (this.statusText) {
        this.statusText.setAttribute("role", "status");
        this.statusText.setAttribute("aria-live", "polite");
      }

      this.toothLayer.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-index]");
        if (button && this.toothLayer.contains(button)) {
          this.pressTooth(Number(button.dataset.index));
        }
      });
      const startButton = root.querySelector("#start-button");
      const playAgainButton = root.querySelector("#play-again");
      const resetButton = root.querySelector("#reset-button");
      if (startButton) startButton.addEventListener("click", () => this.newGame());
      if (playAgainButton) playAgainButton.addEventListener("click", () => this.newGame());
      if (resetButton) resetButton.addEventListener("click", () => this.newGame());
      if (this.soundToggle) this.soundToggle.addEventListener("click", () => this.toggleSound());

      this.prepareRound(false);
    }

    prepareRound(active) {
      if (this.revealTimer !== null) {
        clearTimeout(this.revealTimer);
        this.revealTimer = null;
      }
      this.round += 1;
      this.chooseTheme();
      this.active = active;
      this.finished = false;
      this.dangerIndex = randomIndex(TOTAL_TEETH);
      this.pressed = new Set();
      this.turn = 1;

      if (this.sharkStage) this.sharkStage.classList.remove("is-biting");
      if (this.biteFlash) this.biteFlash.classList.remove("is-visible");
      if (this.resultOverlay) this.resultOverlay.hidden = true;
      if (this.startOverlay) this.startOverlay.hidden = active;

      this.renderTeeth();
      this.updateHud();
      if (this.statusText) {
        this.statusText.innerHTML = "轮流按一颗牙齿<br><strong>小心它突然合上嘴！</strong>";
      }
    }

    newGame() {
      if (!this.hasStarted) {
        this.hasStarted = true;
        this.active = true;
        if (this.startOverlay) this.startOverlay.hidden = true;
        this.toothLayer.querySelectorAll("button.tooth").forEach((tooth) => {
          tooth.disabled = false;
        });
        return;
      }
      this.prepareRound(true);
    }

    chooseTheme() {
      let nextIndex;
      if (this.themeIndex < 0) {
        nextIndex = randomIndex(THEMES.length);
      } else {
        const offset = randomIndex(THEMES.length - 1);
        nextIndex = offset >= this.themeIndex ? offset + 1 : offset;
      }
      this.themeIndex = nextIndex;
      const theme = THEMES[nextIndex];
      THEMES.forEach(({ id }) => this.root.classList.remove(`theme-${id}`));
      this.root.classList.add(`theme-${theme.id}`);
      this.root.dataset.theme = theme.id;
      if (this.themeLabel) this.themeLabel.textContent = `${theme.name} · SHARK SNAP`;
      if (this.themeFootnote) this.themeFootnote.textContent = `本局主题 · ${theme.name}`;
      if (this.introTheme) this.introTheme.textContent = `${theme.name} · PARTY GAME`;
      if (this.sharkStage) this.sharkStage.setAttribute("aria-label", `${theme.name}主题的鲨鱼张开嘴，点击牙齿进行游戏`);
    }

    renderTeeth() {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < TOTAL_TEETH; index += 1) {
        const button = document.createElement("button");
        const tooth = TOOTH_LAYOUT[index];
        const isUpper = tooth.row === "upper";
        const position = isUpper ? index : index - 10;
        const enamelId = `enamel-${index}`;
        button.type = "button";
        button.className = `tooth ${isUpper ? "upper" : "lower"}`;
        button.dataset.index = String(index);
        button.style.setProperty("--x", `${(tooth.x / 360) * 100}%`);
        button.style.setProperty("--y", `${(tooth.y / 420) * 100}%`);
        button.style.setProperty("--w", `${(tooth.w / 360) * 100}%`);
        button.style.setProperty("--h", `${(tooth.h / 420) * 100}%`);
        button.style.setProperty("--angle", `${tooth.angle}deg`);
        button.setAttribute("aria-label", `${isUpper ? "上排" : "下排"}第 ${position + 1} 颗牙`);
        button.disabled = !this.active;
        button.innerHTML = `<svg class="tooth-shape" viewBox="0 0 40 54" aria-hidden="true" focusable="false"><defs><linearGradient id="${enamelId}" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#fffffb"/><stop offset=".52" stop-color="#fff9ed"/><stop offset="1" stop-color="#e9e1d6"/></linearGradient></defs><path d="${TOOTH_PATHS[index % TOOTH_PATHS.length]}" fill="url(#${enamelId})" stroke="#ded5c9" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 11c7-4 14-4 21-1" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" opacity=".85"/></svg>`;
        fragment.appendChild(button);
      }
      this.toothLayer.textContent = "";
      this.toothLayer.appendChild(fragment);
    }

    updateHud() {
      if (this.turnNumber) this.turnNumber.textContent = `第 ${this.turn} 位`;
      if (this.safeCount) this.safeCount.textContent = `${this.pressed.size} / ${TOTAL_TEETH}`;
    }

    pressTooth(index) {
      if (!this.active || this.finished || !Number.isInteger(index) ||
          index < 0 || index >= TOTAL_TEETH || this.pressed.has(index)) return false;

      const button = this.toothLayer.querySelector(`[data-index="${index}"]`);
      if (!button) return false;

      if (index === this.dangerIndex) {
        this.finished = true;
        this.active = false;
        button.classList.add("danger");
        button.setAttribute("aria-label", `${button.getAttribute("aria-label")}，机关牙`);
        this.toothLayer.querySelectorAll("button.tooth").forEach((tooth) => {
          tooth.disabled = true;
        });
        if (this.sharkStage) this.sharkStage.classList.add("is-biting");
        if (this.biteFlash) this.biteFlash.classList.add("is-visible");
        if (this.statusText) this.statusText.innerHTML = "鲨鱼合上嘴啦！<br><strong>第 " + this.turn + " 位被抓到了！</strong>";
        if (this.resultTitle) this.resultTitle.textContent = "鲨鱼咬到你啦！";
        if (this.resultSubtitle) this.resultSubtitle.textContent = `第 ${this.turn} 位玩家触发了机关 · 已安全按下 ${this.pressed.size} 颗牙`;
        this.playBiteSound();
        this.vibrate([70, 45, 110]);
        const round = this.round;
        this.revealTimer = setTimeout(() => {
          this.revealTimer = null;
          if (this.round !== round || !this.finished) return;
          if (this.resultOverlay) this.resultOverlay.hidden = false;
          const playAgainButton = this.root.querySelector("#play-again");
          if (playAgainButton && typeof playAgainButton.focus === "function") playAgainButton.focus();
        }, BITE_REVEAL_DELAY_MS);
      } else {
        this.pressed.add(index);
        button.classList.add("pressed");
        button.disabled = true;
        button.setAttribute("aria-label", `${button.getAttribute("aria-label")}，安全`);
        this.playSafeSound();
        this.vibrate(12);
        this.turn += 1;
        this.updateHud();
        if (this.statusText) {
          this.statusText.innerHTML = "安全！换下一位<br><strong>轮到第 " + this.turn + " 位按牙齿</strong>";
        }
      }
      return true;
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      if (this.soundToggle) {
        this.soundToggle.classList.toggle("is-muted", !this.soundEnabled);
        this.soundToggle.classList.toggle("muted", !this.soundEnabled);
        this.soundToggle.setAttribute("aria-label", this.soundEnabled ? "关闭声音" : "开启声音");
        this.soundToggle.setAttribute("aria-pressed", String(!this.soundEnabled));
      }
      if (this.soundEnabled) this.playTone(620, 0.09, "sine", 0.08);
    }

    getAudioContext() {
      if (!this.soundEnabled) return null;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      try {
        if (!this.audioContext) this.audioContext = new Context();
        if (this.audioContext.state === "suspended" && typeof this.audioContext.resume === "function") {
          const resumeResult = this.audioContext.resume();
          if (resumeResult && typeof resumeResult.catch === "function") resumeResult.catch(() => {});
        }
        return this.audioContext;
      } catch (_) {
        return null;
      }
    }

    playTone(frequency, duration, type, volume, delay = 0) {
      const context = this.getAudioContext();
      if (!context) return;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      } catch (_) {
        // The game still works when audio is unavailable.
      }
    }

    playSafeSound() {
      this.playTone(540, 0.10, "sine", 0.09);
      this.playTone(760, 0.11, "sine", 0.07, 0.055);
    }

    playBiteSound() {
      this.playTone(120, 0.26, "sawtooth", 0.22);
      this.playTone(82, 0.30, "triangle", 0.20, 0.06);
    }

    vibrate(pattern) {
      try {
        if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
      } catch (_) {
        // Haptics are optional.
      }
    }
  }

  window.SharkGame = SharkGame;
  function boot() {
    const root = document.querySelector("#app");
    if (root && !root.sharkGame) root.sharkGame = new SharkGame(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
