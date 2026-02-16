import { getSvgIcon, isSvgPlayIcon, isSvgPauseIcon } from '../content/icons';

describe('Icon Utilities', () => {
  describe('getSvgIcon', () => {
    test('should return play icon SVG', () => {
      const svg = getSvgIcon('play');
      expect(svg).toContain('M8 5v14l11-7z');
      expect(svg).toContain('<svg');
    });

    test('should return pause icon SVG', () => {
      const svg = getSvgIcon('pause');
      expect(svg).toContain('M6 19h4V5H6v14zm8-14v14h4V5h-4z');
      expect(svg).toContain('<svg');
    });

    test('should return fallback SVG in test environment', () => {
      // In test environment, chrome.runtime.getURL is not available
      const playSvg = getSvgIcon('play');
      const pauseSvg = getSvgIcon('pause');

      expect(playSvg).toBeTruthy();
      expect(pauseSvg).toBeTruthy();
    });
  });

  describe('isSvgPlayIcon', () => {
    test('should identify play icon correctly', () => {
      const div = document.createElement('div');
      div.innerHTML = getSvgIcon('play');
      const svg = div.querySelector('svg');
      expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);
    });

    test('should return false for pause icon', () => {
      const div = document.createElement('div');
      div.innerHTML = getSvgIcon('pause');
      const svg = div.querySelector('svg');
      expect(isSvgPlayIcon(svg as SVGElement)).toBe(false);
    });

    test('should return false for null element', () => {
      expect(isSvgPlayIcon(null)).toBe(false);
    });
  });

  describe('isSvgPauseIcon', () => {
    test('should identify pause icon correctly', () => {
      const div = document.createElement('div');
      div.innerHTML = getSvgIcon('pause');
      const svg = div.querySelector('svg');
      expect(isSvgPauseIcon(svg as SVGElement)).toBe(true);
    });

    test('should return false for play icon', () => {
      const div = document.createElement('div');
      div.innerHTML = getSvgIcon('play');
      const svg = div.querySelector('svg');
      expect(isSvgPauseIcon(svg as SVGElement)).toBe(false);
    });

    test('should return false for null element', () => {
      expect(isSvgPauseIcon(null)).toBe(false);
    });
  });
});
