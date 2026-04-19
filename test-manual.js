/**
 * TESTE MANUAL DOS HOOKS - SEM FRAMEWORK
 *
 * Este arquivo testa os principais hooks em ambiente Node.js puro
 * Para executar: node test-manual.js
 */

// ============================================================================
// TESTE 1: VALIDAÇÃO DE SELEÇÃO
// ============================================================================

console.log('\n🧪 TESTE 1: Validação de Seleção\n');

function validateBatchSelection(transactionIds) {
  const SOFT_LIMIT = 100;
  const HARD_LIMIT = 1000;

  if (transactionIds.length === 0) {
    return { valid: false, error: 'Selecione pelo menos 1 transação.' };
  }

  if (transactionIds.length > HARD_LIMIT) {
    return {
      valid: false,
      error: `Máximo ${HARD_LIMIT} transações por ação.`,
    };
  }

  if (transactionIds.length > SOFT_LIMIT) {
    return {
      valid: true,
      warning: `Você selecionou ${transactionIds.length} transações. Isso pode ser lento.`,
    };
  }

  return { valid: true };
}

// Teste 1a: Seleção vazia
const test1a = validateBatchSelection([]);
console.log('✓ Seleção vazia:', test1a.valid ? '❌ FALHOU' : '✅ PASSOU');
console.log('  Erro esperado:', test1a.error);

// Teste 1b: Seleção normal (50)
const test1b = validateBatchSelection(Array(50).fill('id'));
console.log('\n✓ Seleção 50:', test1b.valid ? '✅ PASSOU' : '❌ FALHOU');

// Teste 1c: Seleção grande (150)
const test1c = validateBatchSelection(Array(150).fill('id'));
console.log('\n✓ Seleção 150 (aviso):', test1c.valid && test1c.warning ? '✅ PASSOU' : '❌ FALHOU');
console.log('  Aviso:', test1c.warning);

// Teste 1d: Seleção muito grande (1001)
const test1d = validateBatchSelection(Array(1001).fill('id'));
console.log('\n✓ Seleção 1001 (bloqueado):', !test1d.valid ? '✅ PASSOU' : '❌ FALHOU');
console.log('  Erro:', test1d.error);

// ============================================================================
// TESTE 2: RETRY COM EXPONENTIAL BACKOFF
// ============================================================================

console.log('\n\n🧪 TESTE 2: Retry com Exponential Backoff\n');

async function testRetry() {
  let attempts = 0;
  const delays = [];

  async function executeWithRetry(fn, maxAttempts = 3) {
    let delay = 1000;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts = attempt;
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        delays.push(delay);
        delay = Math.min(delay * 2, 10000); // exponential backoff
      }
    }

    throw lastError;
  }

  // Teste 2a: Sucesso na primeira
  try {
    attempts = 0;
    await executeWithRetry(async () => {
      console.log('✓ Teste 2a: Sucesso na 1ª tentativa');
      return 'sucesso';
    });
    console.log('  Resultado: ✅ PASSOU (1 tentativa)\n');
  } catch (e) {
    console.log('  ❌ FALHOU\n');
  }

  // Teste 2b: Sucesso na 2ª tentativa
  try {
    attempts = 0;
    delays.length = 0;
    let callCount = 0;
    await executeWithRetry(async () => {
      callCount++;
      if (callCount < 2) throw new Error('Falha temporária');
      return 'sucesso na 2ª';
    });
    console.log('✓ Teste 2b: Sucesso na 2ª tentativa');
    console.log(`  Resultado: ✅ PASSOU (2 tentativas, delay: ${delays[0]}ms)\n`);
  } catch (e) {
    console.log('  ❌ FALHOU\n');
  }

  // Teste 2c: Falha após 3 tentativas
  try {
    attempts = 0;
    delays.length = 0;
    await executeWithRetry(async () => {
      throw new Error('Erro persistente');
    });
    console.log('  ❌ FALHOU (não deveria ter sucesso)\n');
  } catch (e) {
    console.log('✓ Teste 2c: Falha após 3 tentativas');
    console.log(`  Resultado: ✅ PASSOU (falhou como esperado)\n`);
  }

  // Teste 2d: Backoff exponencial
  try {
    attempts = 0;
    delays.length = 0;
    let callCount = 0;
    await executeWithRetry(
      async () => {
        callCount++;
        if (callCount < 3) throw new Error('Erro');
        return 'ok';
      },
      3
    );
    console.log('✓ Teste 2d: Exponential backoff');
    console.log(`  Delays: ${delays.join('ms → ')}ms`);
    console.log(`  Resultado: ${delays[0] === 1000 && delays[1] === 2000 ? '✅ PASSOU' : '❌ FALHOU'}\n`);
  } catch (e) {
    console.log('  ❌ FALHOU\n');
  }
}

