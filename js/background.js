// Translation runs here (not in the content script) so page CORS/CSP can't block the request.

// Google's free gtx endpoint has no quota, but bursts get the user's IP temporarily
// blocked (HTTP 429). Cap the request rate and back off when Google pushes back.
const GOOGLE_MAX_PER_MINUTE = 30;
const GOOGLE_COOLDOWN_MS = 5 * 60 * 1000;
const CACHE_MAX = 300;

const googleRequestTimes = [];
const translationCache = new Map();

function cacheSet(key, value) {
  if (translationCache.size >= CACHE_MAX) translationCache.delete(translationCache.keys().next().value);
  translationCache.set(key, value);
}

// Kept in session storage so the cooldown survives the service worker being suspended
async function googleCoolingDown() {
  const { googleCooldownUntil = 0 } = await chrome.storage.session.get('googleCooldownUntil');
  return Date.now() < googleCooldownUntil;
}

function startGoogleCooldown() {
  chrome.storage.session.set({ googleCooldownUntil: Date.now() + GOOGLE_COOLDOWN_MS });
}

function takeGoogleSlot() {
  const now = Date.now();
  while (googleRequestTimes.length && now - googleRequestTimes[0] > 60000) googleRequestTimes.shift();
  if (googleRequestTimes.length >= GOOGLE_MAX_PER_MINUTE) return false;
  googleRequestTimes.push(now);
  return true;
}

async function translateWithGoogle(text, targetLang) {
  if (await googleCoolingDown()) throw new Error('Google cooling down');
  if (!takeGoogleSlot()) throw new Error('Google rate limit');

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (res.status === 429 || res.status === 403) startGoogleCooldown();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const translatedText = (data && data[0] ? data[0].map(item => item[0]).join('') : '').trim();
  if (!translatedText) throw new Error('Empty translation');
  return { translatedText, sourceLang: (data && data[2]) || '' };
}

function translateWithMyMemory(text, sourceLang, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const translatedText = data?.responseData?.translatedText;
      // MyMemory reports its own quota errors inside a 200 response
      if (!translatedText || data.responseStatus === 429) throw new Error('Empty translation');
      return { translatedText, sourceLang };
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'translate') return;

  const { text, sourceLang, targetLang } = message;
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    sendResponse({ ok: true, ...translationCache.get(cacheKey) });
    return;
  }

  translateWithGoogle(text, targetLang)
    .catch(() => translateWithMyMemory(text, sourceLang, targetLang))
    .then(result => {
      cacheSet(cacheKey, result);
      sendResponse({ ok: true, ...result });
    })
    .catch(err => sendResponse({ ok: false, error: String(err) }));
  return true; // keep the channel open for the async response
});
