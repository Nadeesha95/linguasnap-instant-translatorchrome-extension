const LANGUAGES = [
  { code: 'si', name: 'Sinhala',    native: 'සිංහල',         flag: '🇱🇰' },
  { code: 'ta', name: 'Tamil',      native: 'தமிழ்',          flag: '🇮🇳' },
  { code: 'zh', name: 'Chinese',    native: '中文',             flag: '🇨🇳' },
  { code: 'es', name: 'Spanish',    native: 'Español',         flag: '🇪🇸' },
  { code: 'fr', name: 'French',     native: 'Français',        flag: '🇫🇷' },
  { code: 'de', name: 'German',     native: 'Deutsch',         flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese',   native: '日本語',           flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     native: '한국어',           flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic',     native: 'العربية',         flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi',      native: 'हिन्दी',           flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', native: 'Português',       flag: '🇧🇷' },
  { code: 'ru', name: 'Russian',    native: 'Русский',         flag: '🇷🇺' },
  { code: 'it', name: 'Italian',    native: 'Italiano',        flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch',      native: 'Nederlands',      flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish',    native: 'Türkçe',          flag: '🇹🇷' },
  { code: 'pl', name: 'Polish',     native: 'Polski',          flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish',    native: 'Svenska',         flag: '🇸🇪' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay',      native: 'Bahasa Melayu',   flag: '🇲🇾' },
  { code: 'th', name: 'Thai',       native: 'ภาษาไทย',          flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt',      flag: '🇻🇳' },
  { code: 'uk', name: 'Ukrainian',  native: 'Українська',      flag: '🇺🇦' },
  { code: 'bn', name: 'Bengali',    native: 'বাংলা',            flag: '🇧🇩' },
  { code: 'fa', name: 'Persian',    native: 'فارسی',            flag: '🇮🇷' },
  { code: 'el', name: 'Greek',      native: 'Ελληνικά',        flag: '🇬🇷' },
];

let selectedLang = LANGUAGES[0];
let isOpen = false;

const toggleSwitch   = document.getElementById('toggleSwitch');
const powerLabel     = document.getElementById('powerLabel');
const usedWordsEl    = document.getElementById('usedWords');
const statusPill     = document.getElementById('statusPill');
const statusText     = document.getElementById('statusText');
const selectedLangEl = document.getElementById('selectedLang');
const selFlag        = document.getElementById('selFlag');
const selName        = document.getElementById('selName');
const selCode        = document.getElementById('selCode');
const langGrid       = document.getElementById('langGrid');
const langSearch     = document.getElementById('langSearch');
const searchWrap     = document.getElementById('searchWrap');

function detectRegionLang() {
  const locale = navigator.language || navigator.languages?.[0] || '';
  const tag = locale.split('-')[0].toLowerCase();
  const supported = LANGUAGES.map(l => l.code);
  return supported.includes(tag) ? tag : null;
}

function getTodayKey() {
  return 'usage_' + new Date().toISOString().slice(0, 10);
}

function buildLangGrid(filter = '') {
  langGrid.innerHTML = '';
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(filter.toLowerCase()) ||
    l.native.toLowerCase().includes(filter.toLowerCase()) ||
    l.code.toLowerCase().includes(filter.toLowerCase())
  );
  filtered.forEach(lang => {
    const item = document.createElement('div');
    item.className = 'lang-item' + (lang.code === selectedLang.code ? ' active' : '');
    item.innerHTML = `
      <span class="lang-flag">${lang.flag}</span>
      <span class="lang-name">${lang.name}</span>
      <span class="lang-native">${lang.native}</span>
      <span class="lang-check">✓</span>
    `;
    item.addEventListener('click', () => {
      selectedLang = lang;
      chrome.storage.local.set({ targetLang: lang.code });
      updateSelectedDisplay();
      closeDropdown();
      notifyContentScript();
    });
    langGrid.appendChild(item);
  });
}

function updateSelectedDisplay() {
  selFlag.textContent = selectedLang.flag;
  selName.textContent = selectedLang.name;
  selCode.textContent = `${selectedLang.code.toUpperCase()} · ${selectedLang.native}`;
}

function openDropdown() {
  isOpen = true;
  selectedLangEl.classList.add('open');
  langGrid.classList.add('visible');
  searchWrap.style.display = 'block';
  langSearch.focus();
  buildLangGrid();
}

function closeDropdown() {
  isOpen = false;
  selectedLangEl.classList.remove('open');
  langGrid.classList.remove('visible');
  searchWrap.style.display = 'none';
  langSearch.value = '';
}

selectedLangEl.addEventListener('click', () => isOpen ? closeDropdown() : openDropdown());
langSearch.addEventListener('input', () => buildLangGrid(langSearch.value));

function updateUsageUI(used) {
  usedWordsEl.textContent = used;
}

function updateStatus(enabled) {
  if (enabled) {
    statusPill.className = 'status-pill on';
    statusText.textContent = `Active · Translating to ${selectedLang.name}`;
    powerLabel.textContent = 'ON';
  } else {
    statusPill.className = 'status-pill off';
    statusText.textContent = 'Extension is off — toggle to enable';
    powerLabel.textContent = 'OFF';
  }
}

toggleSwitch.addEventListener('change', () => {
  const enabled = toggleSwitch.checked;
  chrome.storage.local.set({ extensionEnabled: enabled });
  updateStatus(enabled);
  notifyContentScript(enabled);
});

function notifyContentScript(forceEnabled) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.storage.local.get(['extensionEnabled', 'targetLang'], data => {
      const enabled = forceEnabled !== undefined ? forceEnabled : data.extensionEnabled;
      chrome.tabs.sendMessage(tabs[0].id, {
        enableTranslation: !!enabled,
        targetLang: data.targetLang || 'si'
      }).catch(() => {});
    });
  });
}

// Init — default ON on first install, auto-detect language
chrome.storage.local.get(['extensionEnabled', 'targetLang', getTodayKey()], data => {
  const isFirstRun = data.extensionEnabled === undefined;
  const enabled = isFirstRun ? true : data.extensionEnabled;
  if (isFirstRun) chrome.storage.local.set({ extensionEnabled: true });

  const used = data[getTodayKey()] || 0;

  let langCode = data.targetLang;
  if (!langCode) {
    langCode = detectRegionLang() || 'si';
    chrome.storage.local.set({ targetLang: langCode });
  }
  const lang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];

  toggleSwitch.checked = enabled;
  powerLabel.textContent = enabled ? 'ON' : 'OFF';
  selectedLang = lang;

  updateSelectedDisplay();
  updateUsageUI(used);
  updateStatus(enabled);

  if (isFirstRun) notifyContentScript(true);
});