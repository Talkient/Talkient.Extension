import './mocks/chrome';

jest.mock('../../features/tts-playback/background/tts-engine', () => ({
  checkTtsAvailability: jest.fn(),
}));

jest.mock('../../features/tts-playback/background/message-handler', () => ({
  handleSpeakText: jest.fn(),
  handlePauseSpeech: jest.fn(),
  handleTranslateSelectionMessage: jest.fn(),
}));

jest.mock('../../features/tts-playback/background/context-menu', () => ({
  setupContextMenu: jest.fn(),
  setupContextMenuClickHandler: jest.fn(),
}));

jest.mock('../tab-manager', () => ({
  setupTabListeners: jest.fn(),
}));

jest.mock('../../features/auth/background/auth-service', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

describe('service-worker auth integration', () => {
  let messageHandler: (
    message: unknown,
    sender: unknown,
    sendResponse: jest.Mock,
  ) => boolean;
  let sendResponse: jest.Mock;
  let authService: typeof import('../../features/auth/background/auth-service');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    require('./mocks/chrome');

    (chrome.storage.local.get as jest.Mock).mockImplementation((keys, cb) =>
      cb({
        selectedVoice: undefined,
        speechRate: 1.0,
        speechPitch: 1.0,
      }),
    );
    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (_obj, cb) => cb && cb(),
    );
    (chrome.storage.session.get as jest.Mock).mockImplementation((keys, cb) =>
      cb({}),
    );
    (chrome.storage.session.set as jest.Mock).mockImplementation(
      (_obj, cb) => cb && cb(),
    );
    (chrome.tts.getVoices as jest.Mock).mockImplementation((callback) =>
      callback([{ voiceName: 'Google UK English Male' }]),
    );

    require('../service-worker');
    authService = require('../../features/auth/background/auth-service');

    const addListenerMock = chrome.runtime.onMessage.addListener as jest.Mock;
    messageHandler = addListenerMock.mock.calls[0][0] as typeof messageHandler;
    sendResponse = jest.fn();
  });

  it('routes SIGN_IN through the real auth message handler and returns the user payload', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
    };
    (authService.signInWithGoogle as jest.Mock).mockResolvedValueOnce({
      success: true,
      user: mockUser,
    });

    const result = messageHandler({ type: 'SIGN_IN' }, {}, sendResponse);

    expect(result).toBe(true);
    await Promise.resolve();

    expect(authService.signInWithGoogle).toHaveBeenCalledWith(true);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      user: mockUser,
    });
  });

  it('routes GET_AUTH_STATE through the real auth message handler and serializes signed-out state', async () => {
    (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

    const result = messageHandler({ type: 'GET_AUTH_STATE' }, {}, sendResponse);

    expect(result).toBe(true);
    await Promise.resolve();

    expect(authService.getCurrentUser).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      isAuthenticated: false,
      user: null,
    });
  });

  it('routes GET_AUTH_STATE handler failures into error responses', async () => {
    (authService.getCurrentUser as jest.Mock).mockRejectedValueOnce(
      new Error('background unavailable'),
    );

    const result = messageHandler({ type: 'GET_AUTH_STATE' }, {}, sendResponse);

    expect(result).toBe(true);
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'background unavailable',
    });
  });
});
