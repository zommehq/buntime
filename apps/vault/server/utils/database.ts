/**
 * Processa e normaliza uma string de conexão de banco de dados.
 * - Se for uma URL válida (ex: postgresql://...), normaliza removendo query params
 * - Se for um path (ex: ./pg_data), retorna como está
 *
 * @param value - String de conexão ou path
 * @returns String processada (URL normalizada ou path as-is)
 */
export const parseDatabaseUrl = (value?: string): string | undefined => {
  if (!value) return undefined;

  try {
    return new URL(value).href.split("?")[0];
  } catch {
    return value;
  }
};

/**
 * Verifica se o valor fornecido é uma URL válida (ex: postgresql://...)
 * ou um caminho de filesystem (ex: ./pg_data, /var/data/db)
 *
 * @param value - String a ser verificada
 * @returns true se for uma URL válida, false se for um path
 */
export const isDatabaseUrl = (value?: string): boolean => {
  if (!value) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};
