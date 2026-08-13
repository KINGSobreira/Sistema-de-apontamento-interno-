// ============================================
// Controle de Extras — Tipos centrais do domínio
// ============================================

export type PerfilUsuario = "admin" | "conferencia";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  criadoEm: string; // ISO
  ultimoAcesso?: string; // ISO
}

export type StatusPagamento = "pendente" | "conferido" | "pago" | "divergencia";

export type OrigemRegistro = "pdf" | "excel" | "pdf_excel";

export interface Extra {
  id: string;
  chave: string; // chave composta de duplicidade
  data: string; // dd/mm/aaaa
  dataISO: string; // aaaa-mm-dd (para ordenação/filtro)
  dataInput?: string; // dd/mm/aaaa — data do lançamento
  dataInputISO?: string;
  filial: string;
  codigoFilial?: string;
  substituto: string;
  codigoSubstituto?: string;
  colaborador: string; // substituído / titular
  codigoColaborador?: string;
  posto: string; // local da cobertura
  codigoPosto?: string;
  motivo: string;
  classificacao: number; // 1..4
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  vt: number;
  va: number;
  totalGeral: number;
  usuario?: string; // usuário que lançou (Excel)
  origem: OrigemRegistro;
  arquivoOrigem: string;
  importacaoId: string;
  importadoEm: string; // ISO
  status: StatusPagamento;
  observacao?: string;
  revisaoNecessaria?: boolean;
  // dados de cruzamento
  divergencias?: string[]; // descrições de divergências encontradas
  diasParaLancamento?: number;
}

export interface Classificacao {
  codigo: number;
  local: string;
  periodo: string;
  descricao: string;
  valor: number;
}

export interface RegrasAtraso {
  atencaoMin: number; // dias
  atrasoMin: number; // dias
}

export interface Configuracoes {
  classificacoes: Classificacao[];
  regrasAtraso: RegrasAtraso;
  dataInicioAcompanhamento: string; // ISO — 2026-05-22
}

export interface Importacao {
  id: string;
  dataImportacao: string; // ISO
  arquivo: string;
  tipo: "pdf" | "excel";
  filial: string;
  periodo: string;
  quantidadeRegistros: number;
  quantidadeNovos: number;
  quantidadeDuplicados: number;
  quantidadeDivergencias: number;
  valorTotal: number;
  quantidadeTotal: number;
  usuarioResponsavel: string;
}

export interface LogAuditoria {
  id: string;
  usuario: string;
  usuarioId: string;
  dataHora: string; // ISO
  acao: string;
  modulo: string;
  ip?: string;
}

export interface RegistroImportado extends Omit<Extra, "id" | "importadoEm" | "status" | "importacaoId" | "arquivoOrigem" | "origem"> {
  situacao?: string;
}

export interface ResultadoConferencia {
  coincidentes: number;
  somentePdf: RegistroImportado[];
  somenteExcel: RegistroImportado[];
  divergenciaValor: Divergencia[];
  divergenciaQuantidade: Divergencia[];
  divergenciaClassificacao: Divergencia[];
}

export interface Divergencia {
  tipo: "valor" | "quantidade" | "classificacao";
  descricao: string;
  colaborador: string;
  data: string;
  posto: string;
  valorPdf?: number;
  valorExcel?: number;
  diferenca?: number;
  registroPdf: RegistroImportado;
  registroExcel: RegistroImportado;
}

export interface FiltrosGlobais {
  dataInicial?: string;
  dataFinal?: string;
  mes?: number;
  ano?: number;
  filial?: string;
  posto?: string;
  colaborador?: string;
  substituto?: string;
  motivo?: string;
  classificacao?: number;
  status?: StatusPagamento | "";
}
