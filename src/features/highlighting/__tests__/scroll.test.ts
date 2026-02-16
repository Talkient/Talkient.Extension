/// <reference lib="dom" />
/// <reference types="jest" />

import { scrollToHighlightedElement } from '../content/scroll';

jest.mock('../../../shared/api/storage', () => ({
  storage: {
    get: jest.fn(),
  },
}));

import { storage } from '../../../shared/api/storage';

// Mock chrome API
const mockChrome = {
  storage: {
    local: {},
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

window.scrollTo = jest.fn();

describe('scrollToHighlightedElement', () => {
  let container: HTMLDivElement;
  let testElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    testElement = document.createElement('p');
    testElement.textContent = 'Test element for scrolling';
    container.appendChild(testElement);
    document.body.appendChild(container);

    testElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 500,
      bottom: 550,
      height: 50,
      width: 200,
    });

    Object.defineProperty(window, 'innerHeight', {
      value: 400,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  test('should not scroll when followHighlight is disabled', async () => {
    (storage.get as jest.Mock).mockResolvedValue(false);
    await scrollToHighlightedElement(testElement);
    expect(storage.get).toHaveBeenCalledWith('followHighlight');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should scroll when followHighlight is enabled', async () => {
    (storage.get as jest.Mock).mockResolvedValue(true);
    await scrollToHighlightedElement(testElement);
    expect(storage.get).toHaveBeenCalledWith('followHighlight');
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
