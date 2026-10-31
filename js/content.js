let isEnabled = false;
let targetLang = 'si';
const DAILY_LIMIT = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.enableTranslation !== undefined) {
    isEnabled = message.enableTranslation;
    if (message.targetLang) targetLang = message.targetLang;

    if (isEnabled) {
      document.addEventListener('mouseup', handleSelection);
    } else {
      document.removeEventListener('mouseup', handleSelection);
    }
  }
});

// Default ON on first install, auto-detect language
chrome.storage.local.get(['extensionEnabled', 'targetLang'], data => {
  const isFirstRun = data.extensionEnabled === undefined;
  isEnabled = isFirstRun ? true : data.extensionEnabled;
  targetLang = data.targetLang || detectBrowserLang();
  if (isEnabled) {
    document.addEventListener('mouseup', handleSelection);
  }
});

function detectBrowserLang() {
  const SUPPORTED = ['si','ta','zh','es','fr','de','ja','ko','ar','hi','pt','ru','it','nl','tr','pl','sv','id','ms','th','vi','uk','bn','fa','el'];
  const tag = (navigator.language || '').split('-')[0].toLowerCase();
  return SUPPORTED.includes(tag) ? tag : 'si';
}

function getTodayKey() {
  return 'usage_' + new Date().toISOString().slice(0, 10);
}

async function getUsedWords() {
  return new Promise(resolve => {
    chrome.storage.local.get(getTodayKey(), data => {
      resolve(data[getTodayKey()] || 0);
    });
  });
}

async function addUsedWords(count) {
  const key = getTodayKey();
  const current = await getUsedWords();
  const newCount = current + count;
  chrome.storage.local.set({ [key]: newCount });
  return newCount;
}

// Detect language of selected text using the MyMemory API
// Detect language using Unicode character ranges (no extra API call needed)
function detectLanguage(text) {
  const sample = text.trim();

  if (/[\u0D80-\u0DFF]/.test(sample)) return 'si'; // Sinhala
  if (/[\u0B80-\u0BFF]/.test(sample)) return 'ta'; // Tamil
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(sample)) return 'zh'; // Chinese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return 'ja'; // Japanese
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(sample)) return 'ko'; // Korean
  if (/[\u0600-\u06FF]/.test(sample)) return 'ar'; // Arabic/Persian/Urdu
  if (/[\u0900-\u097F]/.test(sample)) return 'hi'; // Hindi
  if (/[\u0980-\u09FF]/.test(sample)) return 'bn'; // Bengali
  if (/[\u0400-\u04FF]/.test(sample)) return detectCyrillic(sample); // Russian/Ukrainian
  if (/[\u0E00-\u0E7F]/.test(sample)) return 'th'; // Thai
  if (/[\u1E00-\u1EFF]/.test(sample)) return 'vi'; // Vietnamese
  if (/[\u0370-\u03FF]/.test(sample)) return 'el'; // Greek

  return 'en'; // Default to English for Latin scripts
}

// Distinguish Russian vs Ukrainian within Cyrillic
function detectCyrillic(text) {
  // Ukrainian-specific letters
  if (/[іїєґ]/i.test(text)) return 'uk';
  return 'ru';
}

function tryDictTranslation(text) {
  const words = text.trim().split(/\s+/);
  
  // Only use dictionary for single words
  if (words.length > 1) return null;

  const clean = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean && enSiDict[clean]) {
    return enSiDict[clean][0];
  }

  return null; // not found — fall back to API
}

let lastTranslatedText = '';

