import { expect, Page, test } from '@playwright/test';

async function signUp(page: Page, email: string, seats = '25') {
  await page.goto('/');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Full name').fill('Jordan Lee');
  await page.getByLabel('Number of seats').fill(seats);
  await page.getByRole('button', { name: 'Continue' }).click();
}

test('rejects personal email addresses', async ({ page }) => {
  await signUp(page, 'jordan@gmail.com');
  await expect(page.getByText('Please use your work email')).toBeVisible();
  await expect(page.getByTestId('order')).toHaveCount(0);
});

test('configures and prices an order for a Shopify store', async ({ page }) => {
  await signUp(page, 'jordan@bombas.com');
  await expect(page.getByRole('heading', { name: 'Your Acme plan for Bombas' })).toBeVisible();
  await expect(page.getByTestId('plan')).toContainText('Business');
  await expect(page.getByTestId('setup')).toContainText('Shopify Plus connector');

  // 25 × $24 Business + 25 × $10 Acme AI + $199 Acme Hire
  const total = page.getByTestId('total');
  await expect(total).toContainText('$1,049');

  await page.getByTestId('addon-ai').getByText('Acme AI').click();
  await expect(total).toContainText('$799');

  await page.getByRole('button', { name: 'More seats' }).click();
  await expect(total).toContainText('$823'); // 26 × $24 + $199

  await page.getByRole('button', { name: 'Complete purchase' }).click();
  await expect(page.getByText('Nothing was purchased')).toBeVisible();
});

test('a sample company fills in the form', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('samples').getByRole('button', { name: 'Glossier' }).click();
  await expect(page.getByLabel('Work email')).toHaveValue('alex@glossier.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('setup')).toContainText('EU data residency');
});

test('shows the pipeline with timings, cost, and citations', async ({ page }) => {
  await signUp(page, 'jordan@ouraring.com');
  await expect(page.getByTestId('order')).toBeVisible();
  await expect(page.getByTestId('setup')).toContainText('Security review');

  const drawer = page.getByTestId('pipeline');
  await expect(drawer).toBeHidden();
  await page.getByTestId('pipeline-toggle').click();
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Exa deep-lite');
  await expect(drawer).toContainText('$0.012');
  await expect(drawer).toContainText('saved run');
  await expect(drawer.getByRole('link').first()).toHaveAttribute('href', /^https?:\/\//);

  await drawer.getByText('Show request body').click();
  await expect(drawer).toContainText('"outputSchema"');
  await drawer.getByText('Show response body').click();
  await expect(drawer).toContainText('"grounding"');

  // The request's Exa features are listed, read from the request itself.
  await expect(page.getByTestId('features')).toContainText('outputSchema');

  // Each profile field shows what it added to the order and the rule behind it.
  const mapping = page.getByTestId('mapping');
  await expect(mapping).toContainText('Compliance Pack');
  await expect(mapping).toContainText('handles_sensitive_data is true');
  await expect(mapping).toContainText('seats ≥ 15');

  await page.getByTestId('pipeline-close').click();
  await expect(drawer).toBeHidden();
});

test('routes very large companies to sales and books a call', async ({ page }) => {
  await signUp(page, 'jordan@nike.com');
  await expect(page.getByTestId('enterprise')).toContainText('Acme Enterprise');
  await expect(page.getByTestId('known')).toContainText('employees');

  await page.getByRole('button', { name: 'Talk to sales' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toContainText('Talk to an Acme specialist');
  await expect(modal.getByLabel('Work email')).toHaveValue('jordan@nike.com');
  await expect(modal.getByLabel('Company', { exact: true })).toHaveValue(/NIKE/i);

  await modal.getByRole('button', { name: 'Continue' }).click();
  const confirm = modal.getByRole('button', { name: 'Confirm time' });
  await expect(confirm).toBeDisabled();
  await modal.getByRole('button', { name: /AM|PM/ }).first().click();
  await confirm.click();
  await expect(modal).toContainText("You're booked");
  await expect(modal).toContainText('no meeting was booked');
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(modal).toHaveCount(0);
});

test('offers a talk-to-sales option to large self-serve companies', async ({ page }) => {
  await signUp(page, 'jordan@ouraring.com');
  const assist = page.getByTestId('sales-assist');
  await expect(assist).toContainText('Buying for a larger team?');
  await assist.getByRole('button', { name: 'Talk to sales' }).click();
  await expect(page.getByRole('dialog')).toContainText('Talk to an Acme specialist');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('order')).toBeVisible();
});

test('does not offer the sales option to smaller companies', async ({ page }) => {
  await signUp(page, 'jordan@bombas.com');
  await expect(page.getByTestId('order')).toBeVisible();
  await expect(page.getByTestId('sales-assist')).toHaveCount(0);
});

test('sets up every website language and ships devices to a remote team', async ({ page }) => {
  await signUp(page, 'jordan@calendly.com');
  await expect(page.getByTestId('setup')).toContainText('8 languages');
  await expect(page.getByTestId('addon-devices')).toContainText('Recommended');
});

test('explains when no saved result exists and lookups are off', async ({ page }) => {
  await signUp(page, 'jordan@example-unknown.com');
  await expect(page.getByText("We couldn't look up your company")).toBeVisible();
  await expect(page.getByLabel('Work email')).toBeVisible();
});

test('start over returns to the form', async ({ page }) => {
  await signUp(page, 'jordan@bombas.com');
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('the ?data= switch turns live lookups off and on, and is remembered', async ({ page }) => {
  await page.goto('/?data=saved');
  await expect(page.getByTestId('saved-badge')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('saved-badge')).toBeVisible();

  await signUp(page, 'jordan@ouraring.com');
  await page.getByTestId('pipeline-toggle').click();
  await expect(page.getByTestId('pipeline')).toContainText('live lookups off');

  await page.goto('/?data=live');
  await expect(page.getByTestId('saved-badge')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByTestId('saved-badge')).toHaveCount(0);
});
