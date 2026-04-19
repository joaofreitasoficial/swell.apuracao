# P1: Validações e Retry Automático - Explicação Detalhada

## 🎯 O que foi feito?

Implementamos **5 novos componentes/hooks + 1 validação** que garantem:
1. ✅ Ações em lote seguras (não deixa fazer coisas perigosas)
2. 🔄 Retry automático se a internet falhar
3. 💾 Persistência de aba ativa (volta aonde estava)
4. ⚠️ Avisos claros sobre grandes seleções
5. 📊 Indicadores de progresso

---

## 📋 Arquivos criados

```
src/hooks/
  ├── useRetry.ts                       (Retry com exponential backoff)
  ├── usePersistedTab.ts                (Persistir aba ativa)
  └── useBatchActionWithRetry.ts        (Integração de retry para batch)

src/lib/validations/
  └── batch-actions.ts                  (Validações de ação em lote)

src/components/reviews/
  ├── batch-action-validator.tsx        (Alerta de validação)
  └── retry-indicator.tsx               (Indicador de retry)
```

---

## 🔧 Como cada peça funciona?

### 1. **useRetry.ts** - Retry com Backoff Exponencial

**O que faz:**
- Tenta executar uma ação 3 vezes
- Se falhar, aguarda um tempo antes de tentar de novo
- A cada falha, aguarda mais tempo (1s → 2s → 4s)
- Se falhar 3 vezes, desiste e mostra erro

**Analogia:**
É como ligar para uma pessoa:
- Primeira vez: toca a campainha
- Ninguém atende: aguarda 1 segundo
- Segunda vez: toca de novo (agora aguarda 2s)
- Terceira vez: agora sim falha e você desiste

**Código de uso:**
```typescript
const { execute } = useRetry({ maxAttempts: 3 });

await execute(async () => {
  const response = await fetch('/api/save', { method: 'POST' });
  if (!response.ok) throw new Error('Falha');
  return response.json();
});
```

### 2. **usePersistedTab.ts** - Persistência de Aba Ativa

**O que faz:**
- Guarda qual aba você estava vendo (Pendentes, Mantidas, etc)
- Quando você volta à página, abre a mesma aba
- Se você mudar de aba, salva a mudança

**Benefício prático:**
Você estava na aba "Excluídas" → sai da página → volta depois → Aba "Excluídas" se abre automaticamente (em vez de voltar para "Pendentes")

**Código de uso:**
```typescript
const { activeTab, changeTab } = usePersistedTab({
  key: 'apuracao-review',
  defaultTab: 'pendentes',
});

// Quando mudar de aba:
<button onClick={() => changeTab('mantidas')}>
  Mantidas
</button>
```

### 3. **batch-actions.ts** - Validações

**O que valida:**
✅ Pode fazer? (1-100 transações = OK)
⚠️ Aviso? (101-1000 = OK mas lento)
❌ Erro? (0 ou >1000 = bloqueado)

**Limites:**
- **Soft limit**: 100 transações (recomendado)
- **Hard limit**: 1000 transações (máximo)
- **Nota máxima**: 1000 caracteres

**Código de uso:**
```typescript
const validation = validateBatchSelection(['id1', 'id2', 'id3']);

if (!validation.valid) {
  toast.error(validation.error); // "Máximo 1000 transações"
}
if (validation.warning) {
  toast.warning(validation.warning); // "Selecionou 500, pode ser lento"
}
```

### 4. **useBatchActionWithRetry.ts** - Integração

Combina retry + batch validation para aplicar ações em lote de forma robusta.

**O que faz:**
1. Valida se a seleção é segura
2. Tenta fazer a ação
3. Se falhar por rede, tenta de novo (até 3x)
4. Mostra progresso ao usuário

**Código de uso:**
```typescript
const { executeAction, isExecuting, error } = useBatchActionWithRetry({
  onSuccess: () => toast.success('Sucesso!'),
  onRetryAttempt: (attempt) => {
    console.log(`Tentativa ${attempt}/3`);
  },
});

const handleApplyBatch = async () => {
  await executeAction(async () => {
    const response = await fetch('/api/batch-review', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds, decision: 'manter' }),
    });
    if (!response.ok) throw new Error('Falha');
  });
};
```

### 5. **batch-action-validator.tsx** - Componente Visual

Mostra alertas tipo:
```
❌ "Selecione pelo menos 1 transação"
❌ "Máximo 1000 transações por ação"
⚠️ "Você selecionou 500 transações. Isso pode ser lento."
```

### 6. **retry-indicator.tsx** - Indicador de Progresso

