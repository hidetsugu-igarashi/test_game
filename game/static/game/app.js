const GAME_DURATION = 60;
const WORD_BONUS = 100;
const COUNTDOWN_WARNING = 10;
const STORAGE_KEY = 'typingGame.highScore';

const LEVEL_LABELS = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい'
};

const ROMAJI_MAP = {
  'あ': 'a',
  'い': 'i',
  'う': 'u',
  'え': 'e',
  'お': 'o',
  'か': 'ka',
  'き': 'ki',
  'く': 'ku',
  'け': 'ke',
  'こ': 'ko',
  'さ': 'sa',
  'し': 'shi',
  'す': 'su',
  'せ': 'se',
  'そ': 'so',
  'た': 'ta',
  'ち': 'chi',
  'つ': 'tsu',
  'て': 'te',
  'と': 'to',
  'な': 'na',
  'に': 'ni',
  'ぬ': 'nu',
  'ね': 'ne',
  'の': 'no',
  'は': 'ha',
  'ひ': 'hi',
  'ふ': 'fu',
  'へ': 'he',
  'ほ': 'ho',
  'ま': 'ma',
  'み': 'mi',
  'む': 'mu',
  'め': 'me',
  'も': 'mo',
  'や': 'ya',
  'ゆ': 'yu',
  'よ': 'yo',
  'ら': 'ra',
  'り': 'ri',
  'る': 'ru',
  'れ': 're',
  'ろ': 'ro',
  'わ': 'wa',
  'を': 'wo',
  'ん': 'n',
  'が': 'ga',
  'ぎ': 'gi',
  'ぐ': 'gu',
  'げ': 'ge',
  'ご': 'go',
  'ざ': 'za',
  'じ': 'ji',
  'ず': 'zu',
  'ぜ': 'ze',
  'ぞ': 'zo',
  'だ': 'da',
  'ぢ': 'ji',
  'づ': 'zu',
  'で': 'de',
  'ど': 'do',
  'ば': 'ba',
  'び': 'bi',
  'ぶ': 'bu',
  'べ': 'be',
  'ぼ': 'bo',
  'ぱ': 'pa',
  'ぴ': 'pi',
  'ぷ': 'pu',
  'ぺ': 'pe',
  'ぽ': 'po'
};

const HIRAGANA_POOL = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
  'が', 'ぎ', 'ぐ', 'げ', 'ご',
  'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
  'だ', 'ぢ', 'づ', 'で', 'ど',
  'ば', 'び', 'ぶ', 'べ', 'ぼ',
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'
];

const LEVEL_CONFIG = {
  easy: { min: 2, max: 3 },
  normal: { min: 3, max: 4 },
  hard: { min: 4, max: 6 }
};

function loadHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch (error) {
    console.warn('ハイスコアの読み込みに失敗しました', error);
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    console.warn('ハイスコアの保存に失敗しました', error);
  }
}

