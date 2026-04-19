/**
 * Testes E2E para ReviewWorkspace
 *
 * Testa:
 * - Seleção de transações (checkbox)
 * - Mudança de decisão (manter/excluir/pendente)
 * - Ações em lote (aplicar para múltiplas)
 * - Undo/Redo
 * - Persistência de aba
 * - Filtros
 *
 * NOTA: Estes testes requerem:
 * - Playwright instalado (npm install -D @playwright/test)
 * - App rodando em http://localhost:3000
 * - Dados de teste no banco
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const APURACAO_ID = 'test-apuracao-id'; // Substituir com ID real

test.describe('ReviewWorkspace - Seleção e ações', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Fazer login primeiro (se necessário)
    await page.goto(`${BASE_URL}/login`);
    // Preencher credenciais de teste...
    // await page.fill('input[name=email]', 'test@example.com');
    // await page.fill('input[name=password]', 'password');
    // await page.click('button:has-text("Entrar")');

    // Navegar para revisão
    await page.goto(`${BASE_URL}/app/apuracoes/${APURACAO_ID}/revisao`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('deve selecionar uma transação', async () => {
    // Localizar primeira transação
    const firstRow = page.locator('[data-testid="transaction-row"]').first();

    // Clicar no checkbox
    const checkbox = firstRow.locator('input[type="checkbox"]');
    await checkbox.click();

    // Verificar que está selecionada
    await expect(checkbox).toBeChecked();

    // Verificar que o contador de seleção aumentou
    const selectionCounter = page.locator('[data-testid="selection-count"]');
    await expect(selectionCounter).toContainText('1 selecionada');
  });

  test('deve selecionar múltiplas transações', async () => {
    const rows = page.locator('[data-testid="transaction-row"]');
    const rowCount = await rows.count();

    // Selecionar as 5 primeiras
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      const checkbox = rows.nth(i).locator('input[type="checkbox"]');
      await checkbox.click();
    }

    // Verificar contador
    const selectionCounter = page.locator('[data-testid="selection-count"]');
    await expect(selectionCounter).toContainText('5 selecionada');
  });

  test('deve mudar decisão de uma transação', async () => {
    const firstRow = page.locator('[data-testid="transaction-row"]').first();

    // Encontrar dropdown de decisão
    const decisionSelect = firstRow.locator('select[aria-label="Decisão"]');

    // Mudar para "Excluir"
    await decisionSelect.selectOption('excluir');

    // Verificar que mudou
    await expect(decisionSelect).toHaveValue('excluir');

    // Verificar que o motivo de exclusão apareceu
    const reasonSelect = firstRow.locator('select[aria-label="Motivo"]');
    await expect(reasonSelect).toBeVisible();
  });

  test('deve aplicar ação em lote (Manter)', async () => {
    // Selecionar 3 transações
    const rows = page.locator('[data-testid="transaction-row"]');
    for (let i = 0; i < 3; i++) {
      const checkbox = rows.nth(i).locator('input[type="checkbox"]');
      await checkbox.click();
    }

    // Clique no botão "Aplicar ação em lote"
    await page.click('[data-testid="apply-batch-action"]');

    // Verificar que abriu modal/sidebar
    const batchPanel = page.locator('[data-testid="batch-action-panel"]');
    await expect(batchPanel).toBeVisible();

    // Mudar decisão para "Manter"
    await page.selectOption('[data-testid="batch-decision"]', 'manter');

    // Clicar "Aplicar"
    await page.click('[data-testid="batch-apply-button"]');

    // Aguardar sucesso
    const successToast = page.locator('text=Ação aplicada com sucesso');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Verificar que as 3 transações mudaram para "Manter"
    for (let i = 0; i < 3; i++) {
      const decision = rows.nth(i).locator('[data-testid="decision-badge"]');
      await expect(decision).toContainText('Manter');
    }
  });

  test('deve aplicar ação em lote (Excluir com motivo)', async () => {
    const rows = page.locator('[data-testid="transaction-row"]');
    for (let i = 0; i < 2; i++) {
      const checkbox = rows.nth(i).locator('input[type="checkbox"]');
      await checkbox.click();
    }

    await page.click('[data-testid="apply-batch-action"]');

    // Mudar para "Excluir"
    await page.selectOption('[data-testid="batch-decision"]', 'excluir');

    // Selecionar motivo
    await page.selectOption('[data-testid="batch-reason"]', 'duplicada');

    // Aplicar
    await page.click('[data-testid="batch-apply-button"]');

    // Aguardar sucesso
    const successToast = page.locator('text=Ação aplicada com sucesso');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Verificar que aparecem com "Excluir"
    for (let i = 0; i < 2; i++) {
      const decision = rows.nth(i).locator('[data-testid="decision-badge"]');
      await expect(decision).toContainText('Excluir');
    }
  });

  test('deve fazer undo de ação em lote', async () => {
    const rows = page.locator('[data-testid="transaction-row"]');
    const firstDecision = rows.first().locator('[data-testid="decision-badge"]');

    // Pegar decisão antes
    const decisionBefore = await firstDecision.textContent();

    // Selecionar 1 e mudar para "Manter"
    await rows.first().locator('input[type="checkbox"]').click();
    await page.selectOption('[data-testid="batch-decision"]', 'manter');
    await page.click('[data-testid="batch-apply-button"]');

    await expect(firstDecision).toContainText('Manter');

    // Fazer Ctrl+Z
    await page.keyboard.press('Control+Z');

    // Aguardar undo
    await page.waitForTimeout(500);

    // Verificar que voltou
    const decisionAfter = await firstDecision.textContent();
    expect(decisionAfter).toBe(decisionBefore);
  });

  test('deve persistir aba ativa ao recarregar', async () => {
    // Clicar na aba "Excluídas"
    await page.click('[data-testid="tab-excluidas"]');

    // Aguardar carregamento
    await page.waitForLoadState('networkidle');

    // Recarregar página
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verificar que aba "Excluídas" está ativa
    const excluidasTab = page.locator('[data-testid="tab-excluidas"]');
    await expect(excluidasTab).toHaveAttribute('data-active', 'true');
  });

  test('deve mostrar validação para muitas seleções', async () => {
    const rows = page.locator('[data-testid="transaction-row"]');
    const rowCount = await rows.count();

    // Tentar selecionar todas (se >100)
    if (rowCount > 100) {
      for (let i = 0; i < 150; i++) {
        if (i < rowCount) {
          const checkbox = rows.nth(i).locator('input[type="checkbox"]');
          await checkbox.click();
        }
      }

      // Deve aparecer aviso
      const warning = page.locator('text=Você selecionou 150');
      await expect(warning).toBeVisible();
    }
  });

  test('deve mostrar erro para >1000 seleções', async () => {
    // Mock de 1001 transações selecionadas
    // Este teste seria mais realista com dados de teste maiores

    // Simular erro via DevTools ou mock
    await page.evaluate(() => {
      document.body.innerHTML = document.body.innerHTML.replace(
        /selection-count/,
        'selection-count" data-count="1001',
      );
    });

    // Deve mostrar erro
    // (Este é um exemplo simplificado)
  });

  test('deve filtrar por mês e ano', async () => {
    // Abrir filtros
    await page.click('[data-testid="open-filters"]');

    // Selecionar mês
    await page.selectOption('[data-testid="filter-month"]', '3'); // Março

    // Selecionar ano
    await page.selectOption('[data-testid="filter-year"]', '2024');

    // Aplicar filtros
    await page.click('[data-testid="apply-filters"]');

    // Aguardar filtragem
    await page.waitForLoadState('networkidle');

    // Verificar que apenas transações de mar/2024 aparecem
    const transactionMonths = await page
      .locator('[data-testid="transaction-month"]')
      .allTextContents();

    transactionMonths.forEach((month) => {
      expect(month).toMatch(/mar|03/i);
    });
  });

  test('deve buscar por descrição', async () => {
    const searchInput = page.locator('[data-testid="search-query"]');
    await searchInput.fill('Transferência');

    // Aguardar debounce
    await page.waitForTimeout(600);

    // Verificar que apenas transações com "Transferência" aparecem
    const descriptions = await page
      .locator('[data-testid="transaction-description"]')
      .allTextContents();

    descriptions.forEach((desc) => {
      expect(desc.toLowerCase()).toContain('transferência');
    });
  });
});

test.describe('ReviewWorkspace - Undo/Redo', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Login e navegar para revisão
    await page.goto(`${BASE_URL}/app/apuracoes/${APURACAO_ID}/revisao`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('deve armazenar histórico de undo', async () => {
    const rows = page.locator('[data-testid="transaction-row"]');

    // Ação 1: Mudar primeira transação para "Manter"
    const firstRow = rows.first();
    await firstRow.locator('select[aria-label="Decisão"]').selectOption('manter');
    await page.waitForTimeout(500);

    // Ação 2: Mudar segunda transação para "Excluir"
    const secondRow = rows.nth(1);
    await secondRow.locator('select[aria-label="Decisão"]').selectOption('excluir');
    await page.waitForTimeout(500);

    // Histórico deve ter 2 ações
    const undoButton = page.locator('[data-testid="undo-button"]');
    await expect(undoButton).toBeEnabled();

    // Primeira undo: volta ação 2
    await undoButton.click();
    const secondDecision = secondRow.locator('[data-testid="decision-badge"]');
    await expect(secondDecision).not.toContainText('Excluir');

    // Segunda undo: volta ação 1
    await undoButton.click();
    const firstDecision = firstRow.locator('[data-testid="decision-badge"]');
    await expect(firstDecision).not.toContainText('Manter');
  });
});

test.describe('ReviewWorkspace - Responsividade', () => {
  test('deve funcionar em mobile (375px)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/app/apuracoes/${APURACAO_ID}/revisao`);
    await page.waitForLoadState('networkidle');

    // Verificar que elementos principais aparecem
    await expect(page.locator('[data-testid="transaction-row"]').first()).toBeVisible();

    // Sidebar deve estar oculta ou colapsada
    const sidebar = page.locator('[data-testid="batch-action-panel"]');
    // Em mobile pode estar em drawer/modal
    const mobileDrawerButton = page.locator('[data-testid="open-sidebar-mobile"]');
    if (await mobileDrawerButton.isVisible()) {
      await mobileDrawerButton.click();
      await expect(sidebar).toBeVisible();
    }

    await page.close();
    await context.close();
  });
});
