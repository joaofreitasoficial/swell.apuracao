# P2: Testes E2E e Unitários - Explicação Detalhada

## 🎯 O que foi feito?

Implementamos uma **suíte completa de testes** com:
- ✅ 20+ testes unitários (hooks, validações)
- ✅ 15+ testes E2E (fluxos reais do usuário)
- ✅ Setup automatizado (mocks, cleanup)
- ✅ Configuração de Vitest + Playwright
- ✅ Cobertura de cenários críticos

---

## 📋 Arquivos criados

```
__tests__/
  ├── setup.ts                          (Setup global de testes)
  ├── unit/
  │   ├── hooks/
  │   │   ├── useAutoSave.test.ts       (Debounce, cache, draft)
  │   │   └── useRetry.test.ts          (Retry com backoff)
  │   └── validations/
  │       └── batch-actions.test.ts     (Validação de seleção)
  └── e2e/
      └── review-workspace.spec.ts      (Fluxo completo de UI)

vitest.config.ts                        (Config Vitest)
playwright.config.ts                    (Config Playwright E2E)
```

---

## 🔧 O que cada teste faz?

### Testes Unitários (useAutoSave)

```
✅ Salva em cache local (sessionStorage)
✅ Faz debounce de 500ms antes de enviar
✅ Recupera draft após recarregar
✅ Limpa cache após salvar com sucesso
✅ Mantém cache em caso de erro
✅ Tenta novamente em erro de rede
```

**Exemplo de teste:**
```typescript
it('deve fazer debounce de 500ms antes de salvar', async () => {
  // Mudar valor
  updateValue('novo texto');
  
  // Ainda não salvou (aguardando debounce)
  expect(mockOnSave).not.toHaveBeenCalled();
  
  // Aguardar 500ms
  vi.advanceTimersByTime(500);
  
  // Agora chamou
  expect(mockOnSave).toHaveBeenCalled();
});
```

### Testes Unitários (useRetry)

```
✅ Sucesso na primeira tentativa
✅ Retry na segunda tentativa (error handling)
✅ Falha após 3 tentativas
✅ Exponential backoff: 1s → 2s → 4s
✅ Diferencia erros 4xx vs 5xx
✅ Chama callback de retry com delay
```

**Exemplo de teste:**
```typescript
it('deve fazer retry com exponential backoff', async () => {
  // Tentar função que falha 2x, depois sucede
  const result = await execute(fn, onRetry);
  
  // onRetry chamado 2x com delays crescentes
  expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000); // 1s
  expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000); // 2s
});
```

### Testes Unitários (Validações)

```
✅ Rejeita seleção vazia (❌ erro)
✅ Permite 1-100 seleções (✅ ok)
✅ Avisa para 101-1000 (⚠️ warning)
✅ Bloqueia >1000 (❌ erro)
✅ Valida schema Zod
✅ Testa todas as reasons válidas
✅ Rejeita nota >1000 caracteres
```

**Exemplo de teste:**
```typescript
it('deve avisar para >100 seleções', () => {
  const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
  const result = validateBatchSelection(ids);
  
  expect(result.valid).toBe(true);
  expect(result.warning).toContain('150');
  expect(result.warning).toContain('pode ser lento');
});
```

### Testes E2E (ReviewWorkspace)

```
✅ Selecionar uma transação
✅ Selecionar múltiplas transações
✅ Mudar decisão individual
✅ Aplicar ação em lote (Manter)
✅ Aplicar ação em lote (Excluir com motivo)
✅ Undo de ação em lote (Ctrl+Z)
✅ Persistência de aba ao recarregar
✅ Aviso para >100 seleções
✅ Erro para >1000 seleções
✅ Filtrar por mês e ano
✅ Buscar por descrição (com debounce)
✅ Histórico de undo/redo
✅ Responsividade mobile (375px)
```

**Exemplo de teste E2E:**
```typescript
test('deve selecionar múltiplas transações', async () => {
  // Clicar em 5 checkboxes
  for (let i = 0; i < 5; i++) {
    const checkbox = rows.nth(i).locator('input[type="checkbox"]');
    await checkbox.click();
  }
  
  // Verificar que mudou contador
  await expect(selectionCounter).toContainText('5 selecionada');
});
```

---

## 🚀 Como rodar os testes?

