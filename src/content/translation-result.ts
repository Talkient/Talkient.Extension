const CONTAINER_ID = 'talkient-translation-result';
const CARD_WIDTH_PX = 360;
const VIEWPORT_MARGIN_PX = 12;
const OFFSET_FROM_SELECTION_PX = 8;
let lastAnchorRect: DOMRect | null = null;

function getContainer(): HTMLDivElement {
  let container = document.getElementById(
    CONTAINER_ID,
  ) as HTMLDivElement | null;
  if (container) {
    return container;
  }

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'talkient-translation-card';
  document.body.appendChild(container);
  return container;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function captureSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return rect;
}

function positionContainerNearSelection(container: HTMLDivElement): void {
  const currentRect = captureSelectionRect();
  if (currentRect) {
    lastAnchorRect = currentRect;
  }

  if (!lastAnchorRect) {
    container.style.left = 'auto';
    container.style.top = 'auto';
    container.style.right = '20px';
    container.style.bottom = '20px';
    return;
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  const maxLeft = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportWidth - CARD_WIDTH_PX - VIEWPORT_MARGIN_PX,
  );
  const left = clamp(lastAnchorRect.left, VIEWPORT_MARGIN_PX, maxLeft);

  const containerHeight = Math.max(container.offsetHeight, 120);
  const maxTop = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportHeight - containerHeight - VIEWPORT_MARGIN_PX,
  );

  let top = lastAnchorRect.bottom + OFFSET_FROM_SELECTION_PX;
  if (top > maxTop) {
    top = lastAnchorRect.top - containerHeight - OFFSET_FROM_SELECTION_PX;
  }
  top = clamp(top, VIEWPORT_MARGIN_PX, maxTop);

  container.style.left = `${left}px`;
  container.style.top = `${top}px`;
  container.style.right = 'auto';
  container.style.bottom = 'auto';
}

function openOptionsPage(): void {
  const runtime = (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
  if (runtime && typeof runtime.sendMessage === 'function') {
    runtime.sendMessage({ type: 'OPEN_OPTIONS' }, () => {
      if (runtime.lastError) {
        const optionsUrl =
          typeof runtime.getURL === 'function'
            ? runtime.getURL('options/options.html')
            : '/options/options.html';
        window.open(optionsUrl, '_blank', 'noopener,noreferrer');
      }
    });
    return;
  }

  const fallbackUrl =
    runtime && typeof runtime.getURL === 'function'
      ? runtime.getURL('options/options.html')
      : '/options/options.html';
  window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
}

function buildHeader(title: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'talkient-translation-header';

  const titleEl = document.createElement('strong');
  titleEl.className = 'talkient-translation-title';
  titleEl.textContent = title;

  const actions = document.createElement('div');
  actions.className = 'talkient-translation-actions';

  const settingsButton = document.createElement('button');
  settingsButton.className = 'talkient-translation-settings';
  settingsButton.type = 'button';
  settingsButton.textContent = 'Settings';
  settingsButton.addEventListener('click', openOptionsPage);

  const closeButton = document.createElement('button');
  closeButton.className = 'talkient-translation-close';
  closeButton.type = 'button';
  closeButton.textContent = 'x';
  closeButton.addEventListener('click', () => {
    const container = document.getElementById(CONTAINER_ID);
    container?.remove();
  });

  actions.append(settingsButton, closeButton);
  header.append(titleEl, actions);
  return header;
}

export function showTranslationLoading(originalText: string): void {
  const container = getContainer();
  container.replaceChildren();
  container.classList.remove('talkient-translation-error');

  const header = buildHeader('Translating...');

  const source = document.createElement('p');
  source.className = 'talkient-translation-source';
  source.textContent = originalText;

  const status = document.createElement('p');
  status.className = 'talkient-translation-status';
  status.textContent = 'Please wait while we translate your selected text.';

  container.append(header, source, status);
  positionContainerNearSelection(container);
}

export function showTranslationSuccess(payload: {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
}): void {
  const container = getContainer();
  container.replaceChildren();
  container.classList.remove('talkient-translation-error');

  const header = buildHeader('Translation');

  const meta = document.createElement('p');
  meta.className = 'talkient-translation-meta';
  meta.textContent = `${payload.sourceLanguage} -> ${payload.targetLanguage} (${payload.provider})`;

  const source = document.createElement('p');
  source.className = 'talkient-translation-source';
  source.textContent = payload.originalText;

  const translated = document.createElement('p');
  translated.className = 'talkient-translation-text';
  translated.textContent = payload.translatedText;

  container.append(header, meta, source, translated);
  positionContainerNearSelection(container);
}

export function showTranslationError(payload: {
  errorCode: string;
  message: string;
}): void {
  const container = getContainer();
  container.replaceChildren();
  container.classList.add('talkient-translation-error');

  const header = buildHeader('Translation failed');

  const message = document.createElement('p');
  message.className = 'talkient-translation-status';
  message.textContent = payload.message;

  const code = document.createElement('p');
  code.className = 'talkient-translation-meta';
  code.textContent = `Code: ${payload.errorCode}`;

  const help = document.createElement('p');
  help.className = 'talkient-translation-help';
  help.textContent = 'Try selecting shorter text or retry in a moment.';

  container.append(header, message, code, help);
  positionContainerNearSelection(container);
}
