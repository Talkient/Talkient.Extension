import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Debug Control Panel on Example.html', () => {
  test('should debug control panel rendering', async ({ page }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the control panel to be created
    await page.waitForTimeout(2000);

    // Get detailed information about the control panel
    const debugInfo = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      if (!panel) return { exists: false };

      const styles = window.getComputedStyle(panel);
      const header = panel.querySelector('.talkient-panel-header');
      const content = panel.querySelector('.talkient-panel-content');
      const headerStyles = header ? window.getComputedStyle(header) : null;
      const contentStyles = content
        ? window.getComputedStyle(content as Element)
        : null;

      // Get all child divs
      const allDivs = Array.from(panel.querySelectorAll('div')).map((div) => {
        const divStyles = window.getComputedStyle(div);
        return {
          className: div.className,
          width: divStyles.width,
          height: divStyles.height,
          display: divStyles.display,
          margin: divStyles.margin,
          padding: divStyles.padding,
        };
      });

      return {
        exists: true,
        panelStyles: {
          width: styles.width,
          height: styles.height,
          display: styles.display,
          position: styles.position,
          top: styles.top,
          left: styles.left,
          transform: styles.transform,
          overflow: styles.overflow,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          boxSizing: styles.boxSizing,
        },
        headerStyles: headerStyles
          ? {
              display: headerStyles.display,
              width: headerStyles.width,
              height: headerStyles.height,
              marginBottom: headerStyles.marginBottom,
            }
          : null,
        contentStyles: contentStyles
          ? {
              display: contentStyles.display,
              width: contentStyles.width,
              height: contentStyles.height,
            }
          : null,
        isCollapsed: panel.classList.contains('talkient-collapsed'),
        innerHTML: panel.innerHTML.substring(0, 500),
        allDivs: allDivs.slice(0, 10), // First 10 divs
      };
    });

    console.log(
      'Control Panel Debug Info:',
      JSON.stringify(debugInfo, null, 2)
    );

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/debug-example-screenshot.png',
      fullPage: true,
    });

    // Try to expand the panel if it's collapsed
    if (debugInfo.isCollapsed) {
      console.log('Panel is collapsed, attempting to expand...');
      await page.click('.talkient-panel-toggle');
      await page.waitForTimeout(500);

      // Get info again after expansion
      const expandedInfo = await page.evaluate(() => {
        const panel = document.getElementById('talkient-control-panel');
        const content = panel?.querySelector('.talkient-panel-content');
        const contentStyles = content
          ? window.getComputedStyle(content as Element)
          : null;

        return {
          isCollapsed: panel?.classList.contains('talkient-collapsed'),
          contentDisplay: contentStyles?.display,
          contentHeight: contentStyles?.height,
        };
      });

      console.log('After expansion:', JSON.stringify(expandedInfo, null, 2));

      // Take another screenshot
      await page.screenshot({
        path: 'e2e-results/debug-example-expanded-screenshot.png',
        fullPage: true,
      });
    }

    expect(debugInfo.exists).toBe(true);
  });
});
