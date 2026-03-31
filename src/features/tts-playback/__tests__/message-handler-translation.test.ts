import { handleTranslateSelectionMessage } from '../background/message-handler';

const executeSelectionTranslationMock = jest.fn();

jest.mock('../../translation/background/selection-translation', () => ({
  executeSelectionTranslation: (input: unknown) =>
    executeSelectionTranslationMock(input),
}));

describe('handleTranslateSelectionMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes inline selection translation request to shared executor', () => {
    handleTranslateSelectionMessage(
      { type: 'TRANSLATE_SELECTION', text: 'Hello world' },
      { tab: { id: 77 } } as chrome.runtime.MessageSender,
    );

    expect(executeSelectionTranslationMock).toHaveBeenCalledWith({
      tabId: 77,
      selectedText: 'Hello world',
    });
  });

  it('skips translation when sender tab is missing', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    handleTranslateSelectionMessage(
      { type: 'TRANSLATE_SELECTION', text: 'Hello world' },
      {} as chrome.runtime.MessageSender,
    );

    expect(executeSelectionTranslationMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Talkient.SW] Missing tab id for translation request',
    );

    consoleWarnSpy.mockRestore();
  });
});
