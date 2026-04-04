const TRIGGER_ID = 'talkient-inline-translate-trigger';
const VIEWPORT_MARGIN_PX = 8;
const OFFSET_FROM_SELECTION_PX = 6;

let activeClickHandler: ((event: MouseEvent) => void) | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRectValid(rect: DOMRect): boolean {
  return Number.isFinite(rect.width) && Number.isFinite(rect.height)
    ? rect.width > 0 || rect.height > 0
    : false;
}

function getOrCreateTriggerButton(): HTMLButtonElement {
  let button = document.getElementById(TRIGGER_ID) as HTMLButtonElement | null;

  if (button) {
    return button;
  }

  button = document.createElement('button');
  button.id = TRIGGER_ID;
  button.className = 'talkient-inline-translate-trigger';
  button.type = 'button';
  button.setAttribute('aria-label', 'Translate selection with Talkient');
  button.title = 'Translate selection with Talkient';

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 28 28');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('talkient-inline-translate-trigger-icon');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'linearGradient',
  );
  gradient.setAttribute('id', 'talkientInlineTriggerGradient');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');

  const stopStart = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'stop',
  );
  stopStart.setAttribute('offset', '0%');
  stopStart.setAttribute('stop-color', '#4d7dff');

  const stopEnd = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'stop',
  );
  stopEnd.setAttribute('offset', '100%');
  stopEnd.setAttribute('stop-color', '#2450d8');

  gradient.append(stopStart, stopEnd);
  defs.appendChild(gradient);

  const background = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  );
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', '28');
  background.setAttribute('height', '28');
  background.setAttribute('rx', '8');
  background.setAttribute('fill', 'url(#talkientInlineTriggerGradient)');

  const letterT = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  );
  letterT.setAttribute('d', 'M6 7h16v4h-6v10h-4V11H6z');
  letterT.setAttribute('fill', '#0b1222');

  icon.append(defs, background, letterT);
  button.appendChild(icon);
  document.body.appendChild(button);
  return button;
}

function positionButton(
  button: HTMLButtonElement,
  anchorRect: DOMRect,
): boolean {
  if (!isRectValid(anchorRect)) {
    return false;
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  const buttonRect = button.getBoundingClientRect();
  const buttonWidth = buttonRect.width || 28;
  const buttonHeight = buttonRect.height || 28;

  const idealLeft = anchorRect.right + OFFSET_FROM_SELECTION_PX;
  const maxLeft = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportWidth - buttonWidth - VIEWPORT_MARGIN_PX,
  );
  const left = clamp(idealLeft, VIEWPORT_MARGIN_PX, maxLeft);

  const belowTop = anchorRect.bottom + OFFSET_FROM_SELECTION_PX;
  const aboveTop = anchorRect.top - buttonHeight - OFFSET_FROM_SELECTION_PX;
  const maxTop = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportHeight - buttonHeight - VIEWPORT_MARGIN_PX,
  );

  const top =
    belowTop <= maxTop ? belowTop : clamp(aboveTop, VIEWPORT_MARGIN_PX, maxTop);

  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
  button.style.right = 'auto';
  button.style.bottom = 'auto';

  return true;
}

export function showInlineTranslateTrigger(input: {
  anchorRect: DOMRect;
  onClick: () => void;
}): boolean {
  const button = getOrCreateTriggerButton();

  if (!positionButton(button, input.anchorRect)) {
    hideInlineTranslateTrigger();
    return false;
  }

  button.disabled = false;
  button.classList.remove('talkient-inline-translate-trigger-disabled');

  if (activeClickHandler) {
    button.removeEventListener('click', activeClickHandler);
  }

  activeClickHandler = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    input.onClick();
  };

  button.addEventListener('click', activeClickHandler);
  return true;
}

export function repositionInlineTranslateTrigger(anchorRect: DOMRect): boolean {
  const button = getInlineTranslateTriggerElement();
  if (!button) {
    return false;
  }

  return positionButton(button, anchorRect);
}

export function disableInlineTranslateTrigger(): void {
  const button = getInlineTranslateTriggerElement();
  if (!button) {
    return;
  }

  button.disabled = true;
  button.classList.add('talkient-inline-translate-trigger-disabled');
}

export function hideInlineTranslateTrigger(): void {
  const button = getInlineTranslateTriggerElement();
  if (!button) {
    return;
  }

  if (activeClickHandler) {
    button.removeEventListener('click', activeClickHandler);
    activeClickHandler = null;
  }

  button.remove();
}

export function getInlineTranslateTriggerElement(): HTMLButtonElement | null {
  return document.getElementById(TRIGGER_ID) as HTMLButtonElement | null;
}
