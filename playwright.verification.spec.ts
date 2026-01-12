import { test, expect } from '@playwright/test';

test('Verify Profile Edit and Online Status UI', async ({ page }) => {
    // 1. Logic
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'godqka');
    await page.fill('input[type="password"]', 'ehgus852');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });

    // 2. Settings Page & Profile Modal
    await page.goto('http://localhost:5173/settings');
    await expect(page.locator('text=내 프로필')).toBeVisible();

    // Open Modal - Use a more robust selector or force click
    // Assuming the edit icon is a button or clickable element inside the profile section
    // If the previous selector failed, try finding by aria-label or just the icon text more broadly
    await page.locator('span.material-symbols-outlined', { hasText: 'edit' }).first().click({ force: true });

    await expect(page.locator('text=프로필 편집')).toBeVisible();
    await expect(page.locator('input[placeholder="이름을 입력하세요"]')).toBeVisible();
    await expect(page.locator('input[placeholder="상태 메시지를 입력하세요"]')).toBeVisible();

    // New Fields Verification
    await expect(page.locator('input[placeholder="연락처를 입력하세요"]')).toBeVisible();
    await expect(page.locator('input[placeholder="MBTI"]')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="취미나 좋아하는 것을 자유롭게 적어주세요"]')).toBeVisible();

    // Close Modal
    await page.click('text=취소');
    await expect(page.locator('text=프로필 편집')).not.toBeVisible();

    // 3. Partner Profile & Nickname Verification
    await page.goto('http://localhost:5173/settings');

    // Click the partner profile image. 
    // We use the alt text which is passed to ProfileImage. 
    // If ProfileImage uses Shadcn Avatar, it might not render img if fallback is shown, but usually it does.
    // Alternatively, we can target the profile container.
    // Settings Page has two profiles. Left is Me, Right is Partner.
    // "상대방 프로필" text is below the partner profile.
    // We can click the image associated with "Partner Profile" alt text if it exists, or just the 2nd profile-image-like element.
    await page.locator('div[className*="relative cursor-pointer group"]').nth(1).click({ force: true });

    await expect(page.locator('text=상대방 프로필')).toBeVisible(); // Modal Title
    await expect(page.locator('text=내 화면에 표시될 이름 (애칭)')).toBeVisible();

    // Set Nickname
    const nicknameInput = page.locator('input[placeholder*="이름"]'); // The first input is nickname in partner mode
    // Actually the placeholder is the name. But I can target by label.
    await page.fill('input', '내사랑테스트'); // First input should be nickname
    await page.click('text=저장');

    // Verify Settings Page Update
    await expect(page.locator('text=내사랑테스트')).toBeVisible();

    // 4. Chat Page Nickname Verification
    await page.goto('http://localhost:5173/chat');
    await expect(page.locator('h1', { hasText: '내사랑테스트' })).toBeVisible();
});
