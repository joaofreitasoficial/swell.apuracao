/**
 * Script para popular dados de teste de transações
 * Útil para testar a Etapa 5 localmente
 *
 * Uso: npx ts-node scripts/seed-test-transactions.ts <apuracao-id>
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variáveis SUPABASE não configuradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const apuracaoId = process.argv[2];

if (!apuracaoId) {
  console.error("❌ Use: npx ts-node scripts/seed-test-transactions.ts <apuracao-id>");
  process.exit(1);
}

async function seedTransactions() {
  console.log(`🌱 Populando transações de teste para apuração: ${apuracaoId}`);

  const testTransactions = [
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-1",
      bank_name: "Itaú",
      account_label: "Conta Corrente",
      transaction_date: "2025-04-03",
      month_ref: 4,
      year_ref: 2025,
      description: "Transferência bancária",
      amount: 5000.00,
      direction: "credit" as const,
      extraction_confidence: 0.95,
      original_text: "TRF Itaú 5000",
      transaction_hash: "hash-1",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-1",
      bank_name: "Itaú",
      account_label: "Conta Corrente",
      transaction_date: "2025-04-03",
      month_ref: 4,
      year_ref: 2025,
      description: "Saque em caixa eletrônico",
      amount: 500.00,
      direction: "debit" as const,
      extraction_confidence: 0.92,
      original_text: "SAQ CAI 500",
      transaction_hash: "hash-2",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-1",
      bank_name: "Itaú",
      account_label: "Conta Corrente",
      transaction_date: "2025-04-04",
      month_ref: 4,
      year_ref: 2025,
      description: "Depósito de clientes",
      amount: 10000.00,
      direction: "credit" as const,
      extraction_confidence: 0.98,
      original_text: "DEP CLI 10000",
      transaction_hash: "hash-3",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-1",
      bank_name: "Itaú",
      account_label: "Conta Corrente",
      transaction_date: "2025-04-05",
      month_ref: 4,
      year_ref: 2025,
      description: "Pagamento de fornecedor",
      amount: 3500.50,
      direction: "debit" as const,
      extraction_confidence: 0.89,
      original_text: "PAG FOR 3500.50",
      transaction_hash: "hash-4",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-2",
      bank_name: "Caixa",
      account_label: "Poupança",
      transaction_date: "2025-04-06",
      month_ref: 4,
      year_ref: 2025,
      description: "Rendimento de poupança",
      amount: 250.75,
      direction: "credit" as const,
      extraction_confidence: 0.99,
      original_text: "REND POU 250.75",
      transaction_hash: "hash-5",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-2",
      bank_name: "Caixa",
      account_label: "Poupança",
      transaction_date: "2025-04-07",
      month_ref: 4,
      year_ref: 2025,
      description: "Transferência entre contas",
      amount: 2000.00,
      direction: "credit" as const,
      extraction_confidence: 0.96,
      original_text: "TRF INT 2000",
      transaction_hash: "hash-6",
      is_duplicate: false,
    },
    {
      apuracao_id: apuracaoId,
      statement_file_id: "test-file-2",
      bank_name: "Caixa",
      account_label: "Poupança",
      transaction_date: "2025-04-08",
      month_ref: 4,
      year_ref: 2025,
      description: "Saque de poupança",
      amount: 1500.00,
      direction: "debit" as const,
      extraction_confidence: 0.91,
      original_text: "SAQ POU 1500",
      transaction_hash: "hash-7",
      is_duplicate: false,
    },
  ];

  try {
    // Checar se já existem transações
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("apuracao_id", apuracaoId);

    if (count && count > 0) {
      console.log(`⚠️  Já existem ${count} transações. Pulando seed.`);
      return;
    }

    // Inserir transações
    const { error } = await supabase
      .from("transactions")
      .insert(testTransactions);

    if (error) {
      console.error("❌ Erro ao inserir transações:", error.message);
      process.exit(1);
    }

    console.log(`✅ ${testTransactions.length} transações inseridas com sucesso!`);
    console.log(`\n📊 Resumo:`);
    console.log(`   - Créditos: ${testTransactions.filter((t) => t.direction === "credit").length}`);
    console.log(`   - Débitos: ${testTransactions.filter((t) => t.direction === "debit").length}`);
    console.log(`   - Total: R$ ${testTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

seedTransactions();