async function handleSelection(event) {
  if (!isEnabled) return;

  // Small delay to let the browser update the selection
  await new Promise(r => setTimeout(r, 10));

  const selectedText = window.getSelection().toString().trim();

  // Ignore if no text selected
  if (!selectedText) {
    document.querySelectorAll('.ls-tooltip').forEach(t => t.remove());
    return;
  }

  // Ignore if same text as last translation (click away fires mouseup again)
  if (selectedText === lastTranslatedText) return;

  lastTranslatedText = selectedText;
  document.querySelectorAll('.ls-tooltip').forEach(t => t.remove());

  const wordCount = selectedText.split(/\s+/).filter(Boolean).length;

  const used = await getUsedWords();
  if (used >= DAILY_LIMIT) {
    showTooltip(event, '⚠️ Daily limit reached (500 words). Resets at midnight.', 'limit');
    return;
  }

  const remaining = DAILY_LIMIT - used;
  if (wordCount > remaining) {
    showTooltip(event, `⚠️ Only ${remaining} words remaining today.`, 'limit');
    return;
  }

  const loadingEl = showTooltip(event, '⏳ Translating…', 'loading');

  try {
    // Step 1: detect source language locally
    const sourceLang = detectLanguage(selectedText);

    // If source is already the target language, skip
    if (sourceLang === targetLang) {
      loadingEl.remove();
      showTooltip(event, '⚠️ Text is already in the selected language.', 'limit');
      return;
    }

    let translatedText = null;

    // Step 2: if target is Sinhala, source is English, and single word — try dictionary first
    if (targetLang === 'si' && sourceLang === 'en') {
      translatedText = tryDictTranslation(selectedText);
    }

    // Step 3: fall back to API if dictionary missed or multi-word
    if (!translatedText) {
      const apiURL = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=${sourceLang}|${targetLang}`;
      const response = await fetch(apiURL);
      const data = await response.json();
      if (data?.responseData?.translatedText) {
        translatedText = data.responseData.translatedText;
      }
    }

    const newTotal = await addUsedWords(wordCount);
    loadingEl.remove();

    showTooltip(event, translatedText || selectedText, 'result', { wordCount, newTotal, sourceLang });

  } catch (error) {
    loadingEl.remove();
    showTooltip(event, '❌ Translation failed. Check your connection.', 'error');
  }
}

// Language code → display name map for the tooltip badge
const LANG_NAMES = {
  en:'EN', si:'SI', ta:'TA', zh:'ZH', es:'ES', fr:'FR', de:'DE', ja:'JA',
  ko:'KO', ar:'AR', hi:'HI', pt:'PT', ru:'RU', it:'IT', nl:'NL', tr:'TR',
  pl:'PL', sv:'SV', id:'ID', ms:'MS', th:'TH', vi:'VI', uk:'UK', bn:'BN',
  fa:'FA', el:'EL'
};

function showTooltip(event, text, type = 'result', meta = null) {
  const selection = window.getSelection();
  let x, y;

  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    x = (rect.left + rect.right) / 2 + window.scrollX;
    y = rect.bottom + window.scrollY + 8;
  } catch {
    x = event.pageX;
    y = event.pageY + 8;
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'ls-tooltip';

  if (type === 'loading') {
    tooltip.innerHTML = `<span class="ls-loading">${text}</span>`;
  } else if (type === 'limit' || type === 'error') {
    tooltip.innerHTML = `<span class="ls-warning">${text}</span>`;
  } else {
    // Show "FR → SI" style badge when source is detected
    const fromBadge = meta?.sourceLang && meta.sourceLang !== 'en'
      ? `<span class="ls-lang-badge">${LANG_NAMES[meta.sourceLang] || meta.sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}</span>`
      : `<span class="ls-lang-badge">${targetLang.toUpperCase()}</span>`;

    const usageInfo = meta ? `
      <div class="ls-meta">
        <span>${meta.wordCount} word${meta.wordCount !== 1 ? 's' : ''}</span>
        <span class="ls-dot">·</span>
        <span>${meta.newTotal}/${DAILY_LIMIT} today</span>
      </div>
    ` : '';

    tooltip.innerHTML = `
      <div class="ls-header">
        ${fromBadge}
        <span class="ls-close" onclick="this.closest('.ls-tooltip').remove()">✕</span>
      </div>
      <div class="ls-translated">${text}</div>
      ${usageInfo}
    `;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  document.body.appendChild(tooltip);

  requestAnimationFrame(() => {
    const w = tooltip.offsetWidth;
    const vw = window.innerWidth;
    let left = x - w / 2;
    if (left < 8) left = 8;
    if (left + w > vw - 8) left = vw - w - 8;
    tooltip.style.left = `${left + window.scrollX}px`;
  });

  const duration = type === 'loading' ? 15000 : (type === 'result' ? 8000 : 4000);
  const timer = setTimeout(() => tooltip.remove(), duration);
  tooltip.addEventListener('mouseenter', () => clearTimeout(timer));

  return tooltip;
}