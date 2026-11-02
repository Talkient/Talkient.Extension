/// <reference lib="dom" />

import {
  RenderingCancelledException,
  TextLayer,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type PageViewport,
  type RenderTask,
} from 'pdfjs-dist';
import {
  buildPageBlocks,
  getItemString,
  getNormalizedPageStrings,
  normalizeItemStrings,
  orderTextItems,
  type PdfTextItemLike,
} from '../text-blocks';
import { BLOCK_CLASS, HIGHLIGHT_LAYER_CLASS, PAGE_CLASS } from './pdf-dom';

// Pages within this distance of the viewport are rendered
const OVERSCAN_PX = 1200;
// Pages after the one being read stay rendered so highlights are ready
const KEEP_AHEAD_PAGES = 2;
const MAX_SCALE = 1.5;
const MIN_SCALE = 0.5;
const PAGE_SIDE_MARGIN_PX = 32;
const MAX_DEVICE_PIXEL_RATIO = 2;

export type PageBackground = 'light' | 'dark';

interface PdfPageState {
  pageNumber: number;
  shell: HTMLDivElement;
  textLayer: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  renderTask: RenderTask | null;
  pdfTextLayer: TextLayer | null;
  hasPositionedText: boolean;
  blocks: HTMLSpanElement[];
  blockRanges: Array<[number, number]>;
  blockTexts: string[];
  contentPromise: Promise<HTMLSpanElement[]> | null;
  mounted: boolean;
  generation: number;
}

function createTextLayerDiv(): HTMLDivElement {
  const layer = document.createElement('div');
  layer.className = 'textLayer';
  return layer;
}

/**
 * Samples the rendered page to know whether highlights are painted over a
 * light or a dark background.
 */
export function detectPageBackground(
  canvas: HTMLCanvasElement,
): PageBackground {
  const sample = document.createElement('canvas');
  sample.width = 16;
  sample.height = 16;
  const context = sample.getContext('2d');
  if (!context || canvas.width === 0 || canvas.height === 0) {
    return 'light';
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 16, 16);
  context.drawImage(canvas, 0, 0, 16, 16);
  const { data } = context.getImageData(0, 0, 16, 16);
  let luminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    luminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return luminance / (data.length / 4) > 128 ? 'light' : 'dark';
}

/**
 * Lays out every page of the document and renders (canvas + text layer) only
 * the pages near the viewport or near the page being read.
 *
 * Each page's text is split into reading blocks, one <span> per block. Those
 * spans are created once and never replaced: when a page is rendered the
 * pdf.js text layer divs are moved inside them, and when it is torn down the
 * spans go back to holding a single text node with the very same text. The
 * player can keep references and character offsets into them at all times.
 */
export class PdfPages {
  readonly pageCount: number;

  private readonly pages: PdfPageState[] = [];
  private readonly visiblePages = new Set<number>();
  private readonly observer: IntersectionObserver;
  private activePage = 1;
  private updateScheduled = false;
  private destroyed = false;
  private onPageMounted: ((pageNumber: number) => void) | null = null;

  private constructor(
    private readonly doc: PDFDocumentProxy,
    private readonly container: HTMLElement,
    private readonly scrollElement: HTMLElement,
    private readonly scale: number,
    defaultViewport: PageViewport,
  ) {
    this.pageCount = doc.numPages;
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersections(entries),
      { root: scrollElement, rootMargin: `${OVERSCAN_PX}px 0px` },
    );