Mostra enquanto tenta:
```
🔄 Tentando novamente... (tentativa 2/3)
❌ Erro: Sem internet. [Tentar novamente]
```

---

## 📊 Fluxo completo de ação em lote

```
Usuário seleciona 50 transações
    ↓
[validateBatchSelection] → ✅ Válido
    ↓
Usuário clica "Aplicar decisão: Manter"
    ↓
[useBatchActionWithRetry.executeAction]
    ├─ Tentativa 1: POST /api/batch-review
    │  └─ Erro: timeout
    ├─ Aguarda 1s
    ├─ Tentativa 2: POST /api/batch-review
    │  └─ Erro: 500 (servidor down)
    ├─ Aguarda 2s
    ├─ Tentativa 3: POST /api/batch-review
    │  └─ ✅ Sucesso!
    ↓
[Toast] "Ação aplicada a 50 transações!"
[RetryIndicator] desaparece
```

---

## 🚨 Cenários de uso

### Cenário 1: Usuário seleciona 2000 transações
```
❌ Aviso: "Máximo 1000 transações"
→ Usuário não consegue aplicar ação
→ Deve fazer em duas rodadas
```

### Cenário 2: Internet falha durante ação em lote
```
⚠️ "Tentando novamente... (tentativa 1/3)"
⏳ 1s de espera...
⚠️ "Tentando novamente... (tentativa 2/3)"
⏳ 2s de espera...
✅ "Sucesso! Ação aplicada a 100 transações"
```

### Cenário 3: Usuário sai da página e volta
```
Estava na aba "Excluídas"
    ↓ (fecha navegador)
    ↓ (volta depois)
Aba "Excluídas" se abre automaticamente
```

### Cenário 4: Usuário quer desfazer
```
Aplica "Manter" para 30 transações
    ↓ (aviso de retry aparece)
    ↓ (clica "Tentar novamente")
Tenta de novo automaticamente
```

---

## 🔌 Como integrar na ReviewWorkspace?

Você precisará adicionar ao `review-workspace.tsx`:

```typescript
import { validateBatchSelection } from '@/lib/validations/batch-actions';
import { BatchActionValidator } from '@/components/reviews/batch-action-validator';
import { RetryIndicator } from '@/components/reviews/retry-indicator';
import { useBatchActionWithRetry } from '@/hooks/useBatchActionWithRetry';
import { usePersistedTab } from '@/hooks/usePersistedTab';

export function ReviewWorkspace(...) {
  // Persistir aba ativa
  const { activeTab, changeTab } = usePersistedTab({
    key: `apuracao:${apuracaoId}:tab`,
    defaultTab: 'pendentes',
  });

  // Retry para ações em lote
  const { executeAction, isExecuting, error } = useBatchActionWithRetry({
    onSuccess: () => toast.success('Ação aplicada!'),
  });

  // Validar antes de aplicar
  const handleApplyBatch = async () => {
    const validation = validateBatchSelection(selectedTransactionIds);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    if (validation.warning) {
      toast.warning(validation.warning);
    }

    await executeAction(() => persistBatchReview({
      transactionIds: selectedTransactionIds,
      decision: batchDecision,
      exclusionReason: batchReason || null,
      reviewNote: batchNote || null,
    }));
  };

  return (
    <>
      <BatchActionValidator selectedCount={selectedTransactionIds.length} />
      <RetryIndicator isRetrying={isExecuting} error={error} />
      
      {/* Abas com persistência */}
      <div className="tabs">
        {(['pendentes', 'mantidas', 'excluidas', 'consolidado', 'logs'] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => changeTab(tab)}
              className={activeTab === tab ? 'active' : ''}
            >
              {getTabLabel(tab)}
            </button>
          ),
        )}
      </div>
    </>
  );
}
```

---

## ✅ O que mudou para melhor?

| Antes | Depois |
|-------|--------|
| ❌ Seleção de 5000 transações podia travar | ✅ Máximo 1000, com aviso em 100+ |
| ❌ Falha de rede = perde tudo | ✅ Tenta 3x automaticamente |
| ❌ Volta à página = aba volta ao padrão | ✅ Abre aba anterior |
| ❌ Sem feedback durante retry | ✅ Mostra "Tentativa 2/3" |
| ❌ Sem como saber que salvou | ✅ Toast + indicador visual |

---

## 📝 Próximos passos

- [ ] Integrar hooks no `review-workspace.tsx`
- [ ] Testar com conexão lenta/instável
- [ ] Adicionar confirmação antes de ações >500 itens
- [ ] Implementar "Cancelar" durante retry

---

**Status:** ✅ Implementação completa. Aguardando integração.
