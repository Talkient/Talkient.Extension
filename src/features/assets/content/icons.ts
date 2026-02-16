// This file contains utility functions for working with SVG icons

import type { IconName } from '../types';

// Cache for SVG content to avoid repeated fetches
const svgCache: Record<string, string> = {};

// Fallback SVG content in case loading fails
const fallbackSvg: Record<IconName, string> = {
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>`,
};

// Function to get the SVG content as a string
export function getSvgIcon(iconName: IconName): string {
  // Return cached content if available
  if (svgCache[iconName]) {
    return svgCache[iconName];
  }

  // In a test environment or if chrome API is not available, return the fallback SVG
  if (
    typeof chrome === 'undefined' ||
    !chrome.runtime ||
    !chrome.runtime.getURL
  ) {
    return fallbackSvg[iconName];
  }

  try {
    // In the browser extension environment, try to load the SVG file
    const svgUrl = chrome.runtime.getURL(`assets/svg/${iconName}-icon.svg`);

    // Use XMLHttpRequest to load the SVG file
    const xhr = new XMLHttpRequest();
    xhr.open('GET', svgUrl, false); // Synchronous request
    xhr.send();

    if (xhr.status === 200) {
      // Modify SVG to set width and height
      const svgContent = xhr.responseText
        .replace(/width="24"/, 'width="10"')
        .replace(/height="24"/, 'height="10"');

      // Cache the SVG content
      svgCache[iconName] = svgContent;
      return svgContent;
    }
  } catch (error) {
    console.error(`Error loading SVG for ${iconName}:`, error);
  }

  // Return fallback SVG if loading fails
  return fallbackSvg[iconName];
}

// Function to check if an SVG element contains the play icon
export function isSvgPlayIcon(svgElement: SVGElement | null): boolean {
  return !!(svgElement && svgElement.innerHTML.includes('M8 5v14l11-7z'));
}

// Function to check if an SVG element contains the pause icon
export function isSvgPauseIcon(svgElement: SVGElement | null): boolean {
  return !!(
    svgElement &&
    svgElement.innerHTML.includes('M6 19h4V5H6v14zm8-14v14h4V5h-4z')
  );
}
