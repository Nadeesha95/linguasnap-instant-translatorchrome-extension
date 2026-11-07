// Promotes YouTube Auto Dub on youtube.com — shown at most MAX_SHOWS times, then never again.

const PROMO_URL = 'https://nadeesha95.github.io/youtube-auto-dub/';
const PROMO_KEY = 'autoDubPromoShown';
const MAX_SHOWS = 6;

chrome.storage.local.get(PROMO_KEY, data => {
  const shown = data[PROMO_KEY] || 0;
  if (shown >= MAX_SHOWS) return;

  chrome.storage.local.set({ [PROMO_KEY]: shown + 1 });
  setTimeout(showPromo, 3000);
});

function showPromo() {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;';
  // Shadow DOM keeps YouTube's styles from leaking into the card
  const root = host.attachShadow({ mode: 'closed' });

  root.innerHTML = `
    <style>
      .card {
        width: 300px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 14px;
        color: #e8e8f0;
        background: #0f0f18;
        border: 1px solid rgba(124, 106, 247, 0.35);
        border-radius: 14px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 30px rgba(124, 106, 247, 0.15);
        padding: 16px;
        animation: pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes pop {
        from { opacity: 0; transform: translateY(12px) scale(0.95); }
        to   { opacity: 1; transform: none; }
      }
      .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .title { font-weight: 600; font-size: 15px; }
      .close { cursor: pointer; opacity: 0.6; background: none; border: 0; color: inherit; font-size: 14px; }
      .close:hover { opacity: 1; }
      .body { line-height: 1.45; opacity: 0.85; margin-bottom: 12px; }
      .cta {
        display: inline-block;
        background: #7c6af7;
        color: #fff;
        text-decoration: none;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 8px;
      }
      .cta:hover { background: #6a57f0; }
      .from { font-size: 11px; opacity: 0.5; margin-top: 10px; }
    </style>
    <div class="card">
      <div class="head">
        <span class="title">🎙️ Watch YouTube in your language</span>
        <button class="close" title="Dismiss">✕</button>
      </div>
      <div class="body">Try <b>YouTube Auto Dub</b> — auto-translates and voices any video's captions in Sinhala and more.</div>
      <a class="cta" href="${PROMO_URL}" target="_blank" rel="noopener">Try it free</a>
      <div class="from">From the maker of LinguaSnap</div>
    </div>
  `;

  const remove = () => host.remove();
  root.querySelector('.close').addEventListener('click', remove);
  root.querySelector('.cta').addEventListener('click', () => {
    // Interested users have seen enough — stop promoting
    chrome.storage.local.set({ [PROMO_KEY]: MAX_SHOWS });
    remove();
  });
  setTimeout(remove, 20000);

  document.documentElement.appendChild(host);
}
