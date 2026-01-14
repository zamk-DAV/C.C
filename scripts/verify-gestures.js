import { chromium, devices } from 'playwright';

(async () => {
    const iPhone = devices['iPhone 13 Pro'];
    const browser = await chromium.launch({ headless: false }); // Headless false to see execution
    const context = await browser.newContext({
        ...iPhone,
        recordVideo: { dir: 'videos/' } // Optional: Record video
    });
    const page = await context.newPage();

    try {
        const timestamp = Date.now();
        const email = `test_gesture_${timestamp}@dear23.app`;
        const password = 'password123';

        console.log(`Starting test with user: ${email}`);

        // 1. Signup
        await page.goto('http://localhost:5173/signup');
        await page.fill('input[placeholder="이름을 입력하세요"]', 'Test User');
        await page.fill('input[placeholder="아이디를 입력하세요"]', email); // ID input is actually email field in code
        await page.fill('input[placeholder="비밀번호를 입력하세요"]', password);
        await page.fill('input[placeholder="비밀번호를 다시 입력하세요"]', password);
        await page.click('button[type="submit"]');

        // Wait for navigation
        await page.waitForURL('**/*', { timeout: 30000 });
        console.log('Signup/Login interaction completed');

        // Check where we are
        const url = page.url();
        console.log(`Current URL: ${url}`);

        if (url.includes('signup')) {
            throw new Error('Still on signup page');
        }

        // 2. Go to Calendar
        await page.goto('http://localhost:5173/calendar');
        console.log('Navigated to Calendar');

        // Wait for calendar loading
        await page.waitForTimeout(5000);

        // 3. Add Event
        console.log('Adding Event...');
        await page.click('button.fixed.bottom-24.right-6'); // FAB
        await page.waitForSelector('input[placeholder="제목"]', { state: 'visible', timeout: 10000 });
        await page.fill('input[placeholder="제목"]', 'Gesture Test Event');
        await page.click('button:has-text("저장")'); // Save button

        // Wait for mock save
        await page.waitForSelector('text=Gesture Test Event', { timeout: 10000 });
        console.log('Event added successfully');

        // 4. Test: Short Press Drag (Should Scroll)
        console.log('Testing Short Press Drag (Scroll)...');
        const eventLocator = page.locator('text=Gesture Test Event').first();
        const eventBox = await eventLocator.boundingBox();

        if (!eventBox) throw new Error('Event not found');

        const startX = eventBox.x + eventBox.width / 2;
        const startY = eventBox.y + eventBox.height / 2;

        // Simulate touch and scroll
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY - 200, { steps: 10 }); // Scroll down (move finger up)
        await page.mouse.up();

        // Check if scrolled (rough check)
        const scrollY = await page.evaluate(() => window.scrollY);
        console.log(`Scroll Y after short press drag: ${scrollY}`);
        if (scrollY === 0) console.warn('Warning: Page might not have scrolled, or was already at top?');
        else console.log('Page scrolled as expected (Short press did not capture drag)');

        // 5. Test: Long Press Drag (Should Drag)
        console.log('Testing Long Press Drag...');
        // Reset scroll
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);

        // Refresh bounding box
        const eventBox2 = await eventLocator.boundingBox();
        if (!eventBox2) throw new Error('Event not found 2');
        const startX2 = eventBox2.x + eventBox2.width / 2;
        const startY2 = eventBox2.y + eventBox2.height / 2;

        await page.mouse.move(startX2, startY2);
        await page.mouse.down();
        // Wait for long press (300ms + buffer)
        await page.waitForTimeout(600);

        // Drag to next day (assuming standard grid, move right/down)
        // Calendar cell width approx 360/7 = 50px. Height 40px?
        // Let's move +100px X, +0px Y
        await page.mouse.move(startX2 + 40, startY2, { steps: 20 });
        await page.mouse.up();

        console.log('Long press drag completed.');

        console.log('Test Complete!');

    } catch (error) {
        console.error('Test Failed:', error);
        await page.screenshot({ path: 'test_failure.png' });
        console.log('Screenshot saved to test_failure.png');
    } finally {
        await browser.close();
    }
})();
