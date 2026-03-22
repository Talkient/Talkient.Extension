const CONTAINER_ID = 'talkient-translation-result';

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

function buildHeader(title: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'talkient-translation-header';

  const titleEl = document.createElement('strong');
  titleEl.className = 'talkient-translation-title';
  titleEl.textContent = title;

  const closeButton = document.createElement('button');
  closeButton.className = 'talkient-translation-close';
  closeButton.type = 'button';
  closeButton.textContent = 'x';
  closeButton.addEventListener('click', () => {
    const container = document.getElementById(CONTAINER_ID);
    container?.remove();
  });

  header.append(titleEl, closeButton);
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
}
