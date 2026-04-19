# 🔧 SOLUÇÃO: Prévia de Transações Vazia

## Problema

A tabela "Prévia das transações estruturadas" está vazia mesmo depois de fazer upload de PDFs.

```
Nenhuma transação estruturada ainda para esta apuração.
```

## Causa

O pipeline de extração (que processa os PDFs e gera as transações) ainda não foi completamente implementado ou não finalizou o processamento dos arquivos.

## 3 Soluções

### Solução 1: Aguardar o Pipeline (Se implementado)

Se o pipeline de extração já existe no seu projeto:

1. Vá para `/app/apuracoes/{id}/arquivos`
2. Verifique o status de processamento de cada PDF
3. Aguarde até que todos os PDFs mostrem ✅ "Processado"
4. Volte para `/app/apuracoes/{id}/upload`
5. A tabela de prévia vai popular automaticamente

**Tempo esperado:** 30s a 2 min por PDF, dependendo do tamanho

---

### Solução 2: Popular Dados de Teste (Recomendado para dev local)

Para testar a Etapa 5 (Review Workspace) localmente sem esperar o pipeline:

#### Passo 1: Usar o script seed

```bash
# Instalar ts-node se necessário
npm install -D ts-node

# Popular com dados de teste
npx ts-node scripts/seed-test-transactions.ts <APURACAO_ID>

# Exemplo real:
npx ts-node scripts/seed-test-transactions.ts 550e8400-e29b-41d4-a716-446655440000
```

**O que ele faz:**
- Insere 7 transações de teste
- 4 créditos + 3 débitos
- Total: R$ 22.250,25
- Status: Todas processadas e prontas para revisar

#### Passo 2: Recarregar a página

```
GET /app/apuracoes/{id}/upload
```

Agora você vai ver:

```
Data     | Mês/Ano | Descrição               | Direção | Valor      | Confiança | Duplicada
---------|---------|------------------------|---------|------------|-----------|----------
03/04    | 04/2025 | Transferência bancária  | Crédito | R$ 5.000  | 95%       | Não
03/04    | 04/2025 | Saque em caixa eletrônico| Débito | R$ 500    | 92%       | Não
...
```

---

### Solução 3: Implementar o Pipeline (Para produção)

Se o pipeline de extração não existe ainda, você vai precisar:

1. **Criar handler de processamento de PDF**
   ```typescript
   // src/lib/pdf-processing/extract-transactions.ts
   export async function extractTransactionsFromPdf(filePath: string): Promise<Transaction[]> {
     // Implementar extração usando pdfjs ou similar
   }
   ```

2. **Criar job queue (Bull/RabbitMQ/AWS SQS)**
   ```typescript
   // src/lib/queues/process-statement-file.ts
   export async function enqueueStatementFileProcessing(fileId: string)
   ```

3. **Implementar API route para webhook de conclusão**
   ```typescript
   // src/app/api/apuracoes/[id]/process-statement-file/route.ts
   ```

Vide documentação de Etapa 2 para detalhes completos.

---

## ✅ Verificar se Funcionou

### Teste Local (após seed)

```bash
# 1. Popular dados
npx ts-node scripts/seed-test-transactions.ts <seu-apuracao-id>

# 2. Abrir no navegador
http://localhost:3000/app/apuracoes/<seu-apuracao-id>/upload

# 3. Verificar
- Tabela "Prévia das transações estruturadas" mostra 7 linhas ✅
- Valores corretos: R$ 5.000, R$ 500, etc ✅
- Status 100% processado ✅
```

### Teste em Produção

```bash
# 1. Deploy com pipeline implementado
vercel --prod

# 2. Upload PDF normalmente via UI
# Interface: POST /api/apuracoes/{id}/statement-files

# 3. Aguardar processamento
# Verificar em /app/apuracoes/{id}/arquivos

# 4. Tabela preenche automaticamente após ~2 min
```

---

## 🧪 Testar Etapa 5 com Dados Seed

Agora que a tabela tem dados, você pode testar a **Etapa 5 completa** (Review Workspace):

1. **Populate transactions** (seed)
   ```bash
   npx ts-node scripts/seed-test-transactions.ts <apuracao-id>
   ```

2. **Go to review page**
   ```
   http://localhost:3000/app/apuracoes/<apuracao-id>/revisao
   ```

3. **Test P0-P4:**
   - ✅ P0: Autosave - Digita observação → aguarda 500ms → vê "Salvo"
   - ✅ P1: Validações - Seleciona 50 items → clica "Aplicar"
   - ✅ P3: Performance - Scroll em múltiplas linhas → 60fps fluido
   - ✅ P4: UX - Pressiona M/E/P → decisão muda instantaneamente

---

## 📊 Dados do Script Seed

O script insere:

```json
{
  "transações": 7,
  "créditos": 4,
  "débitos": 3,
  "total_creditado": "R$ 17.250,25",
  "total_debitado": "R$ 5.000,00",
  "saldo_net": "R$ 12.250,25",
  "período": "Abril/2025",
  "confiança_média": "94%"
}
```

Todos com status processado (confidence > 85%).

---

## 🚨 Troubleshooting

### Erro: "SUPABASE_SERVICE_ROLE_KEY não configurada"

```bash
# Verificar .env.local
cat .env.local | grep SUPABASE

# Ou definir localmente
export SUPABASE_SERVICE_ROLE_KEY="sua-chave-aqui"
npx ts-node scripts/seed-test-transactions.ts <id>
```

### Erro: "Apuração não encontrada"

Usar um ID de apuração válido que existe no banco:

```bash
# Ver apurações existentes no Supabase
# Dashboard → apuracoes table → copiar ID

npx ts-node scripts/seed-test-transactions.ts 550e8400-e29b-41d4-a716-446655440000
```

### Transações já existem

Se o script disser "Já existem X transações", significa que a apuração já foi populada. Deletar as antigas e rodar novamente:

```sql
-- No Supabase SQL
DELETE FROM transactions WHERE apuracao_id = 'seu-id-aqui';
DELETE FROM transaction_reviews WHERE apuracao_id = 'seu-id-aqui';
```

Depois rodar o script novamente.

---

## 🎯 Recomendação

Para testar a **Etapa 5 (Review Workspace) completa** localmente:

```bash
# 1. Seed com dados de teste
npx ts-node scripts/seed-test-transactions.ts <seu-apuracao-id>

# 2. Abrir em localhost
npm run dev
# http://localhost:3000/app/apuracoes/<id>/revisao

# 3. Testar todos os P0-P4
# Vide GUIA_VISUAL_FINAL.md para checklist completo
```

Assim você não depende do pipeline e pode validar toda a Etapa 5 imediatamente.

---

**Status:** ✅ Solução pronta  
**Data:** 19/04/2026  
**Próximo:** Usar seed + testar Etapa 5
