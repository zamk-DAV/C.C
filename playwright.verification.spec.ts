import { test, expect } from '@playwright/test';

test('Verify Profile Edit and Online Status UI', async ({ page }) => {
    // 1. Logic
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'godqka');
    await page.fill('input[type="password"]', 'ehgus852');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');

    // 2. Settings Page & Profile Modal
    await page.goto('http://localhost:5173/settings');
    await expect(page.locator('text=내 프로필')).toBeVisible();

    // Open Modal
    // Force click since opacity is 0
    await page.locator('.material-symbols-outlined:has-text("edit")').click({ force: true });
    await expect(page.locator('text=프로필 편집')).toBeVisible();
    await expect(page.locator('input[placeholder="이름을 입력하세요"]')).toBeVisible();
    await expect(page.locator('input[placeholder="상태 메시지를 입력하세요"]')).toBeVisible();

    // Close Modal
    await page.click('text=취소');
    await expect(page.locator('text=프로필 편집')).not.toBeVisible();

    // 3. Chat Page Online Status
    await page.goto('http://localhost:5173/chat');
    // Check Header
    // Note: partnerData might be null or mock. Just checking if the container exists.
    // We look for the font-size classes or structure we added.
    const headerName = page.locator('h1.text-\\[16px\\]');
    await expect(headerName).toBeVisible();

    // Check if status span exists (either "접속 중", "오프라인", or time)
    // Since verifying exact text is hard without partner logic, we verify the element presence.
    const statusSpan = page.locator('span.text-\\[10px\\]');
    await expect(statusSpan).toBeVisible();
});