function randomInt(min, max) {
  if (min >= max) {
    return min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateWord(level) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.normal;
  const length = randomInt(config.min, config.max);
  let word = '';
  for (let i = 0; i < length; i += 1) {
    word += randomFromArray(HIRAGANA_POOL);
  }
  return word;
}

function kanaToRomajiSegments(word) {
  return Array.from(word).map(ch => ROMAJI_MAP[ch] || ch);
}

function kanaToRomaji(word) {
  return kanaToRomajiSegments(word).join('');
}

function countKanaFromRomajiLength(length, segments) {
  let consumed = 0;
  let count = 0;
  for (const segment of segments) {
    const next = consumed + segment.length;
    if (length >= next) {
      consumed = next;
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function romajiLengthForKanaCount(count, segments) {
  let length = 0;
  for (let i = 0; i < count; i += 1) {
    length += segments[i] ? segments[i].length : 0;
  }
  return length;
}

function toHiragana(value) {
  return value.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

class SoundController {
  constructor() {
    this.enabled = true;
    this.musicEnabled = true;
    this.context = null;
    this.master = null;
    this.musicNode = null;
    this.musicGain = null;
    this.musicLfo = null;
  }

  ensureContext() {
    if (this.context) {
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API がサポートされていません。');
      this.enabled = false;
      this.musicEnabled = false;
      return;
    }
    this.context = new AudioCtx();
    this.master = this.context.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.context.destination);
  }

  async resumeContext() {
    if (!this.context) {
      this.ensureContext();
    }
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (err) {
        console.warn('Audio resume failed', err);
      }
    }
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) {
      this.stopMusic();
    }
  }

  setMusicEnabled(value) {
    this.musicEnabled = value;
    if (!value) {
      this.stopMusic();
    } else if (value && this.enabled) {
      this.startMusic();
    }
  }

  playTone({ frequency = 440, duration = 0.15, type = 'sine', gain = 0.6, attack = 0.01, release = 0.12, detune = 0 }) {
    if (!this.enabled) {
      return;
    }
    this.ensureContext();
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const envelope = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    if (detune) {
      osc.detune.value = detune;
    }

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(gain, now + attack);
    envelope.gain.linearRampToValueAtTime(0.0001, now + attack + duration + release);

    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + release + attack);
  }

  playChord(notes) {
    notes.forEach(note => this.playTone(note));
  }

  play(eventName) {
    switch (eventName) {
      case 'start':
        this.playChord([
          { frequency: 523.25, duration: 0.2, type: 'triangle', gain: 0.5 },
          { frequency: 659.25, duration: 0.25, type: 'sine', gain: 0.35, detune: 5 }
        ]);
        break;
      case 'word':
        this.playChord([
          { frequency: 520, duration: 0.2, type: 'triangle', gain: 0.5 },
          { frequency: 780, duration: 0.24, type: 'sine', gain: 0.35 }
        ]);
        break;
      case 'miss':
        this.playTone({ frequency: 280, duration: 0.25, type: 'sawtooth', gain: 0.35 });
        break;
      case 'button':
        this.playTone({ frequency: 600, duration: 0.12, type: 'triangle', gain: 0.3 });
        break;
      case 'countdown':
        this.playTone({ frequency: 920, duration: 0.25, type: 'square', gain: 0.4 });
        break;
      case 'end':
        this.playChord([
          { frequency: 392, duration: 0.3, type: 'sine', gain: 0.4 },
          { frequency: 294, duration: 0.35, type: 'triangle', gain: 0.3 }
        ]);
        break;
      default:
        break;
    }
  }

  startMusic() {
    if (!this.enabled || !this.musicEnabled) {
      return;
    }
    this.ensureContext();
    if (!this.context || this.musicNode) {
      return;
    }
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.value = 220;
    gain.gain.value = 0.08;

    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    lfoGain.gain.value = 15;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(this.master);

    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.8);

    osc.start(now);
    lfo.start(now);

    this.musicNode = osc;
    this.musicGain = gain;
    this.musicLfo = lfo;
  }

  stopMusic() {
    if (!this.musicNode || !this.context) {
      return;
    }
    const stopAt = this.context.currentTime + 0.25;
    this.musicGain.gain.linearRampToValueAtTime(0, stopAt);
    this.musicNode.stop(stopAt + 0.05);
    this.musicLfo.stop(stopAt + 0.05);
    this.musicNode.disconnect();
    this.musicGain.disconnect();
    this.musicLfo.disconnect();
    this.musicNode = null;
    this.musicGain = null;
    this.musicLfo = null;
  }
}

const sound = new SoundController();

const ui = {
  screens: {
    title: document.querySelector('[data-screen="title"]'),
    game: document.querySelector('[data-screen="game"]'),
    result: document.querySelector('[data-screen="result"]')
  },
  startButton: document.getElementById('start-button'),
  levelSelect: document.getElementById('level-select'),
  soundToggle: document.getElementById('sound-toggle'),
  musicToggle: document.getElementById('music-toggle'),
  homeButton: document.getElementById('home-button'),
  soundButton: document.getElementById('sound-button'),
  retryButton: document.getElementById('retry-button'),
  backButton: document.getElementById('back-button'),
  typingInput: document.getElementById('typing-input'),
  promptWord: document.getElementById('prompt-word'),
  levelTag: document.getElementById('level-tag'),
  feedback: document.getElementById('feedback'),
  score: document.getElementById('score'),
  highScore: document.getElementById('high-score'),
  timer: document.getElementById('timer'),
  finalScore: document.getElementById('final-score'),
  finalHits: document.getElementById('final-hits'),
  finalTotal: document.getElementById('final-total'),
  finalAccuracy: document.getElementById('final-accuracy')
};

