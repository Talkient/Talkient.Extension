import type { ServiceWorkerMessage } from '../../../shared/types/messages';
import { getSentenceBounds } from '../text-blocks';

export type PdfPlayerStatus = 'idle' | 'playing' | 'paused';

export interface PdfPlaybackPosition {
  page: number;
  block: number;
  // Character offset inside the block where reading starts
  offset: number;
}

interface CurrentUtterance extends PdfPlaybackPosition {
  element: HTMLElement;
  text: string;
}

/**
 * What the player needs from the page renderer.
 */
export interface PdfBlockSource {
  readonly pageCount: number;
  ensurePageBlocks(pageNumber: number): Promise<HTMLElement[]>;
  setActivePage(pageNumber: number): void;
}

export interface PdfPlayerCallbacks {
  send(message: ServiceWorkerMessage): void;
  onStatusChange?(status: PdfPlayerStatus): void;
  onHighlight?(
    block: HTMLElement,
    sentence: [number, number],
    word: [number, number] | null,
    pageNumber: number,
  ): void;
  onClearHighlight?(): void;
  onNoReadableText?(): void;
  onError?(message: string): void;
}

const START_POSITION: PdfPlaybackPosition = { page: 1, block: 0, offset: 0 };

function getWordEnd(text: string, start: number): number {
  const match = /\S+/.exec(text.slice(start));
  return match ? start + match.index + match[0].length : start;
}

/**
 * Reads the document block by block through the service worker, which owns
 * chrome.tts. Word boundary events map back to the block being read so the
 * sentence and word can be highlighted.
 */
export class PdfPlayer {
  private status: PdfPlayerStatus = 'idle';
  private current: CurrentUtterance | null = null;
  private nextPosition: PdfPlaybackPosition = { ...START_POSITION };
  private requestId = 0;

  constructor(
    private readonly source: PdfBlockSource,
    private readonly callbacks: PdfPlayerCallbacks,
  ) {}

  getStatus(): PdfPlayerStatus {
    return this.status;
  }

  getCurrentPosition(): PdfPlaybackPosition | null {
    if (!this.current) {
      return null;
    }
    const { page, block, offset } = this.current;
    return { page, block, offset };
  }

  async play(): Promise<void> {
    if (this.status === 'playing') {
      return;
    }
    if (this.status === 'paused' && this.current) {
      // Same text again: the service worker resumes the paused speech
      this.callbacks.send({ type: 'SPEAK_TEXT', text: this.current.text });
      this.setStatus('playing');
      return;
    }
    await this.startAt(this.nextPosition);
  }

  pause(): void {
    if (this.status !== 'playing') {
      return;
    }
    this.callbacks.send({ type: 'PAUSE_SPEECH' });
    this.setStatus('paused');
  }

  async toggle(): Promise<void> {
    if (this.status === 'playing') {
      this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Starts reading at the sentence containing `offset` of `block`.
   */
  async playFrom(
    pageNumber: number,
    blockIndex: number,
    offset: number,
  ): Promise<void> {
    const blocks = await this.source.ensurePageBlocks(pageNumber);
    const text = blocks[blockIndex]?.textContent ?? '';
    const [sentenceStart] = getSentenceBounds(text, offset);
    await this.startAt({
      page: pageNumber,
      block: blockIndex,
      offset: sentenceStart,
    });
  }

  async skip(direction: 1 | -1): Promise<void> {
    const from = this.current ?? this.nextPosition;
    if (direction === 1) {
      await this.startAt({ page: from.page, block: from.block + 1, offset: 0 });
      return;
    }

    let page = from.page;
    let block = from.offset > 0 ? from.block : from.block - 1;
    while (block < 0 && page > 1) {
      page--;
      block = (await this.source.ensurePageBlocks(page)).length - 1;
    }
    await this.startAt({ page, block: Math.max(block, 0), offset: 0 });
  }

  /**
   * Stops the speech for good, e.g. when the viewer is closed.
   */
  stop(): void {
    this.requestId++;
    if (this.current) {
      this.callbacks.send({ type: 'PAUSE_SPEECH', isPageUnload: true });
    }
    this.current = null;
    this.setStatus('idle');
  }

  handleWordBoundary(charIndex: number, length?: number): void {
    if (!this.current || this.status !== 'playing') {
      return;
    }
    const blockText = this.current.element.textContent ?? '';
    const wordStart = this.current.offset + charIndex;
    const wordEnd =
      length !== undefined && length > 0
        ? wordStart + length
        : getWordEnd(blockText, wordStart);
    this.callbacks.onHighlight?.(
      this.current.element,
      getSentenceBounds(blockText, wordStart),
      [wordStart, wordEnd],
      this.current.page,
    );
  }

  handleSpeechEnded(autoPlayNext: boolean): void {
    if (!this.current) {
      return;
    }
    const next: PdfPlaybackPosition = {
      page: this.current.page,
      block: this.current.block + 1,
      offset: 0,
    };
    this.current = null;

    if (autoPlayNext) {
      void this.startAt(next);
    } else {
      this.nextPosition = next;
      this.callbacks.onClearHighlight?.();
      this.setStatus('idle');
    }
  }

  handleSpeechStopped(errorMessage?: string): void {
    if (this.current) {
      const { page, block, offset } = this.current;
      this.nextPosition = { page, block, offset };
    }
    this.current = null;
    this.callbacks.onClearHighlight?.();
    this.setStatus('idle');
    if (errorMessage) {
      this.callbacks.onError?.(errorMessage);
    }
  }

  private async startAt(position: PdfPlaybackPosition): Promise<void> {
    const requestId = ++this.requestId;
    const target = await this.findReadableBlock(position);
    if (requestId !== this.requestId) {
      return;
    }

    if (!target) {
      const readFromStart =
        position.page === 1 && position.block === 0 && position.offset === 0;
      if (this.current) {
        this.callbacks.send({ type: 'PAUSE_SPEECH' });
      }
      this.current = null;
      this.nextPosition = { ...START_POSITION };
      this.callbacks.onClearHighlight?.();
      this.setStatus('idle');
      if (readFromStart) {
        this.callbacks.onNoReadableText?.();
      }
      return;
    }

    this.current = target;
    this.nextPosition = {
      page: target.page,
      block: target.block,
      offset: target.offset,
    };
    this.source.setActivePage(target.page);
    this.callbacks.send({ type: 'SPEAK_TEXT', text: target.text });
    this.setStatus('playing');

    const blockText = target.element.textContent ?? '';
    this.callbacks.onHighlight?.(
      target.element,
      getSentenceBounds(blockText, target.offset),
      null,
      target.page,
    );
  }

  /**
   * First block with something to read at or after `position`. Pages
   * without text (scans, blank pages) are skipped.
   */
  private async findReadableBlock(
    position: PdfPlaybackPosition,
  ): Promise<CurrentUtterance | null> {
    for (
      let page = Math.max(position.page, 1);
      page <= this.source.pageCount;
      page++
    ) {
      const blocks = await this.source.ensurePageBlocks(page);
      const firstBlock = page === position.page ? position.block : 0;
      for (let block = firstBlock; block < blocks.length; block++) {
        const isStart = page === position.page && block === position.block;
        const offset = isStart ? position.offset : 0;
        const text = (blocks[block].textContent ?? '').slice(offset);
        if (text.trim() !== '') {
          return { page, block, offset, element: blocks[block], text };
        }
      }
    }
    return null;
  }

  private setStatus(status: PdfPlayerStatus): void {
    if (status !== this.status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }
}