    for (let pageNumber = 1; pageNumber <= this.pageCount; pageNumber++) {
      const state = this.createPageState(pageNumber, defaultViewport);
      this.pages.push(state);
      this.container.appendChild(state.shell);
      this.observer.observe(state.shell);
    }
  }

  static async create(
    doc: PDFDocumentProxy,
    container: HTMLElement,
    scrollElement: HTMLElement,
  ): Promise<PdfPages> {
    const firstPage = await doc.getPage(1);
    const naturalWidth = firstPage.getViewport({ scale: 1 }).width;
    const availableWidth = scrollElement.clientWidth - PAGE_SIDE_MARGIN_PX;
    const fitScale =
      availableWidth > 0 ? availableWidth / naturalWidth : MAX_SCALE;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));

    return new PdfPages(
      doc,
      container,
      scrollElement,
      scale,
      firstPage.getViewport({ scale }),
    );
  }

  getShell(pageNumber: number): HTMLDivElement | null {
    return this.pages[pageNumber - 1]?.shell ?? null;
  }

  isMounted(pageNumber: number): boolean {
    return this.pages[pageNumber - 1]?.mounted === true;
  }

  getPageNumberOf(element: Element): number | null {
    const shell = element.closest(`.${PAGE_CLASS}`);
    const pageNumber = Number(
      (shell as HTMLElement | null)?.dataset.pageNumber,
    );
    return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null;
  }

  getBlockIndexOf(block: Element): number {
    const pageNumber = this.getPageNumberOf(block);
    if (pageNumber === null) {
      return -1;
    }
    return this.pages[pageNumber - 1].blocks.indexOf(block as HTMLSpanElement);
  }

  /**
   * The page crossing the middle of the viewport, used for the page counter.
   */
  getPageAtViewportCenter(): number {
    const viewportRect = this.scrollElement.getBoundingClientRect();
    const center = viewportRect.top + viewportRect.height / 2;
    let closest = this.activePage;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.visiblePages.forEach((pageNumber) => {
      const rect = this.pages[pageNumber - 1].shell.getBoundingClientRect();
      const distance =
        center < rect.top
          ? rect.top - center
          : center > rect.bottom
            ? center - rect.bottom
            : 0;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = pageNumber;
      }
    });
    return closest;
  }

  setOnPageMounted(callback: (pageNumber: number) => void): void {
    this.onPageMounted = callback;
  }

  setActivePage(pageNumber: number): void {
    if (pageNumber !== this.activePage) {
      this.activePage = pageNumber;
      this.scheduleUpdate();
    }
  }

  /**
   * Creates the reading blocks of a page (once) and returns them.
   */
  ensurePageBlocks(pageNumber: number): Promise<HTMLSpanElement[]> {
    const state = this.pages[pageNumber - 1];
    if (!state.contentPromise) {
      state.contentPromise = this.createBlocks(state).catch(
        (error: unknown) => {
          state.contentPromise = null;
          throw error;
        },
      );
    }
    return state.contentPromise;
  }

  destroy(): void {
    this.destroyed = true;
    this.observer.disconnect();
    this.pages.forEach((state) => this.unmount(state));
  }

  private createPageState(
    pageNumber: number,
    viewport: PageViewport,
  ): PdfPageState {
    const shell = document.createElement('div');
    shell.className = PAGE_CLASS;
    shell.dataset.pageNumber = String(pageNumber);
    shell.dataset.mounted = 'false';
    shell.style.setProperty('--scale-factor', String(this.scale));
    shell.style.setProperty('--total-scale-factor', String(this.scale));
    this.applyShellSize(shell, viewport);

    const highlightLayer = document.createElement('div');
    highlightLayer.className = HIGHLIGHT_LAYER_CLASS;

    const textLayer = createTextLayerDiv();
    shell.append(highlightLayer, textLayer);

    return {
      pageNumber,
      shell,
      textLayer,
      canvas: null,
      renderTask: null,
      pdfTextLayer: null,
      hasPositionedText: false,
      blocks: [],
      blockRanges: [],
      blockTexts: [],
      contentPromise: null,
      mounted: false,
      generation: 0,
    };
  }

  private applyShellSize(shell: HTMLDivElement, viewport: PageViewport): void {
    shell.style.width = `${Math.floor(viewport.width)}px`;
    shell.style.height = `${Math.floor(viewport.height)}px`;
  }

  private async createBlocks(state: PdfPageState): Promise<HTMLSpanElement[]> {
    const page = await this.doc.getPage(state.pageNumber);
    const content = await page.getTextContent();
    const strings = getNormalizedPageStrings(
      content.items as PdfTextItemLike[],
    );
    const { ranges, texts } = buildPageBlocks(strings);

    state.blockRanges = ranges;
    state.blockTexts = texts;
    state.blocks = texts.map((text) => {
      const block = document.createElement('span');
      block.className = BLOCK_CLASS;
      block.appendChild(document.createTextNode(text));
      return block;
    });
    state.textLayer.append(...state.blocks);
    return state.blocks;
  }

  private handleIntersections(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      const pageNumber = Number(
        (entry.target as HTMLElement).dataset.pageNumber,
      );
      if (entry.isIntersecting) {
        this.visiblePages.add(pageNumber);
      } else {
        this.visiblePages.delete(pageNumber);
      }
    });
    this.scheduleUpdate();
  }

  private scheduleUpdate(): void {
    if (this.updateScheduled || this.destroyed) {
      return;
    }
    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.update();
    });
  }

  private shouldMount(pageNumber: number): boolean {
    return (
      this.visiblePages.has(pageNumber) ||
      (pageNumber >= this.activePage &&
        pageNumber <= this.activePage + KEEP_AHEAD_PAGES)
    );
  }

  private update(): void {
    if (this.destroyed) {
      return;
    }
    this.pages.forEach((state) => {
      const shouldMount = this.shouldMount(state.pageNumber);
      if (shouldMount && !state.mounted) {
        void this.mount(state).catch((error: unknown) => {
          console.error(
            `[Talkient.PDF] Failed to render page ${state.pageNumber}:`,
            error,
          );
        });
      } else if (!shouldMount && state.mounted) {
        this.unmount(state);
      }
    });
  }

  private async mount(state: PdfPageState): Promise<void> {
    state.mounted = true;
    const generation = ++state.generation;
    const isCurrent = (): boolean =>
      state.mounted && state.generation === generation;

    const page = await this.doc.getPage(state.pageNumber);
    await this.ensurePageBlocks(state.pageNumber);
    if (!isCurrent()) {
      return;
    }

    const viewport = page.getViewport({ scale: this.scale });
    this.applyShellSize(state.shell, viewport);
    this.renderCanvas(state, page, viewport, isCurrent);

    const content = await page.getTextContent();
    if (!isCurrent()) {
      return;
    }

    // Same order and normalization as the blocks, so item i matches div i
    const items = orderTextItems(content.items as PdfTextItemLike[]);
    const strings = normalizeItemStrings(items.map(getItemString));
    const layer = createTextLayerDiv();
    const pdfTextLayer = new TextLayer({
      textContentSource: { ...content, items: items as typeof content.items },
      container: layer,
      viewport,
    });
    state.pdfTextLayer = pdfTextLayer;
    await pdfTextLayer.render();
    if (!isCurrent()) {
      pdfTextLayer.cancel();
      return;
    }

    const divs = pdfTextLayer.textDivs;
    if (divs.length !== strings.length) {
      console.warn(
        `[Talkient.PDF] Text layer of page ${state.pageNumber} does not match its text, it will not be highlighted.`,
      );
      pdfTextLayer.cancel();
      return;
    }

    divs.forEach((div, index) => {
      div.textContent = strings[index];
    });
    state.blockRanges.forEach(([from, to], index) => {
      const block = state.blocks[index];
      const group = divs.slice(from, to);
      const firstInLayer = group.find((div) => div.parentNode === layer);
      if (firstInLayer) {
        layer.insertBefore(block, firstInLayer);
      } else {
        layer.appendChild(block);
      }
      block.replaceChildren(...group);
    });

    state.shell.replaceChild(layer, state.textLayer);
    state.textLayer = layer;
    state.hasPositionedText = true;
    state.shell.dataset.mounted = 'true';
    this.onPageMounted?.(state.pageNumber);
  }

  private renderCanvas(
    state: PdfPageState,
    page: PDFPageProxy,
    viewport: PageViewport,
    isCurrent: () => boolean,
  ): void {
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_DEVICE_PIXEL_RATIO,
    );
    const canvas = document.createElement('canvas');
    canvas.className = 'tk-pdf-canvas';
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    state.shell.insertBefore(canvas, state.shell.firstChild);
    state.canvas = canvas;

    const renderTask = page.render({
      canvas,
      viewport,
      transform:
        pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
    });
    state.renderTask = renderTask;

    renderTask.promise.then(
      () => {
        if (isCurrent()) {
          state.renderTask = null;
          state.shell.dataset.background = detectPageBackground(canvas);
        }
      },
      (error: unknown) => {
        if (!(error instanceof RenderingCancelledException)) {
          console.error(
            `[Talkient.PDF] Failed to draw page ${state.pageNumber}:`,
            error,
          );
        }
      },
    );
  }

  private unmount(state: PdfPageState): void {
    state.mounted = false;
    state.generation++;
    state.shell.dataset.mounted = 'false';

    state.renderTask?.cancel();
    state.renderTask = null;
    if (state.canvas) {
      // Releases the canvas memory right away
      state.canvas.width = 0;
      state.canvas.height = 0;
      state.canvas.remove();
      state.canvas = null;
    }

    state.pdfTextLayer?.cancel();
    state.pdfTextLayer = null;

    if (state.hasPositionedText) {
      const layer = createTextLayerDiv();
      state.blocks.forEach((block, index) => {
        block.replaceChildren(document.createTextNode(state.blockTexts[index]));
        layer.appendChild(block);
      });
      state.shell.replaceChild(layer, state.textLayer);
      state.textLayer = layer;
      state.hasPositionedText = false;
    }

    state.shell.querySelector(`.${HIGHLIGHT_LAYER_CLASS}`)?.replaceChildren();
  }
}