const state = {
  level: 'normal',
  targetWord: '',
  targetRomaji: '',
  romajiSegments: [],
  typed: '',
  typedKanaCount: 0,
  typedRomaji: '',
  inputValue: '',
  isRunning: false,
  awaitingNext: false,
  remaining: GAME_DURATION,
  timerId: null,
  countdownPlayed: false,
  settings: {
    sound: true,
    music: true
  },
  stats: {
    score: 0,
    successes: 0,
    attempts: 0,
    highScore: loadHighScore()
  },
  pendingSubmit: false,
  isComposing: false
};

function showScreen(name) {
  Object.entries(ui.screens).forEach(([key, element]) => {
    if (!element) {
      return;
    }
    element.hidden = key !== name;
  });
}

function updateHud() {
  ui.score.textContent = state.stats.score;
  const liveHighScore = Math.max(state.stats.highScore, state.stats.score);
  ui.highScore.textContent = liveHighScore;
  ui.timer.textContent = state.remaining.toString().padStart(2, '0');
  ui.levelTag.textContent = LEVEL_LABELS[state.level] || '';
  ui.soundButton.textContent = state.settings.sound ? '🔊' : '🔇';
  ui.soundButton.setAttribute('aria-pressed', String(state.settings.sound));
}

function renderPrompt() {
  const chars = state.targetWord.split('');
  const typedCount = state.typedKanaCount;
  const fragments = chars.map((ch, index) => {
    if (index < typedCount) {
      return `<span class="typed">${ch}</span>`;
    }
    if (index === typedCount) {
      return `<span class="current">${ch}</span>`;
    }
    return `<span>${ch}</span>`;
  });
  ui.promptWord.innerHTML = fragments.join('');
}

function flashFeedback(message, type = 'default') {
  ui.feedback.textContent = message;
  ui.feedback.className = 'feedback is-visible';
  if (type === 'error') {
    ui.feedback.classList.add('is-error');
  } else if (type === 'bonus') {
    ui.feedback.classList.add('is-bonus');
  }
  setTimeout(() => {
    ui.feedback.classList.remove('is-visible', 'is-error', 'is-bonus');
  }, 700);
}

function resetTypedState() {
  state.typed = '';
  state.typedKanaCount = 0;
  state.typedRomaji = '';
}

function nextWord() {
  ui.promptWord.classList.remove('word-pop');
  state.targetWord = generateWord(state.level);
  state.targetRomaji = kanaToRomaji(state.targetWord);
  state.romajiSegments = kanaToRomajiSegments(state.targetWord);
  resetTypedState();
  state.inputValue = '';
  state.awaitingNext = false;
  state.pendingSubmit = false;
  state.isComposing = false;
  ui.typingInput.removeAttribute('disabled');
  ui.typingInput.value = '';
  renderPrompt();
  if (state.isRunning) {
    setTimeout(() => ui.typingInput.focus({ preventScroll: true }), 0);
  }
}

function triggerWordAnimation() {
  ui.promptWord.classList.remove('word-pop');
  void ui.promptWord.offsetWidth;
  ui.promptWord.classList.add('word-pop');
}

