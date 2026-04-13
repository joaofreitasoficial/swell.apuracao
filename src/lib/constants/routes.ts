export const routes = {
  home: "/",
  login: "/login",
  unauthorized: "/unauthorized",
  updatePassword: "/auth/update-password",
  authCallback: "/auth/callback",
  app: "/app",
  clients: "/app/clientes",
  newClient: "/app/clientes/novo",
  superAdmin: "/super-admin",
  superAdminUsers: "/super-admin/users",
  superAdminTemplates: "/super-admin/templates",
} as const;

export const protectedRoutePrefixes = [routes.app, routes.superAdmin] as const;

export const appRouteBuilders = {
  client: (clientId: string) => `${routes.clients}/${clientId}`,
  clientApuracoes: (clientId: string) => `${routes.clients}/${clientId}/apuracoes`,
  apuracao: (apuracaoId: string) => `/app/apuracoes/${apuracaoId}`,
  apuracaoUpload: (apuracaoId: string) => `/app/apuracoes/${apuracaoId}/upload`,
  apuracaoArquivos: (apuracaoId: string) => `/app/apuracoes/${apuracaoId}/arquivos`,
  apuracaoReview: (apuracaoId: string) => `/app/apuracoes/${apuracaoId}/revisao`,
  apuracaoConsolidado: (apuracaoId: string) =>
    `/app/apuracoes/${apuracaoId}/consolidado`,
  apuracaoExcel: (apuracaoId: string) => `/app/apuracoes/${apuracaoId}/excel`,
} as const;
