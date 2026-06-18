const DEFAULT_APP_URL = 'https://bifrost-rho-seven.vercel.app';
const CHAPTER_PATTERNS = [
  /(chapter[-_/]?)(\d+)/i,
  /(ch[-_/]?)(\d+)/i,
  /([?&](?:chapter|ch)=)(\d+)/i
];

const fields = {
  title: document.querySelector('#title'),
  baseUrl: document.querySelector('#baseUrl'),
  currentChapter: document.querySelector('#currentChapter'),
  appUrl: document.querySelector('#appUrl'),
  status: document.querySelector('#status')
};

const normalizeAppUrl = (value) => {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed || DEFAULT_APP_URL;
};

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const createTemplate = (url) => {
  for (const pattern of CHAPTER_PATTERNS) {
    const match = url.match(pattern);

    if (match) {
      return {
        baseUrl: url.replace(pattern, `${match[1]}{chapter}`),
        currentChapter: Number(match[2])
      };
    }
  }

  return {
    baseUrl: url,
    currentChapter: 1
  };
};

const setStatus = (message) => {
  fields.status.textContent = message;
};

const loadInitialState = async () => {
  const [{ appUrl }, tab] = await Promise.all([
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }),
    getActiveTab()
  ]);

  fields.appUrl.value = appUrl;

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    setStatus('This browser page cannot be clipped.');
    return;
  }

  const template = createTemplate(tab.url);
  fields.title.value = tab.title || '';
  fields.baseUrl.value = template.baseUrl;
  fields.currentChapter.value = String(Math.max(1, template.currentChapter || 1));
  setStatus(
    template.baseUrl.includes('{chapter}')
      ? 'Chapter template detected.'
      : 'No chapter pattern detected; BIFROST will save the raw URL.'
  );
};

document.querySelector('#reset-url').addEventListener('click', async () => {
  fields.appUrl.value = DEFAULT_APP_URL;
  await chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  setStatus('BIFROST URL reset.');
});

document.querySelector('#clip-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const appUrl = normalizeAppUrl(fields.appUrl.value);
  const target = new URL(appUrl);
  target.searchParams.set('add', '1');
  target.searchParams.set('title', fields.title.value.trim());
  target.searchParams.set('baseUrl', fields.baseUrl.value.trim());
  target.searchParams.set('currentChapter', fields.currentChapter.value || '1');
  target.searchParams.set('category', 'Reading');

  await chrome.storage.sync.set({ appUrl });
  await chrome.tabs.create({ url: target.toString() });
  window.close();
});

loadInitialState().catch((error) => {
  console.error(error);
  setStatus('Could not read the current tab.');
});