function syncTypedStateFromInput(rawValue) {
  const normalized = rawValue.normalize('NFKC');
  if (!normalized) {
    resetTypedState();
    renderPrompt();
    return;
  }
  const hasKana = /[぀-ゟ゠-ヿ]/.test(normalized);
  if (hasKana) {
    const hiragana = toHiragana(normalized);
    let matched = 0;
    const max = Math.min(hiragana.length, state.targetWord.length);
    while (matched < max && hiragana[matched] === state.targetWord[matched]) {
      matched += 1;
    }
    state.typedKanaCount = matched;
    state.typed = state.targetWord.slice(0, matched);
    const romajiLength = romajiLengthForKanaCount(matched, state.romajiSegments);
    state.typedRomaji = state.targetRomaji.slice(0, romajiLength);
  } else {
    const romaji = normalized.toLowerCase();
    let matchedRomaji = 0;
    for (let i = 1; i <= romaji.length; i += 1) {
      const prefix = romaji.slice(0, i);
      if (state.targetRomaji.startsWith(prefix)) {
        matchedRomaji = i;
      } else {
        break;
      }
    }
    state.typedRomaji = state.targetRomaji.slice(0, matchedRomaji);
    const matchedKana = countKanaFromRomajiLength(matchedRomaji, state.romajiSegments);
    state.typedKanaCount = matchedKana;
    state.typed = state.targetWord.slice(0, matchedKana);
  }
  renderPrompt();
}

function registerSuccess() {
  state.stats.successes += 1;
  state.stats.score = state.stats.successes * WORD_BONUS;
  flashFeedback('クリア！ +' + WORD_BONUS, 'bonus');
  sound.play('word');
  triggerWordAnimation();
  state.pendingSubmit = false;
  state.isComposing = false;
  state.awaitingNext = true;
  ui.typingInput.setAttribute('disabled', 'true');
  ui.typingInput.value = '';
  state.inputValue = '';
  resetTypedState();
  updateHud();
  setTimeout(() => {
    nextWord();
  }, 220);
}

function handleIncorrectAnswer() {
  flashFeedback('もう一度チャレンジ！', 'error');
  sound.play('miss');
  state.pendingSubmit = false;
  state.isComposing = false;
  ui.typingInput.value = '';
  state.inputValue = '';
  resetTypedState();
  renderPrompt();
  ui.typingInput.focus({ preventScroll: true });
}

function submitCurrentAnswer() {
  state.pendingSubmit = false;
  state.isComposing = false;
  if (!state.isRunning || state.awaitingNext) {
    return;
  }

  const rawValue = ui.typingInput.value.trim();
  if (!rawValue) {
    flashFeedback('入力してからエンター！', 'error');
    return;
  }

  state.stats.attempts += 1;

  const normalized = rawValue.normalize('NFKC');
  const hasKana = /[぀-ゟ゠-ヿ]/.test(normalized);
  let isCorrect = false;

  if (hasKana) {
    const hiragana = toHiragana(normalized);
    isCorrect = hiragana === state.targetWord;
  } else {
    const romaji = normalized.toLowerCase();
    isCorrect = romaji === state.targetRomaji;
  }

  if (isCorrect) {
    registerSuccess();
  } else {
    handleIncorrectAnswer();
  }

  updateHud();
}

