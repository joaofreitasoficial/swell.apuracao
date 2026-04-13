import { EmptyState } from "@/components/shared/empty-state";
import { ExcelTemplatesTable } from "@/components/super-admin/excel-templates-table";
import { ExcelTemplateUploadCard } from "@/components/super-admin/excel-template-upload-card";
import { listExcelTemplates } from "@/lib/operations/queries";

export default async function SuperAdminTemplatesPage() {
  const templates = await listExcelTemplates();

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <ExcelTemplateUploadCard />
      {templates.length > 0 ? (
        <ExcelTemplatesTable templates={templates} />
      ) : (
        <EmptyState
          title="Nenhum template cadastrado"
          description="Envie o primeiro modelo Excel para liberar a etapa final de geracao da apuracao."
        />
      )}
    </div>
  );
}