### Testes Unitários (Vitest)

```bash
# Instalar dependências primeiro
npm install -D vitest @vitejs/plugin-react jsdom

# Rodar todos
npm run test

# Rodar apenas unit
npm run test:unit

# Rodar com coverage
npm run test:coverage

# Watch mode (rerun ao salvar)
npm run test:watch

# Um arquivo específico
npm run test -- useAutoSave.test.ts
```

### Testes E2E (Playwright)

```bash
# Instalar dependências
npm install -D @playwright/test

# Rodar todos
npx playwright test

# Rodar com browser visível (headed)
npx playwright test --headed

# Um arquivo específico
npx playwright test review-workspace.spec.ts

# Modo debug
npx playwright test --debug

# Ver report HTML
npx playwright show-report
```

---

## 📊 O que é testado?

### Camada de Lógica (Unitários)

```
🎯 useAutoSave
  ├─ Debounce: aguarda 500ms antes de salvar
  ├─ Cache: salva em sessionStorage imediatamente
  ├─ Recovery: recupera draft ao voltar
  ├─ Cleanup: remove draft após sucesso
  └─ Retry: mantém em cache se erro

🎯 useRetry
  ├─ Tentativas: max 3 vezes
  ├─ Delays: 1s → 2s → 4s (exponential)
  ├─ Callbacks: notifica a cada retry
  ├─ Erros: diferencia 4xx vs 5xx
  └─ Cancelamento: pode cancelar no meio

🎯 Validações (Zod)
  ├─ Limites: soft (100) e hard (1000)
  ├─ Schemas: decision, reason, note
  ├─ Tamanhos: maxlength nota
  └─ Enum values: todas as reasons válidas
```

### Camada de UI (E2E)

```
🎯 Seleção
  ├─ Checkbox individual
  ├─ Múltiplos checkboxes
  ├─ Select all (se existir)
  └─ Deselect

🎯 Ações
  ├─ Decisão individual (manter/excluir/pendente)
  ├─ Ação em lote
  ├─ Motivo de exclusão
  ├─ Observação/nota
  └─ Confirmação

🎯 UX
  ├─ Persistência de aba
  ├─ Filtros (mês, ano, direção, busca)
  ├─ Validação visual (avisos, erros)
  ├─ Toasts de sucesso/erro
  ├─ Indicadores (loading, retry)
  └─ Responsividade mobile

🎯 Undo/Redo
  ├─ Ctrl+Z desfaz ação
  ├─ Histórico mantém múltiplas ações
  └─ Visual feedback de undo
```

---

## 🔌 Como integrar na CI/CD?

### GitHub Actions

Crie `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Package.json scripts

Adicione ao `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --reporter=verbose",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

---

## 📈 Coverage esperado

| Camada | Cobertura |
|--------|-----------|
| Hooks | 85%+ |
| Validações | 95%+ |
| Componentes | 70%+ |
| Pages | 50%+ |
| **Total** | **~75%** |

---

## 🚨 Testes críticos (devem passar sempre)

- ✅ useAutoSave debounce
- ✅ useRetry exponential backoff
- ✅ validateBatchSelection limites
- ✅ Seleção múltipla funcionando
- ✅ Ação em lote salvando
- ✅ Undo desfazendo corretamente
- ✅ Persistência de aba
- ✅ Responsividade mobile

---

## 🐛 Debugging de testes

### Vitest

```bash
# Debug direto no VSCode
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Pausar em pontos específicos
vi.useFakeTimers();
vi.advanceTimersByTime(500); // Pular 500ms
vi.runAllTimers(); // Rodar todos os timers
```

### Playwright

```bash
# Ver browser enquanto testa
npx playwright test --headed

# Modo debug interativo
npx playwright test --debug

# Screenshot de falha
# Automaticamente captura em playwright/tests-results/
```

---

## 📝 Próximos passos

- [ ] Integrar testes na CI/CD
- [ ] Adicionar mais testes E2E para edge cases
- [ ] Implementar visual regression testing
- [ ] Testar performance (lighthouse)
- [ ] Load testing (k6/locust)
- [ ] Adicionar snapshots de transações

---

## 📚 Referências

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/)
- [Zod Validation](https://zod.dev/)

---

**Status:** ✅ Implementação completa. Testes prontos para rodar.
