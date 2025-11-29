import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Debug Side Panel on Example.html', () => {
  test('should debug side panel rendering', async ({ page, context, extensionId }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for content script to load
    await page.waitForTimeout(1000);

    // Open the side panel
    const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel/sidepanel.html`;
    const sidePanelPage = await context.newPage();
    await sidePanelPage.goto(sidePanelUrl);
    await sidePanelPage.waitForLoadState('networkidle');
    await sidePanelPage.waitForSelector('#talkient-control-panel', { timeout: 5000 });

    // Get detailed information about the side panel
    const debugInfo = await sidePanelPage.evaluate(() => {
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
      'Side Panel Debug Info:',
      JSON.stringify(debugInfo, null, 2)
    );

    // Take a screenshot
    await sidePanelPage.screenshot({
      path: 'e2e-results/debug-sidepanel-screenshot.png',
      fullPage: true,
    });

    expect(debugInfo.exists).toBe(true);
    
    await sidePanelPage.close();
  });
});
