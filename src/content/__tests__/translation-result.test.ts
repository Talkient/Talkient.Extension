describe('translation result card', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  function mockSelectionRect(rect: DOMRect): void {
    const range = {
      getBoundingClientRect: () => rect,
    } as Range;

    jest.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => range,
    } as unknown as Selection);
  }

  it('adds accessible metadata to the close button', () => {
    const { showTranslationLoading } = require('../translation-result') as {
      showTranslationLoading: (originalText: string) => void;
    };

    showTranslationLoading('Hello world');

    const closeButton = document.querySelector<HTMLButtonElement>(
      '.talkient-translation-close',
    );

    expect(closeButton).not.toBeNull();
    expect(closeButton?.getAttribute('aria-label')).toBe('Close translation');
    expect(closeButton?.title).toBe('Close translation');
  });

  it('clamps horizontal position using rendered container width', () => {
    const { showTranslationSuccess } = require('../translation-result') as {
      showTranslationSuccess: (payload: {
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        provider: string;
      }) => void;
    };

    Object.defineProperty(window, 'innerWidth', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });

    const offsetWidthSpy = jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function mockOffsetWidth(this: HTMLElement) {
        return this.id === 'talkient-translation-result' ? 180 : 0;
      });

    mockSelectionRect({
      left: 350,
      top: 100,
      right: 380,
      bottom: 120,
      width: 30,
      height: 20,
      x: 350,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    showTranslationSuccess({
      originalText: 'Hello world',
      translatedText: 'Bonjour le monde',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      provider: 'libre-translate',
    });

    const container = document.getElementById('talkient-translation-result');

    expect(container?.style.left).toBe('208px');
    expect(container?.style.right).toBe('auto');

    offsetWidthSpy.mockRestore();
  });

  it('falls back to bottom-right when no selection anchor exists', () => {
    const { showTranslationLoading } = require('../translation-result') as {
      showTranslationLoading: (originalText: string) => void;
    };

    jest.spyOn(window, 'getSelection').mockReturnValue(null);

    showTranslationLoading('Hello world');

    const container = document.getElementById('talkient-translation-result');
    expect(container?.style.right).toBe('20px');
    expect(container?.style.bottom).toBe('20px');
  });
});
