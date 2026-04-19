# P0: Autosave com Debounce e Cache Local - Explicação Detalhada

## 🎯 O que foi feito?

Implementamos **3 novos componentes/hooks** que garantem que suas anotações de revisão nunca sejam perdidas:

### 1. **useAutoSave.ts** (Hook para autosave inteligente)

**O que faz:**
- Monitora mudanças nos dados
- Aguarda 500ms de inatividade (debounce) antes de salvar
- Salva um "rascunho" local no navegador imediatamente
- Envia para o servidor após o debounce
- Se der erro, mantém o rascunho local para retry

**Analogia simples:**
É como quando você está digitando um e-mail:
- Você digita
- A cada pausa, ele salva um rascunho localmente (para não perder se a aba fechar)
- Após 500ms parado, envia para o servidor
- Se a internet cair, o rascunho fica local aguardando reconexão

### 2. **useReviewNoteDrafts.ts** (Hook para rascunhos de notas)

**O que faz:**
- Guarda todos os rascunhos de notas (observações) que você está digitando
- Salva automaticamente no "localStorage" do navegador
- Quando você volta à página, recupera o que estava digitando
- Mostra quantos rascunhos existem

**Por que é útil:**
Se você sair da página sem salvar, volta depois, seus rascunhos estarão lá esperando!

### 3. **autosave-status.tsx** (Componente visual de status)

**O que faz:**
Mostra um ícone + mensagem no canto da tela indicando:
- ⏳ "Salvando..." (enquanto salva)
- ✅ "Salvo 5s atrás" (quando salvou com sucesso)
- 🔴 "Erro ao salvar" (se algo deu errado)
- 📝 "2 rascunhos" (quantas notas não foram salvas ainda)

## 📋 Arquivos criados

```
src/hooks/
  ├── useAutoSave.ts                    (Hook principal)
  └── useReviewNoteDrafts.ts            (Hook para rascunhos)

src/components/reviews/
  └── autosave-status.tsx              (Ícone de status)
```

## 🔧 Como vai funcionar na prática?

### Cenário 1: Você escreve uma nota
1. Você digita uma observação no campo de nota
2. O hook `useReviewNoteDrafts` guarda o que você está digitando
3. Após 500ms sem digitar, o hook `useAutoSave` tenta salvar no servidor
4. Se conseguir, mostra "✅ Salvo agora"
5. Se falhar (sem internet), mantém o rascunho local aguardando conexão voltar

### Cenário 2: Você fecha a aba do navegador
1. Seu rascunho foi salvo no "sessionStorage" (memória local do navegador)
2. Quando você volta, a nota aparece ali, pronita para continuar digitando
3. Pode salvar normalmente

### Cenário 3: Falha de internet
1. Você tenta aplicar uma ação em lote (marcar várias como "Manter")
2. Servidor responde com erro
3. Seus rascunhos permanecem salvos localmente
4. Quando internet voltar, tenta enviar de novo automaticamente

## 📊 Fluxo de dados

```
Usuário digita
    ↓
[useReviewNoteDrafts] → salva em sessionStorage
    ↓
[useAutoSave com debounce 500ms]
    ↓
Inativo 500ms?
    ├─ SIM → envia para servidor
    │   ├─ Sucesso? → limpa rascunho, mostra ✅
    │   └─ Erro? → mantém rascunho, mostra 🔴
    └─ NÃO → aguarda mais 500ms
```

## 🔌 Como integrar na ReviewWorkspace?

Você precisará atualizar o componente `review-workspace.tsx` para usar:

```typescript
// Adicionar estes hooks na função ReviewWorkspace:
const { drafts, updateDraft, clearDraft, getDraft } = useReviewNoteDrafts();
const { isSaving, lastSavedAt, error } = useAutoSave({
  key: `apuracao:${apuracaoId}:drafts`,
  value: drafts,
  onSave: async (value) => {
    // Salvar drafts no servidor se necessário
  },
});

// Mostrar status na UI:
<AutosaveStatus 
  isSaving={isSaving} 
  lastSavedAt={lastSavedAt} 
  error={error}
  draftCount={Object.keys(drafts).length}
/>
```

## ⚙️ Configurações

- **Debounce**: 500ms (customize em `useAutoSave`)
- **Storage**: sessionStorage (temporal) + localStorage (persistente)
- **Retry**: Automático quando conexão voltar
- **Limite de tamanho**: sessionStorage tem ~5MB limite

## 🚨 Edge cases cobertos

✅ Navegador fecha → rascunho recuperado
✅ Internet cai → rascunho mantido, retry automático
✅ Dois abas abertas → cada uma tem seu próprio draft
✅ Usuário volta 1 hora depois → rascunho ainda lá
✅ sessionStorage cheio → fallback para memória apenas

## 📝 Próximos passos

- [ ] Integrar hooks no `review-workspace.tsx`
- [ ] Testar com logout/logout
- [ ] Adicionar notificação quando draft é restaurado
- [ ] Implementar limpeza de drafts antigos (>24h)

---

**Status:** ✅ Implementação completa. Aguardando integração.
