import { test, expect } from '@playwright/test';

test('Verify Optimistic UI Migration', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'godqka');
    // Note: Assuming these are valid test credentials as seen in existing test
    await page.fill('input[type="password"]', 'ehgus852');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
    // Additional wait for data load
    await page.waitForTimeout(2000);

    const timestamp = Date.now();

    // 2. Add Optimistic Diary
    const diaryTitle = `Diary-${timestamp}`;
    await page.goto('http://localhost:5173/diary');
    await page.waitForURL('http://localhost:5173/diary');
    // FAB is fixed bottom-24 right-6
    await page.click('button.fixed.bottom-24.right-6');

    // Wait for modal
    await expect(page.locator('text=오늘의 하루')).toBeVisible();
    await page.fill('input[placeholder="오늘의 제목..."]', diaryTitle);
    await page.fill('textarea[placeholder="무슨 일이 있었나요?"]', 'Optimistic Diary Content');

    await page.click('button:has-text("저장")');

    await expect(page.locator('text=오늘의 하루')).not.toBeVisible();
    await expect(page.locator(`text=${diaryTitle}`)).toBeVisible();


    // 3. Add Optimistic Memory
    const memoryContent = `Memory-${timestamp}`;
    await page.goto('http://localhost:5173/');
    await page.waitForURL('http://localhost:5173/');

    // Home FAB
    await page.click('button.fixed.bottom-24.right-6');
    await expect(page.locator('text=추억 남기기')).toBeVisible();
    await page.fill('textarea[placeholder="이 순간을 기록해보세요..."]', memoryContent);
    await page.click('button:has-text("저장")');
    await expect(page.locator('text=추억 남기기')).not.toBeVisible();
    await expect(page.locator(`text=${memoryContent}`)).toBeVisible();


    // 4. Add Optimistic Event
    const eventTitle = `Event-${timestamp}`;
    await page.goto('http://localhost:5173/calendar');
    await page.waitForURL('http://localhost:5173/calendar');

    // Calendar FAB
    await page.click('button.fixed.bottom-24.right-6');
    await expect(page.locator('text=새로운 일정')).toBeVisible();
    await page.fill('input[placeholder="제목"]', eventTitle);
    await page.click('button:has-text("저장")');
    await expect(page.locator('text=새로운 일정')).not.toBeVisible();

    // Check for title. Calendar events list usually displays title.
    await expect(page.locator(`text=${eventTitle}`)).toBeVisible();


    // 5. Add Optimistic Letter
    const letterContent = `Letter-${timestamp}`;
    await page.goto('http://localhost:5173/mailbox');
    await page.waitForURL('http://localhost:5173/mailbox');
    // Mailbox might verify "Write" button text.
    await page.click('button:has-text("편지 쓰기")');
    await expect(page.locator('text=To.')).toBeVisible();
    await page.fill('textarea[placeholder="마음을 담아 편지를 써보세요..."]', letterContent);
    await page.click('button:has-text("지금 보내기")');
    await expect(page.locator('text=To.')).not.toBeVisible();
    // Assuming list shows content preview
    await expect(page.locator(`text=${letterContent}`.substring(0, 10))).toBeVisible();

});
