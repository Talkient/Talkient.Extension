import { processTextElements } from '../content/text-processor';

// Mock chrome runtime
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({ highlightStyle: 'default' });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('Process Mixed Content', () => {
  let container: HTMLDivElement;
  let pElement: HTMLParagraphElement;
  let spanElement: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock requestAnimationFrame to execute immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).requestAnimationFrame = jest.fn((callback) => {
      callback();
      return 1;
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should process both span and raw text within the same paragraph', () => {
    // Create a paragraph with both raw text and span content
    pElement = document.createElement('p');
    pElement.innerHTML = 'This is raw text '; // Raw text node
    spanElement = document.createElement('span');
    spanElement.classList.add('talkient-processed'); // Already processed
    spanElement.textContent = 'This is span text';
    pElement.appendChild(spanElement);
    pElement.appendChild(
      document.createTextNode(' and more raw text at the end.'),
    ); // Another raw text node

    container.appendChild(pElement);

    // Process text elements
    processTextElements();

    // Wait for any async operations to complete
    setTimeout(() => {
      // Count all play buttons inside the paragraph
      const playButtons = pElement.querySelectorAll('.talkient-play-button');

      // Expect at least 2 play buttons (one for each raw text node)
      expect(playButtons.length).toBeGreaterThanOrEqual(2);

      // Check that the raw text nodes were wrapped
      const wrappedTexts = pElement.querySelectorAll('.talkient-processed');

      // Expect 3 processed elements (the span was already processed + 2 raw text nodes)
      expect(wrappedTexts.length).toBeGreaterThanOrEqual(3);

      // Check that the first raw text was processed
      const firstText = pElement.childNodes[0];
      expect(firstText.textContent).toContain('This is raw text');
      expect(firstText.nodeName).toBe('SPAN');
      expect(
        (firstText as HTMLElement).classList.contains('talkient-processed'),
      ).toBe(true);

      // Check that the last raw text was processed
      const lastText = pElement.childNodes[pElement.childNodes.length - 1];
      expect(lastText.textContent).toContain('and more raw text');
      expect(lastText.nodeName).toBe('SPAN');
      expect(
        (lastText as HTMLElement).classList.contains('talkient-processed'),
      ).toBe(true);
    }, 100);
  });

  test('should process each text node independently', () => {
    // Create a more complex paragraph with multiple text nodes and spans
    pElement = document.createElement('p');

    // First raw text
    pElement.appendChild(document.createTextNode('First text. '));

    // First span
    const span1 = document.createElement('span');
    span1.textContent = 'Span 1 text.';
    pElement.appendChild(span1);

    // Middle raw text
    pElement.appendChild(document.createTextNode(' Middle text. '));

    // Second span
    const span2 = document.createElement('span');
    span2.textContent = 'Span 2 text.';
    pElement.appendChild(span2);

    // Last raw text
    pElement.appendChild(document.createTextNode(' Last text.'));

    container.appendChild(pElement);

    // Process text elements
    processTextElements();

    // Wait for any async operations to complete
    setTimeout(() => {
      // All text nodes should be wrapped in talkient-processed spans
      const processedNodes = pElement.querySelectorAll('.talkient-processed');

      // Expecting at least 5 processed nodes (3 raw text + 2 spans)
      expect(processedNodes.length).toBeGreaterThanOrEqual(5);

      // All should have play buttons
      const playButtons = pElement.querySelectorAll('.talkient-play-button');
      expect(playButtons.length).toBeGreaterThanOrEqual(5);
    }, 100);
  });

  test('should handle deeply nested HTML with mixed content', () => {
    // Create a complex structure with multiple levels of nesting
    container.innerHTML = `
      <div class="wrapper">
        <p>
          Top level paragraph text.
          <span>Span in paragraph.</span>
          More text after span.
          <div>
            <p>Nested paragraph with <em>emphasized</em> text and more regular text.</p>
          </div>
          Final text in top paragraph.
        </p>
      </div>
    `;

    // Process text elements
    processTextElements();

    // Wait for any async operations to complete
    setTimeout(() => {
      // Check that all appropriate text nodes have been processed
      const processedNodes = container.querySelectorAll('.talkient-processed');

      // Verify each text content was processed
      const allTexts = [
        'Top level paragraph text.',
        'Span in paragraph.',
        'More text after span.',
        'Nested paragraph with ',
        'emphasized',
        ' text and more regular text.',
        'Final text in top paragraph.',
      ];

      let processedTextsFound = 0;

      processedNodes.forEach((node) => {
        const nodeText = node.textContent?.trim().replace(/\s+/g, ' ') || '';
        if (nodeText) {
          for (const text of allTexts) {
            if (nodeText.includes(text)) {
              processedTextsFound++;
              break;
            }
          }
        }
      });

      // We should have processed nodes containing each of our test texts
      expect(processedTextsFound).toBeGreaterThan(0);

      // All processed nodes should have play buttons
      const playButtons = container.querySelectorAll('.talkient-play-button');
      expect(playButtons.length).toEqual(processedNodes.length);
    }, 100);
  });
});
