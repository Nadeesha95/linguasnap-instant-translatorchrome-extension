// Translation runs here (not in the content script) so page CORS/CSP can't block the request.

function translateWithGoogle(text, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang || 'auto')}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const translatedText = (data && data[0] ? data[0].map(item => item[0]).join('') : '').trim();
      if (!translatedText) throw new Error('Empty translation');
      return { translatedText, sourceLang: (data && data[2]) || sourceLang };
    });
}

function translateWithMyMemory(text, sourceLang, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const translatedText = data?.responseData?.translatedText;
      if (!translatedText) throw new Error('Empty translation');
      return { translatedText, sourceLang };
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'translate') return;

  const { text, sourceLang, targetLang } = message;
  translateWithGoogle(text, 'auto', targetLang)
    .catch(() => translateWithMyMemory(text, sourceLang, targetLang))
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(err => sendResponse({ ok: false, error: String(err) }));
  return true; // keep the channel open for the async response
});
