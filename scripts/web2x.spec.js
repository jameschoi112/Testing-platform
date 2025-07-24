const { test, expect } = require('@playwright/test');

test('WEB2X 이용가이드 팝업 닫기', async ({ page }, testInfo) => {
  let stepIndex = 0;

  // 디버그 메시지를 서버로 전송하는 함수
  function sendDebugMessage(message) {
    const report = {
      type: 'debug:log',
      payload: { message: message }
    };
    process.stdout.write(JSON.stringify(report) + '__END_OF_JSON__');
  }

  // 스크린샷 캡처 및 전송 헬퍼 함수
  async function captureAndSendScreenshot(stepIndex, error = null) {
    try {
      sendDebugMessage(`[Playwright] Capturing screenshot for step ${stepIndex}...`);

      // 스크린샷 캡처 (옵션 명시)
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
        quality: 80
      });

      const screenshotBase64 = screenshot.toString('base64');

      // 데이터 검증
      if (!screenshotBase64 || screenshotBase64.length === 0) {
        sendDebugMessage(`[Playwright] Screenshot capture failed: empty data for step ${stepIndex}`);
        return;
      }

      sendDebugMessage(`[Playwright] Screenshot captured successfully, size: ${screenshotBase64.length} bytes`);

      // 스크린샷 데이터 전송
      const report = {
        type: 'screenshot:add',
        payload: {
          failedStepIndex: stepIndex,
          screenshotBase64: screenshotBase64
        }
      };

      process.stdout.write(JSON.stringify(report) + '__END_OF_JSON__');
      sendDebugMessage(`[Playwright] Screenshot report sent for step ${stepIndex}`);

    } catch (screenshotError) {
      sendDebugMessage(`[Playwright] Screenshot capture error for step ${stepIndex}: ${screenshotError.message}`);
    }
  }

  await test.step('Go to target URL', async () => {
    try {
      const targetUrl = process.env.TARGET_URL || 'https://web2x.io/';
      sendDebugMessage(`[Playwright] Going to URL: ${targetUrl}`);

      await page.goto(targetUrl, { timeout: 15000 });
      await expect(page).toHaveTitle(/WEB2X/, { timeout: 5000 });

      sendDebugMessage(`[Playwright] Step ${stepIndex} completed successfully`);
    } catch (error) {
      sendDebugMessage(`[Playwright] Step ${stepIndex} failed: ${error.message}`);
      await captureAndSendScreenshot(stepIndex, error);
      throw error;
    } finally {
      stepIndex++;
    }
  });

  await test.step('Click "Do not show again" checkbox', async () => {
    try {
      sendDebugMessage(`[Playwright] Looking for checkbox element...`);

      // 페이지 로딩 대기
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      sendDebugMessage(`[Playwright] Page load state: networkidle`);

      // 여러 가능한 선택자들 시도
      const possibleSelectors = [
        'span.ant-typography.embla__isShowChec-wrong',
        //'span.ant-typography',
        //'.embla__isShowChec-wrong',
        //'[class*="isShowChec"]',
        //'span:has-text("다시 보지 않기")',
        //'span:has-text("Do not show again")',
      ];

      let clicked = false;
      let lastError = null;

      for (const selector of possibleSelectors) {
        try {
          sendDebugMessage(`[Playwright] Trying selector: ${selector}`);
          const element = page.locator(selector).first();

          if (await element.isVisible({ timeout: 2000 })) {
            sendDebugMessage(`[Playwright] Element found with selector: ${selector}`);
            await element.click({ timeout: 5000 });
            clicked = true;
            sendDebugMessage(`[Playwright] Successfully clicked element`);
            break;
          }
        } catch (selectorError) {
          lastError = selectorError;
          sendDebugMessage(`[Playwright] Selector ${selector} failed: ${selectorError.message}`);
        }
      }

      if (!clicked) {
        // 현재 페이지의 모든 span 요소 확인 (디버깅)
        sendDebugMessage(`[Playwright] Checking all span elements on page...`);
        const spans = await page.locator('span').all();
        sendDebugMessage(`[Playwright] Found ${spans.length} span elements`);

        for (let i = 0; i < Math.min(spans.length, 10); i++) {
          try {
            const text = await spans[i].textContent();
            const className = await spans[i].getAttribute('class');
            sendDebugMessage(`[Playwright] Span ${i}: text='${text}', class='${className}'`);
          } catch (spanError) {
            sendDebugMessage(`[Playwright] Error reading span ${i}: ${spanError.message}`);
          }
        }

        const finalError = new Error("체크박스를 찾을 수 없습니다");
        sendDebugMessage(`[Playwright] Step ${stepIndex} failed: ${finalError.message}`);
        await captureAndSendScreenshot(stepIndex, finalError);
        throw finalError;
      }

      sendDebugMessage(`[Playwright] Step ${stepIndex} completed successfully`);
    } catch (error) {
      sendDebugMessage(`[Playwright] Step ${stepIndex} failed: ${error.message}`);
      await captureAndSendScreenshot(stepIndex, error);
      throw error;
    } finally {
      stepIndex++;
    }
  });

  await test.step('Verify modal is closed', async () => {
    try {
      sendDebugMessage(`[Playwright] Verifying modal is closed...`);
      await expect(page.locator('div.ant-modal-conten')).not.toBeVisible({ timeout: 5000 });
      sendDebugMessage(`[Playwright] Step ${stepIndex} completed successfully`);
    } catch (error) {
      sendDebugMessage(`[Playwright] Step ${stepIndex} failed: ${error.message}`);
      await captureAndSendScreenshot(stepIndex, error);
      throw error;
    } finally {
      stepIndex++;
    }
  });
});