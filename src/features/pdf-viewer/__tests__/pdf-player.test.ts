import { PdfPlayer, type PdfBlockSource } from '../viewer/pdf-player';
import type { ServiceWorkerMessage } from '../../../shared/types/messages';

function createBlock(text: string): HTMLElement {
  const block = document.createElement('span');
  block.textContent = text;
  return block;
}

function createSource(pageTexts: string[][]): PdfBlockSource & {
  setActivePage: jest.Mock;
} {
  const pages = pageTexts.map((texts) => texts.map(createBlock));
  return {
    pageCount: pages.length,
    ensurePageBlocks: (pageNumber: number) =>
      Promise.resolve(pages[pageNumber - 1]),
    setActivePage: jest.fn(),
  };
}

function setup(pageTexts: string[][]) {
  const sent: ServiceWorkerMessage[] = [];
  const source = createSource(pageTexts);
  const callbacks = {
    send: (message: ServiceWorkerMessage) => sent.push(message),
    onStatusChange: jest.fn(),
    onHighlight: jest.fn(),
    onClearHighlight: jest.fn(),
    onNoReadableText: jest.fn(),
    onError: jest.fn(),
  };
  const player = new PdfPlayer(source, callbacks);
  const spoken = (): string[] =>
    sent
      .filter((message) => message.type === 'SPEAK_TEXT')
      .map((message) => (message as { text: string }).text);
  return { player, sent, spoken, source, callbacks };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PdfPlayer', () => {
  it('reads the first block and highlights its first sentence', async () => {
    const { player, spoken, source, callbacks } = setup([
      ['First sentence. Second sentence. '],
    ]);

    await player.play();

    expect(spoken()).toEqual(['First sentence. Second sentence. ']);
    expect(player.getStatus()).toBe('playing');
    expect(source.setActivePage).toHaveBeenCalledWith(1);
    expect(callbacks.onHighlight).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      [0, 16],
      null,
      1,
    );
  });

  it('pauses and resumes the same text', async () => {
    const { player, sent, spoken } = setup([['Some text. ']]);

    await player.play();
    player.pause();
    expect(sent[sent.length - 1]).toEqual({ type: 'PAUSE_SPEECH' });
    expect(player.getStatus()).toBe('paused');

    await player.play();
    expect(spoken()).toEqual(['Some text. ', 'Some text. ']);
    expect(player.getStatus()).toBe('playing');
  });

  it('continues with the next block, skipping empty pages', async () => {
    const { player, spoken } = setup([
      ['Page one. ', '  '],
      [],
      ['Page three. '],
    ]);

    await player.play();
    player.handleSpeechEnded(true);
    await flush();

    expect(spoken()).toEqual(['Page one. ', 'Page three. ']);
    expect(player.getCurrentPosition()).toEqual({
      page: 3,
      block: 0,
      offset: 0,
    });
  });

  it('stops after a block when auto play is off', async () => {
    const { player, spoken, callbacks } = setup([['One. ', 'Two. ']]);

    await player.play();
    player.handleSpeechEnded(false);
    await flush();

    expect(spoken()).toEqual(['One. ']);
    expect(player.getStatus()).toBe('idle');
    expect(callbacks.onClearHighlight).toHaveBeenCalled();

    await player.play();
    expect(spoken()).toEqual(['One. ', 'Two. ']);
  });

  it('becomes idle at the end of the document', async () => {
    const { player, callbacks } = setup([['Only block. ']]);

    await player.play();
    player.handleSpeechEnded(true);
    await flush();

    expect(player.getStatus()).toBe('idle');
    expect(callbacks.onNoReadableText).not.toHaveBeenCalled();
  });

  it('reports documents without readable text', async () => {
    const { player, spoken, callbacks } = setup([[], ['   ']]);

    await player.play();

    expect(spoken()).toEqual([]);
    expect(callbacks.onNoReadableText).toHaveBeenCalled();
  });

  it('maps word boundaries back to the block text', async () => {
    const { player, callbacks } = setup([
      ['First sentence. Second sentence. '],
    ]);

    await player.playFrom(1, 0, 20);
    callbacks.onHighlight.mockClear();
    // "sentence" in "Second sentence. ", relative to the spoken text
    player.handleWordBoundary(7, 8);

    expect(callbacks.onHighlight).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      [16, 33],
      [23, 31],
      1,
    );
  });

  it('computes the word length when the voice does not give it', async () => {
    const { player, callbacks } = setup([['Hello brave world. ']]);

    await player.play();
    player.handleWordBoundary(6);

    expect(callbacks.onHighlight).toHaveBeenLastCalledWith(
      expect.any(HTMLElement),
      [0, 19],
      [6, 11],
      1,
    );
  });

  it('starts reading at the sentence that was clicked', async () => {
    const { player, spoken } = setup([['First sentence. Second sentence. ']]);

    await player.playFrom(1, 0, 25);

    expect(spoken()).toEqual(['Second sentence. ']);
  });

  it('skips to the previous and next blocks across pages', async () => {
    const { player, spoken } = setup([['A one. ', 'A two. '], ['B one. ']]);

    await player.play();
    await player.skip(1);
    await player.skip(1);
    await player.skip(-1);

    expect(spoken()).toEqual(['A one. ', 'A two. ', 'B one. ', 'A two. ']);
  });

  it('keeps the position and reports speech errors', async () => {
    const { player, spoken, callbacks } = setup([['One. ', 'Two. ']]);

    await player.play();
    await player.skip(1);
    player.handleSpeechStopped('TTS is not available');

    expect(player.getStatus()).toBe('idle');
    expect(callbacks.onError).toHaveBeenCalledWith('TTS is not available');

    await player.play();
    expect(spoken()).toEqual(['One. ', 'Two. ', 'Two. ']);
  });

  it('stops the speech for good when closed', async () => {
    const { player, sent } = setup([['One. ']]);

    await player.play();
    player.stop();

    expect(sent[sent.length - 1]).toEqual({
      type: 'PAUSE_SPEECH',
      isPageUnload: true,
    });
    expect(player.getStatus()).toBe('idle');
  });

  it('ignores word boundaries when nothing is being read', () => {
    const { player, callbacks } = setup([['One. ']]);

    player.handleWordBoundary(0, 3);

    expect(callbacks.onHighlight).not.toHaveBeenCalled();
  });
});