function handleInputChange() {
  if (!state.isRunning || state.awaitingNext) {
    ui.typingInput.value = state.inputValue;
    return;
  }
  const rawValue = ui.typingInput.value;
  state.inputValue = rawValue;
  syncTypedStateFromInput(rawValue);
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTicking() {
  clearTimer();
  if (state.remaining <= 0) {
    return;
  }
  state.timerId = setInterval(() => {
    state.remaining -= 1;
    ui.timer.textContent = state.remaining.toString().padStart(2, '0');
    if (!state.countdownPlayed && state.remaining === COUNTDOWN_WARNING) {
      sound.play('countdown');
      state.countdownPlayed = true;
    }
    if (state.remaining <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  if (!state.isRunning) {
    return;
  }
  clearTimer();
  state.isRunning = false;
  state.awaitingNext = false;
  ui.typingInput.value = '';
  ui.typingInput.setAttribute('disabled', 'true');
  sound.play('end');
  sound.stopMusic();

  const { score, successes, attempts } = state.stats;
  const accuracy = attempts > 0 ? Math.round((successes / attempts) * 1000) / 10 : 0;
  ui.finalScore.textContent = score;
  ui.finalHits.textContent = successes;
  ui.finalTotal.textContent = attempts;
  finalAccuracy: document.getElementById('final-accuracy')

  const previousBest = state.stats.highScore;
  const newBest = score > previousBest;
  if (newBest) {
    state.stats.highScore = score;
    saveHighScore(score);
  }
  ui.highScore.textContent = Math.max(state.stats.highScore, state.stats.score);
  if (newBest) {
    ui.finalScore.classList.add('is-best');
  } else {
    ui.finalScore.classList.remove('is-best');
  }

  showScreen('result');
}

function resetStats() {
  state.stats.score = 0;
  state.stats.successes = 0;
  state.stats.attempts = 0;
  ui.finalScore.classList.remove('is-best');
}

function startGame() {
  state.level = ui.levelSelect.value;
  state.settings.sound = ui.soundToggle.checked;
  state.settings.music = ui.musicToggle.checked;
  sound.setEnabled(state.settings.sound);
  sound.setMusicEnabled(state.settings.music);

  state.isRunning = true;
  state.remaining = GAME_DURATION;
  state.countdownPlayed = false;
  state.awaitingNext = false;
  state.pendingSubmit = false;
  state.isComposing = false;
  state.inputValue = '';
  resetTypedState();
  resetStats();
  nextWord();
  updateHud();

  ui.typingInput.removeAttribute('disabled');
  sound.resumeContext();
  sound.play('start');
  if (state.settings.music) {
    sound.startMusic();
  }
  startTicking();
  showScreen('game');
  setTimeout(() => ui.typingInput.focus({ preventScroll: true }), 0);
}

function returnToTitle() {
  sound.play('button');
  clearTimer();
  state.isRunning = false;
  state.awaitingNext = false;
  state.pendingSubmit = false;
  state.isComposing = false;
  ui.typingInput.setAttribute('disabled', 'true');
  ui.typingInput.value = '';
  state.inputValue = '';
  sound.stopMusic();
  showScreen('title');
}

function toggleSoundSetting() {
  state.settings.sound = !state.settings.sound;
  ui.soundToggle.checked = state.settings.sound;
  sound.setEnabled(state.settings.sound);
  sound.play('button');
  updateHud();
}

function bindEvents() {
  ui.startButton.addEventListener('click', () => {
    sound.play('button');
    startGame();
  });

  ui.levelSelect.addEventListener('change', event => {
    state.level = event.target.value;
    updateHud();
  });

  ui.soundToggle.addEventListener('change', event => {
    state.settings.sound = event.target.checked;
    sound.setEnabled(state.settings.sound);
    if (state.settings.sound) {
      sound.play('button');
    }
    updateHud();
  });

  ui.musicToggle.addEventListener('change', event => {
    state.settings.music = event.target.checked;
    sound.setMusicEnabled(state.settings.music);
    if (state.settings.music && state.isRunning) {
      sound.startMusic();
    }
  });

  ui.homeButton.addEventListener('click', returnToTitle);
  ui.soundButton.addEventListener('click', toggleSoundSetting);

  ui.retryButton.addEventListener('click', () => {
    sound.play('button');
    startGame();
  });

  ui.backButton.addEventListener('click', returnToTitle);

  document.addEventListener('keydown', event => {
    if (!state.isRunning && !ui.screens.title.hidden && event.key === 'Enter') {
      sound.play('button');
      startGame();
    }
  });

  ui.typingInput.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });

  ui.typingInput.addEventListener('compositionend', () => {
    state.isComposing = false;
    if (state.pendingSubmit) {
      state.pendingSubmit = false;
      submitCurrentAnswer();
    }
  });

  ui.typingInput.addEventListener('keydown', event => {
    if (!state.isRunning) {
      return;
    }
    if (event.key === 'Enter') {
      if (state.isComposing) {
        state.pendingSubmit = true;
        return;
      }
      event.preventDefault();
      submitCurrentAnswer();
    }
  });

  ui.typingInput.addEventListener('input', handleInputChange);
}

function init() {
  bindEvents();
  showScreen('title');
  ui.typingInput.setAttribute('disabled', 'true');
  ui.soundToggle.checked = state.settings.sound;
  ui.musicToggle.checked = state.settings.music;
  updateHud();
}

document.addEventListener('DOMContentLoaded', init);