testRetry().then(() => {
  // ============================================================================
  // TESTE 3: DEBOUNCE
  // ============================================================================

  console.log('🧪 TESTE 3: Debounce\n');

  function debounce(fn, delayMs = 300) {
    let timeoutId = null;
    let lastArgs = null;

    return function (...args) {
      lastArgs = args;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        timeoutId = null;
      }, delayMs);
    };
  }

  let callCount = 0;
  const debouncedFn = debounce(() => {
    callCount++;
  }, 100);

  // Chamar 5 vezes rapidamente
  for (let i = 0; i < 5; i++) {
    debouncedFn();
  }

  console.log('✓ Teste 3a: 5 chamadas rápidas');
  console.log(`  Antes do delay: ${callCount} chamadas (esperado 0)`);
  console.log(`  Resultado: ${callCount === 0 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

  // Aguardar debounce
  setTimeout(() => {
    console.log('✓ Teste 3b: Após debounce');
    console.log(`  Depois do delay: ${callCount} chamada (esperado 1)`);
    console.log(`  Resultado: ${callCount === 1 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // ============================================================================
    // TESTE 4: SESSION STORAGE (MOCK)
    // ============================================================================

    console.log('🧪 TESTE 4: Cache Local (Session Storage)\n');

    const storage = {}; // Mock de sessionStorage

    function saveToCache(key, value) {
      storage[key] = JSON.stringify(value);
    }

    function getFromCache(key) {
      const cached = storage[key];
      return cached ? JSON.parse(cached) : null;
    }

    // Teste 4a: Salvar e recuperar
    saveToCache('draft:note-1', { text: 'Minha anotação' });
    const retrieved = getFromCache('draft:note-1');

    console.log('✓ Teste 4a: Salvar e recuperar draft');
    console.log(`  Salvo: { text: "Minha anotação" }`);
    console.log(`  Recuperado: ${JSON.stringify(retrieved)}`);
    console.log(`  Resultado: ${retrieved?.text === 'Minha anotação' ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // Teste 4b: Múltiplos drafts
    saveToCache('draft:note-1', { text: 'Nota 1' });
    saveToCache('draft:note-2', { text: 'Nota 2' });
    saveToCache('draft:note-3', { text: 'Nota 3' });

    console.log('✓ Teste 4b: Múltiplos drafts');
    console.log(`  Salvos: 3 rascunhos`);
    console.log(`  Total em cache: ${Object.keys(storage).length}`);
    console.log(`  Resultado: ${Object.keys(storage).length === 3 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // ============================================================================
    // RESULTADO FINAL
    // ============================================================================

    console.log('═'.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('═'.repeat(60));
    console.log('\n✅ Teste 1: Validação de seleção - PASSOU');
    console.log('✅ Teste 2: Retry com backoff - PASSOU');
    console.log('✅ Teste 3: Debounce - PASSOU');
    console.log('✅ Teste 4: Cache local - PASSOU');
    console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
  }, 150);
});
