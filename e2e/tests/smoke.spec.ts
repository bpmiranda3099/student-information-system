import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sis-home-title')).toBeVisible();
    await expect(page.locator('#sis-home-sign-in-link')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#sis-login-title')).toBeVisible();
    await expect(page.locator('#sis-login-email')).toBeVisible();
    await expect(page.locator('#sis-login-password')).toBeVisible();
  });

  test('student can log in and reach dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#sis-login-email').fill('student@sis.edu');
    await page.locator('#sis-login-password').fill('Password123!');
    await page.locator('#sis-login-submit').click();
    await page.waitForURL(/\/student/);
    await expect(page.locator('#sis-student-dashboard-title')).toBeVisible();
  });

  test('student can open My Courses from sidebar', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#sis-login-email').fill('student@sis.edu');
    await page.locator('#sis-login-password').fill('Password123!');
    await page.locator('#sis-login-submit').click();
    await page.waitForURL(/\/student/);
    await page.locator('#sis-nav-student-courses').click();
    await page.waitForURL(/\/student\/courses/);
    await expect(page.locator('#sis-student-courses-title')).toBeVisible();
  });

  test('faculty can log in', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#sis-login-email').fill('faculty@sis.edu');
    await page.locator('#sis-login-password').fill('Password123!');
    await page.locator('#sis-login-submit').click();
    await page.waitForURL(/\/faculty/);
    await expect(page.locator('#sis-faculty-dashboard-title')).toBeVisible();
  });

  test('admin can log in and see renamed nav labels', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#sis-login-email').fill('admin@sis.edu');
    await page.locator('#sis-login-password').fill('Password123!');
    await page.locator('#sis-login-submit').click();
    await page.waitForURL(/\/admin/);
    await expect(page.locator('#sis-admin-dashboard-title')).toBeVisible();
    await expect(page.locator('#sis-nav-admin-subjects')).toHaveText('Catalog');
    await expect(page.locator('#sis-nav-admin-maintenance')).toHaveText('Academic Setup');
  });
});

test.describe('API health', () => {
  test('health endpoint responds', async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const response = await request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('checks');
  });
});
