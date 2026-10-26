(() => {
  "use strict";

  const VIRTUES = [
    {
      id: "mengucapkan-salam",
      condition: "Mengucapkan Salam",
      shortCondition: "Salam",
      situation: "Bertemu Guru di Sekolah",
      wheelLines: ["Mengucapkan", "Salam"],
      icon: "👋",
      color: "#f8cc61",
      soft: "#fff0bd",
      explanation:
        "Mengucapkan salam saat bertemu guru adalah tanda hormat dan doa yang baik."
    },
    {
      id: "berdoa",
      condition: "Berdoa",
      shortCondition: "Berdoa",
      situation: "Masuk Masjid",
      wheelLines: ["Berdoa"],
      icon: "🤲",
      color: "#9dd5ef",
      soft: "#e2f3fb",
      explanation:
        "Masuk masjid sambil berdoa adalah adab yang menjaga hati tetap tenang."
    },
    {
      id: "berbagi",
      condition: "Berbagi",
      shortCondition: "Berbagi",
      situation: "Diberi Makanan",
      wheelLines: ["Berbagi"],
      icon: "🍱",
      color: "#f8bd8b",
      soft: "#ffead8",
      explanation:
        "Saat diberi makanan, kita bisa berbagi dengan teman dan mengucapkan terima kasih."
    },
    {
      id: "menolong-teman",
      condition: "Menolong Teman",
      shortCondition: "Menolong",
      situation: "Teman Menjatuhkan Buku",
      wheelLines: ["Menolong", "Teman"],
      icon: "🤝",
      color: "#f4a7bc",
      soft: "#fde6ed",
      explanation:
        "Teman menjatuhkan buku, kita bantu memungutnya dengan senang hati."
    },
    {
      id: "menjaga-kebersihan",
      condition: "Menjaga Kebersihan",
      shortCondition: "Kebersihan",
      situation: "Melihat Sampah Berserakan",
      wheelLines: ["Menjaga", "Kebersihan"],
      icon: "🧹",
      color: "#a9ddbf",
      soft: "#e3f5ea",
      explanation:
        "Melihat sampah berserakan, kita pungut dan buang ke tempat sampah."
    },
    {
      id: "berkata-jujur",
      condition: "Berkata Jujur",
      shortCondition: "Jujur",
      situation: "Tidak Sengaja Menjatuhkan Mainan",
      wheelLines: ["Berkata", "Jujur"],
      icon: "💬",
      color: "#c7df7e",
      soft: "#f0f7d8",
      explanation:
        "Tidak sengaja menjatuhkan mainan, kita berterus terang dan minta maaf."
    },
    {
      id: "meminta-maaf",
      condition: "Meminta Maaf",
      shortCondition: "Meminta Maaf",
      situation: "Melakukan Kesalahan",
      wheelLines: ["Meminta", "Maaf"],
      icon: "🙏",
      color: "#c5b1e8",
      soft: "#eee7fa",
      explanation:
        "Saat melakukan kesalahan, segeralah meminta maaf dengan tulus."
    }
  ];

  class SoundEngine {
    constructor() {
      this.enabled = true;
      this.context = null;
      this.master = null;
      this.volume = 0.32;
    }

    unlock() {
      if (!this.enabled) {
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      try {
        if (!this.context) {
          this.context = new AudioContextClass();
          this.master = this.context.createGain();
          this.master.gain.value = this.volume;
          this.master.connect(this.context.destination);
        }

        if (this.context.state === "suspended") {
          this.context.resume().catch(() => {});
        }
      } catch {
        this.context = null;
        this.master = null;
      }
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (!this.context || !this.master) {
        return;
      }

      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0.0001, now, 0.015);
    }

    note(frequency, duration, delay = 0, type = "sine", gain = 0.06, endFrequency = null) {
      if (!this.enabled || !this.context || !this.master) {
        return;
      }

      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      }

      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    }

    tick() {
      this.note(1120, 0.028, 0, "triangle", 0.018, 820);
    }

    spinStart() {
      this.note(170, 0.42, 0, "sine", 0.035, 540);
    }

    reveal() {
      this.note(392, 0.18, 0, "sine", 0.045);
      this.note(523.25, 0.22, 0.09, "sine", 0.05);
    }

    correct() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.note(frequency, 0.28, index * 0.08, "triangle", 0.075);
      });
      this.note(1567.98, 0.3, 0.34, "sine", 0.022);
    }

    wrong() {
      this.note(220, 0.16, 0, "triangle", 0.055);
      this.note(174.61, 0.24, 0.14, "triangle", 0.055);
    }

    reset() {
      this.note(523.25, 0.12, 0, "sine", 0.04);
      this.note(392, 0.2, 0.1, "sine", 0.04);
    }

    toggleOn() {
      this.note(523.25, 0.12, 0, "sine", 0.045);
      this.note(783.99, 0.18, 0.08, "sine", 0.045);
    }
  }

  const SEGMENT_ANGLE = 360 / VIRTUES.length;
  const LABEL_RADIUS_PERCENT = 30.4;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SOUND_PREFERENCE_KEY = "roda-kebaikan-sound";

  const wheel = document.getElementById("wheel");
  const wheelDisc = document.getElementById("wheelDisc");
  const wheelLabels = document.getElementById("wheelLabels");
  const spinButton = document.getElementById("spinButton");
  const spinButtonText = document.getElementById("spinButtonText");
  const spinHelp = document.getElementById("spinHelp");
  const liveStatus = document.getElementById("liveStatus");
  const scorePill = document.getElementById("scorePill");
  const scoreValue = document.getElementById("scoreValue");
  const soundToggle = document.getElementById("soundToggle");
  const soundLabel = document.getElementById("soundLabel");
  const soundIconOn = soundToggle.querySelector(".sound-icon-on");
  const soundIconOff = soundToggle.querySelector(".sound-icon-off");
  const resetButton = document.getElementById("resetButton");
  const feedbackToast = document.getElementById("feedbackToast");
  const feedbackToastIcon = document.getElementById("feedbackToastIcon");
  const feedbackToastTitle = document.getElementById("feedbackToastTitle");
  const feedbackToastDetail = document.getElementById("feedbackToastDetail");

  const idleState = document.getElementById("idleState");
  const idleTitle = idleState.querySelector(".idle-title");
  const idleText = idleState.querySelector(".idle-text");
  const roundState = document.getElementById("roundState");
  const roundBadge = document.getElementById("roundBadge");
  const promptCard = document.getElementById("promptCard");
  const promptIcon = document.getElementById("promptIcon");
  const promptKicker = document.getElementById("promptKicker");
  const conditionTitle = document.getElementById("conditionTitle");
  const instructionText = document.getElementById("instructionText");
  const cardsGrid = document.getElementById("cardsGrid");
  const roundActions = document.getElementById("roundActions");
  const roundNote = document.getElementById("roundNote");
  const playAgainButton = document.getElementById("playAgainButton");
  const confettiLayer = document.getElementById("confettiLayer");
  const wheelPanel = document.querySelector(".wheel-panel");
  const boardPanel = document.querySelector(".board-panel");

  const state = {
    phase: "idle",
    stars: 0,
    rotation: 0,
    selected: null,
    roundId: 0,
    finishTimer: null
  };

  const sound = new SoundEngine();
  const allLabels = [];
  let spinTickTimer = null;
  let feedbackTimer = null;

  function loadSoundPreference() {
    try {
      return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off";
    } catch {
      return true;
    }
  }

  function saveSoundPreference(enabled) {
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? "on" : "off");
    } catch {
      // Penyimpanan lokal bisa diblokir; preferensi tetap berlaku di sesi ini.
    }
  }

  function applySoundPreference(enabled, options = {}) {
    const { preview = false, announceChange = false } = options;

    sound.setEnabled(enabled);
    soundToggle.setAttribute("aria-pressed", String(enabled));
    soundToggle.setAttribute(
      "aria-label",
      enabled ? "Matikan efek suara" : "Nyalakan efek suara"
    );
    soundLabel.textContent = enabled ? "Suara aktif" : "Suara mati";
    soundIconOn.hidden = !enabled;
    soundIconOff.hidden = enabled;
    saveSoundPreference(enabled);

    if (enabled && preview) {
      sound.unlock();
      sound.toggleOn();
    }

    if (announceChange) {
      announce(enabled ? "Efek suara diaktifkan." : "Efek suara dimatikan.");
    }
  }

  function stopSpinTicks() {
    if (spinTickTimer !== null) {
      window.clearTimeout(spinTickTimer);
      spinTickTimer = null;
    }
  }

  function startSpinTicks(duration) {
    stopSpinTicks();

    if (!sound.enabled || prefersReducedMotion.matches) {
      return;
    }

    let elapsed = 0;
    let delay = 70;

    const tick = () => {
      spinTickTimer = null;

      if (!sound.enabled || state.phase !== "spinning") {
        return;
      }

      sound.tick();
      elapsed += delay;

      if (elapsed >= duration - 180) {
        return;
      }

      delay = Math.min(440, delay * 1.12);
      spinTickTimer = window.setTimeout(tick, delay);
    };

    spinTickTimer = window.setTimeout(tick, 70);
  }

  function hideFeedback() {
    if (feedbackTimer !== null) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    feedbackToast.classList.remove("is-visible");
  }

  function showFeedback(kind, title, detail) {
    if (feedbackTimer !== null) {
      window.clearTimeout(feedbackTimer);
    }

    feedbackToast.classList.remove("is-visible", "is-correct", "is-wrong", "is-reset");
    feedbackToast.classList.add(
      kind === "wrong" ? "is-wrong" : kind === "reset" ? "is-reset" : "is-correct"
    );
    feedbackToastIcon.textContent =
      kind === "wrong" ? "×" : kind === "reset" ? "↺" : "✓";
    feedbackToastTitle.textContent = title;
    feedbackToastDetail.textContent = detail;
    void feedbackToast.offsetWidth;
    feedbackToast.classList.add("is-visible");

    feedbackTimer = window.setTimeout(() => {
      feedbackToast.classList.remove("is-visible");
      feedbackTimer = null;
    }, 1900);
  }

  function createWheel() {
    const stops = VIRTUES.map((virtue, index) => {
      const start = index * SEGMENT_ANGLE;
      const end = start + SEGMENT_ANGLE;
      return `${virtue.color} ${start}deg ${end}deg`;
    }).join(", ");

    wheelDisc.style.background = `conic-gradient(from 0deg, ${stops})`;

    VIRTUES.forEach((virtue, index) => {
      const label = document.createElement("div");
      label.className = "wheel-label";
      label.dataset.index = String(index);

      const icon = document.createElement("span");
      icon.className = "wheel-label-icon";

      const character = document.createElement("img");
      character.className = "wheel-character-image";
      character.alt = "";
      character.width = 120;
      character.height = 120;
      character.decoding = "async";
      character.draggable = false;
      character.hidden = true;

      const fallback = document.createElement("span");
      fallback.className = "wheel-emoji-fallback";
      fallback.textContent = virtue.icon;

      let svgTried = false;
      character.addEventListener("load", () => {
        fallback.hidden = true;
        character.hidden = false;
      });
      character.addEventListener("error", () => {
        if (!svgTried) {
          svgTried = true;
          character.src = `assets/wheel/${virtue.id}.svg`;
          return;
        }
        character.remove();
        fallback.hidden = false;
      });
      character.src = `assets/wheel/${virtue.id}.webp`;

      icon.append(character, fallback);

      const text = document.createElement("span");
      text.className = "wheel-label-text";
      virtue.wheelLines.forEach((line) => {
        const lineElement = document.createElement("span");
        lineElement.textContent = line;
        text.appendChild(lineElement);
      });

      label.append(icon, text);
      wheelLabels.appendChild(label);
      allLabels.push(label);
    });

    positionWheelLabels(0);
  }

  function positionWheelLabels(rotation) {
    VIRTUES.forEach((_, index) => {
      const absoluteAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + rotation;
      const radians = ((absoluteAngle - 90) * Math.PI) / 180;
      const x = 50 + LABEL_RADIUS_PERCENT * Math.cos(radians);
      const y = 50 + LABEL_RADIUS_PERCENT * Math.sin(radians);
      allLabels[index].style.left = `${x}%`;
      allLabels[index].style.top = `${y}%`;
    });
  }

  function spinDuration() {
    return prefersReducedMotion.matches ? 260 : 4700;
  }

  function syncMotionPreference() {
    document.documentElement.style.setProperty("--spin-duration", `${spinDuration()}ms`);
  }

  function announce(message) {
    liveStatus.textContent = "";
    window.setTimeout(() => {
      liveStatus.textContent = message;
    }, 30);
  }

  function setSpinButton(mode) {
    if (mode === "spinning") {
      spinButton.disabled = true;
      spinButton.classList.add("is-spinning");
      spinButtonText.textContent = "Memutar";
      spinButton.setAttribute("aria-label", "Roda sedang berputar");
      wheel.setAttribute("aria-busy", "true");
      return;
    }

    spinButton.classList.remove("is-spinning");
    wheel.removeAttribute("aria-busy");

    if (mode === "choosing") {
      spinButton.disabled = true;
      spinButtonText.textContent = "Pilih";
      spinButton.setAttribute("aria-label", "Pilih kartu situasi terlebih dahulu");
      return;
    }

    if (mode === "solved") {
      spinButton.disabled = false;
      spinButtonText.textContent = "Lagi";
      spinButton.setAttribute("aria-label", "Putar roda lagi");
      return;
    }

    spinButton.disabled = false;
    spinButtonText.textContent = "Putar";
    spinButton.setAttribute("aria-label", "Putar roda kebaikan");
  }

  function showSpinningBoard() {
    idleState.hidden = false;
    roundState.hidden = true;
    idleTitle.textContent = "Roda sedang berputar…";
    idleText.textContent = "Tunggu sebentar, kebaikan akan segera terpilih.";
    roundBadge.textContent = "Memutar roda";
    roundBadge.classList.remove("is-ready");
    roundActions.hidden = true;
  }

  function resetBoardCopy() {
    idleTitle.textContent = "Kartu situasi menantimu";
    idleText.textContent = "Putar roda dulu, ya. Nanti tiga kartu situasi terbuka muncul di sini.";
  }

  function startSpin() {
    if (state.phase === "spinning" || state.phase === "choosing") {
      return;
    }

    state.roundId += 1;
    const roundId = state.roundId;
    const duration = spinDuration();
    window.clearTimeout(state.finishTimer);
    stopSpinTicks();
    hideFeedback();

    state.phase = "spinning";
    state.selected = null;
    showSpinningBoard();
    setSpinButton("spinning");
    wheel.classList.add("is-spinning");
    allLabels.forEach((label) => label.classList.remove("is-selected"));
    spinHelp.textContent = "Roda sedang berputar. Tunggu sampai berhenti, ya.";
    announce("Roda sedang berputar.");

    sound.unlock();
    sound.spinStart();
    startSpinTicks(duration);

    const chosenIndex = Math.floor(Math.random() * VIRTUES.length);
    const segmentCenter = chosenIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const jitterLimit = SEGMENT_ANGLE / 2 - 4.5;
    const jitter = (Math.random() * 2 - 1) * jitterLimit;
    const desiredAngle = -(segmentCenter) + jitter;
    const currentNormalized = ((state.rotation % 360) + 360) % 360;
    const desiredNormalized = ((desiredAngle % 360) + 360) % 360;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const delta = ((desiredNormalized - currentNormalized + 360) % 360) + extraTurns * 360;
    const targetRotation = state.rotation + delta;

    state.rotation = targetRotation;
    wheelDisc.style.transform = `rotate(${targetRotation}deg)`;

    state.finishTimer = window.setTimeout(() => {
      finishSpin(roundId, chosenIndex);
    }, duration + 90);
  }

  function finishSpin(roundId, chosenIndex) {
    if (roundId !== state.roundId || state.phase !== "spinning") {
      return;
    }

    const selected = VIRTUES[chosenIndex];
    state.phase = "choosing";
    state.selected = selected;

    stopSpinTicks();
    sound.reveal();
    wheel.classList.remove("is-spinning");
    positionWheelLabels(state.rotation);
    allLabels[chosenIndex].classList.add("is-selected");
    setSpinButton("choosing");
    spinHelp.textContent = `Roda berhenti di ${selected.condition}. Pilih kartu situasi yang cocok di papan permainan.`;
    roundBadge.textContent = "Pilih 1 kartu";
    roundBadge.classList.add("is-ready");

    renderRound(selected, roundId);
    announce(`Roda berhenti di ${selected.condition}. Pilih satu kartu situasi yang cocok.`);
    revealBoardOnSmallScreen(roundId);
  }

  function renderRound(selected, roundId) {
    idleState.hidden = true;
    roundState.hidden = false;
    roundActions.hidden = true;
    cardsGrid.classList.remove("is-solved");
    cardsGrid.replaceChildren();

    promptCard.className = "prompt-card";
    promptCard.style.setProperty("--prompt-color", selected.color);
    promptCard.style.setProperty("--prompt-soft", selected.soft);
    promptIcon.textContent = selected.icon;
    promptKicker.textContent = "Roda berhenti di";
    conditionTitle.textContent = selected.condition;
    instructionText.textContent = `Semua kartu terbuka. Pilih situasi yang paling cocok dengan ${selected.condition}.`;

    const choices = makeChoices(selected);

    choices.forEach((virtue, index) => {
      const card = createSituationCard(virtue, index, selected, roundId);
      cardsGrid.appendChild(card);
    });
  }

  function makeChoices(correct) {
    const others = VIRTUES.filter((virtue) => virtue.id !== correct.id);
    shuffle(others);
    const choices = [correct, ...others.slice(0, 2)];
    shuffle(choices);
    return choices;
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    return items;
  }

  function createSituationCard(virtue, index, selected, roundId) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "situation-card";
    card.dataset.id = virtue.id;
    card.style.setProperty("--delay", `${index * 85}ms`);
    card.setAttribute(
      "aria-label",
      `Kartu ${index + 1}. Pilih situasi: ${virtue.situation}.`
    );

    card.innerHTML = `
      <span class="card-face card-front">
        <span class="card-art">
          <img alt="" width="400" height="300" draggable="false" decoding="async">
        </span>
        <span class="card-body">
          <span class="card-condition-tag" aria-hidden="true">${virtue.condition}</span>
          <span class="card-title">${virtue.situation}</span>
        </span>
        <span class="card-verdict" aria-hidden="true"></span>
      </span>
    `;

    const image = card.querySelector("img");
    const imageWrap = card.querySelector(".card-art");
    const verdict = card.querySelector(".card-verdict");
    const conditionTag = card.querySelector(".card-condition-tag");

    image.alt = `Ilustrasi ${virtue.situation.toLowerCase()}`;
    image.addEventListener("error", () => {
      if (!image.dataset.fallbackUsed) {
        image.dataset.fallbackUsed = "true";
        image.src = `assets/cards/${virtue.id}.svg`;
        return;
      }

      image.remove();
      imageWrap.innerHTML = `<span class="card-art-fallback" aria-hidden="true">${virtue.icon}</span>`;
    });
    image.src = `assets/cards/${virtue.id}.webp`;

    card.addEventListener("click", () => {
      chooseCard(card, virtue, selected, roundId, verdict, conditionTag);
    });

    return card;
  }

  function chooseCard(card, virtue, selected, roundId, verdict, conditionTag) {
    if (state.phase !== "choosing" || roundId !== state.roundId || card.disabled) {
      return;
    }

    sound.unlock();
    const isCorrect = virtue.id === selected.id;
    card.disabled = true;

    if (isCorrect) {
      card.classList.add("is-correct");
      verdict.textContent = "✓";
      revealConditionTag(conditionTag);
      revealAllConditionTags(card);
      card.setAttribute(
        "aria-label",
        `${virtue.situation}. Benar, cocok dengan ${virtue.condition}.`
      );
      handleCorrect(card, selected);
      return;
    }

    card.classList.add("is-wrong");
    card.classList.add("is-shaking");
    verdict.textContent = "×";
    revealConditionTag(conditionTag);
    card.setAttribute(
      "aria-label",
      `${virtue.situation}. Belum cocok. Kondisi kartu ini: ${virtue.condition}.`
    );
    window.setTimeout(() => card.classList.remove("is-shaking"), 480);
    handleWrong(virtue, selected);
  }

  function revealConditionTag(tag) {
    tag.classList.add("is-visible");
    tag.setAttribute("aria-hidden", "false");
  }

  function revealAllConditionTags(chosenCard) {
    cardsGrid.querySelectorAll(".situation-card").forEach((card) => {
      const tag = card.querySelector(".card-condition-tag");
      const title = card.querySelector(".card-title");
      if (!tag || !title) {
        return;
      }

      revealConditionTag(tag);
      const condition = tag.textContent;
      const situation = title.textContent;
      const isChosen = card === chosenCard;
      card.setAttribute(
        "aria-label",
        `${situation}. Kondisi: ${condition}.${isChosen ? " Jawaban tepat." : ""}`
      );
    });
  }

  function handleCorrect(card, selected) {
    state.phase = "solved";
    state.stars += 1;
    scoreValue.textContent = String(state.stars);
    scorePill.setAttribute("aria-label", `Bintang: ${state.stars}`);
    scorePill.classList.remove("is-popping");
    void scorePill.offsetWidth;
    scorePill.classList.add("is-popping");
    window.setTimeout(() => scorePill.classList.remove("is-popping"), 620);

    promptCard.className = "prompt-card is-success";
    promptCard.style.setProperty("--prompt-color", selected.color);
    promptCard.style.setProperty("--prompt-soft", selected.soft);
    promptIcon.textContent = "✓";
    promptKicker.textContent = "Tepat sekali!";
    conditionTitle.textContent = selected.condition;
    instructionText.textContent = selected.explanation;
    roundBadge.textContent = "Selesai";
    roundBadge.classList.add("is-ready");
    spinHelp.textContent = "Kartu yang tepat sudah ditemukan. Tekan putar lagi untuk mencoba kebaikan lain.";
    roundNote.textContent = `Kamu mendapat 1 bintang. Sekarang totalnya ${state.stars} bintang.`;
    roundActions.hidden = false;
    cardsGrid.classList.add("is-solved");

    card.disabled = true;
    cardsGrid.querySelectorAll(".situation-card").forEach((otherCard) => {
      otherCard.disabled = true;
    });

    setSpinButton("solved");
    sound.correct();
    showFeedback("correct", "Tepat sekali!", "+1 bintang");
    launchConfetti();
    revealSolvedActions();
    announce(
      `Tepat sekali. ${selected.condition} cocok dengan ${selected.situation}. ${selected.explanation}`
    );
    state.finishTimer = null;
  }

  function handleWrong(virtue, selected) {
    promptCard.className = "prompt-card is-wrong";
    promptCard.style.setProperty("--prompt-color", selected.color);
    promptCard.style.setProperty("--prompt-soft", selected.soft);
    promptIcon.textContent = "!";
    promptKicker.textContent = "Belum cocok";
    conditionTitle.textContent = selected.condition;
    instructionText.textContent = `Kartu "${virtue.situation}" cocok untuk ${virtue.condition}. Coba kartu lain, ya.`;
    roundBadge.textContent = "Coba lagi";
    roundBadge.classList.remove("is-ready");
    spinHelp.textContent = "Belum tepat. Pilih kartu lain yang cocok dengan kebaikan dari roda.";
    sound.wrong();
    showFeedback("wrong", "Belum cocok", "Coba kartu lain, ya");
    announce(`Belum cocok. Kartu ${virtue.situation} cocok untuk ${virtue.condition}.`);
  }

  function revealBoardOnSmallScreen(roundId) {
    if (!window.matchMedia("(max-width: 980px)").matches) {
      return;
    }

    const boardRect = boardPanel.getBoundingClientRect();
    const isBoardMostlyHidden = boardRect.top > window.innerHeight * 0.5;
    if (!isBoardMostlyHidden) {
      return;
    }

    window.setTimeout(() => {
      if (state.phase !== "choosing" || roundId !== state.roundId) {
        return;
      }
      boardPanel.scrollIntoView({
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    }, 520);
  }

  function revealSolvedActions() {
    if (!window.matchMedia("(max-width: 620px)").matches) {
      return;
    }

    window.setTimeout(() => {
      if (state.phase !== "solved") {
        return;
      }
      roundActions.scrollIntoView({
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        block: "nearest"
      });
    }, 780);
  }

  function resetGame() {
    state.roundId += 1;
    state.phase = "idle";
    state.selected = null;
    state.stars = 0;
    state.rotation = 0;
    window.clearTimeout(state.finishTimer);
    state.finishTimer = null;
    stopSpinTicks();
    hideFeedback();

    scoreValue.textContent = "0";
    scorePill.setAttribute("aria-label", "Bintang: 0");
    scorePill.classList.remove("is-popping");

    wheel.classList.remove("is-spinning");
    wheelDisc.classList.add("is-instant");
    wheelDisc.style.transform = "rotate(0deg)";
    void wheelDisc.offsetWidth;
    wheelDisc.classList.remove("is-instant");
    positionWheelLabels(0);
    allLabels.forEach((label) => label.classList.remove("is-selected"));

    idleState.hidden = false;
    roundState.hidden = true;
    roundActions.hidden = true;
    cardsGrid.replaceChildren();
    cardsGrid.classList.remove("is-solved");
    resetBoardCopy();
    resetPrompt();

    roundBadge.textContent = "Siap bermain";
    roundBadge.classList.add("is-ready");
    spinHelp.textContent = "Tekan tombol di tengah roda untuk mulai.";
    setSpinButton("idle");
    confettiLayer.replaceChildren();

    sound.unlock();
    sound.reset();
    showFeedback("reset", "Permainan dimulai ulang", "Bintang kembali ke 0");
    announce("Permainan dimulai ulang. Semua bintang dihapus.");
  }

  function resetPrompt() {
    promptCard.className = "prompt-card";
    promptCard.style.removeProperty("--prompt-color");
    promptCard.style.removeProperty("--prompt-soft");
    promptIcon.textContent = "★";
    promptKicker.textContent = "Roda berhenti di";
    conditionTitle.textContent = "Bersiap…";
    instructionText.textContent = "Pilih satu kartu situasi yang paling cocok.";
  }

  function launchConfetti() {
    if (prefersReducedMotion.matches) {
      return;
    }

    const colors = ["#eb6b57", "#f8cc61", "#3d8d64", "#9dd5ef", "#f4a7bc", "#c5b1e8"];
    const pieces = 34;

    for (let index = 0; index < pieces; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--w", `${5 + Math.random() * 7}px`);
      piece.style.setProperty("--h", `${8 + Math.random() * 11}px`);
      piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
      piece.style.setProperty("--rotate", `${240 + Math.random() * 620}deg`);
      piece.style.setProperty("--duration", `${1700 + Math.random() * 1300}ms`);
      piece.style.setProperty("--delay", `${Math.random() * 260}ms`);
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      confettiLayer.appendChild(piece);
    }

    window.setTimeout(() => {
      confettiLayer.replaceChildren();
    }, 3600);
  }

  spinButton.addEventListener("click", startSpin);

  soundToggle.addEventListener("click", () => {
    const nextEnabled = !sound.enabled;
    applySoundPreference(nextEnabled, {
      preview: nextEnabled,
      announceChange: true
    });
  });

  resetButton.addEventListener("click", resetGame);

  playAgainButton.addEventListener("click", () => {
    if (state.phase !== "solved") {
      return;
    }

    startSpin();

    if (window.matchMedia("(max-width: 980px)").matches) {
      wheelPanel.scrollIntoView({
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    }
  });

  prefersReducedMotion.addEventListener?.("change", () => {
    syncMotionPreference();
    if (prefersReducedMotion.matches) {
      stopSpinTicks();
    }
  });

  createWheel();
  syncMotionPreference();
  resetBoardCopy();
  applySoundPreference(loadSoundPreference(), {
    preview: false,
    announceChange: false
  });
  setSpinButton("idle");
})();
