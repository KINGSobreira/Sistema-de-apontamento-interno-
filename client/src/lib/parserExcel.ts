// ============================================
// Controle de Extras — Parser de planilhas Excel
// ============================================
// Lê a primeira aba, detecta o cabeçalho e mapeia colunas
// automaticamente para os campos internos (com sinônimos).
// ============================================

import * as XLSX from "xlsx";
import type { RegistroImportado } from "./types";
import { parseNumeroBR, dataParaISO, gerarChaveRegistro, normalizarTexto, classificacaoPorValor } from "./utils";

export interface ColunaMapeada {
  coluna: string; // nome encontrado no Excel
  campo: string; // campo interno
}

export interface ResultadoExcel {
  filial: string;
  registros: RegistroImportado[];
  colunas: string[];
  mapeamento: ColunaMapeada[];
  totalQtd: number;
  totalValor: number;
  avisos: string[];
}

// Sinônimos de colunas -> campo interno
const MAPA_CAMPOS: Record<string, string[]> = {
  data: ["DATA DA COBERTURA", "DATA", "DT COBERTURA"],
  dataInput: ["DATAINPUT", "DATA INPUT", "DATA DO LANCAMENTO", "DATA LANCAMENTO", "DT INPUT"],
  usuario: ["USUARIO", "USUÁRIO", "USER", "RESPONSAVEL", "RESPONSÁVEL"],
  codigoSubstituto: ["MAT.SUBSTITUTO", "MAT SUBSTITUTO", "MATRICULA SUBSTITUTO", "COD SUBSTITUTO"],
  substituto: ["NOME SUBSTITUTO", "SUBSTITUTO"],
  codigoColaborador: ["MAT.TITULAR", "MAT TITULAR", "MATRICULA TITULAR", "COD TITULAR", "MAT.SUBSTITUIDO"],
  colaborador: ["NOME TITULAR", "TITULAR", "SUBSTITUIDO", "NOME SUBSTITUIDO", "COLABORADOR"],
  motivo: ["MOTIVO DA COBERTURA", "MOTIVO"],
  quantidade: ["QTD. HORAS", "QTD HORAS", "QUANTIDADE", "QTD", "HORAS"],
  valorUnitario: ["VALOR DA HORA", "VALOR UNITARIO", "VALOR UNITÁRIO", "VL HORA"],
  valorTotal: ["SUB TOTAL", "SUBTOTAL", "VALOR TOTAL"],
  vt: ["VT"],
  va: ["VA"],
  totalGeral: ["TOTAL"],
  tipoCobertura: ["TIPO DE COBERTURA", "TIPO COBERTURA"],
  provento: ["PROVENTO"],
  codigoPosto: ["CD.LOCAL", "CD LOCAL", "COD LOCAL", "CODIGO LOCAL", "CÓD LOCAL"],
  posto: ["LOCAL DA COBERTURA", "LOCAL", "POSTO"],
  observacao: ["OBSERVAÇÃO", "OBSERVACAO", "OBS"],
  filial: ["FILIAL"],
  numeroCobertura: ["Nº COBERTURA", "NO COBERTURA", "NUM COBERTURA", "N COBERTURA"],
};

function detectarCampo(nomeColuna: string): string | null {
  const norm = normalizarTexto(nomeColuna);
  for (const [campo, sinonimos] of Object.entries(MAPA_CAMPOS)) {
    for (const s of sinonimos) {
      if (norm === normalizarTexto(s)) return campo;
    }
  }
  // tentativa por inclusão
  for (const [campo, sinonimos] of Object.entries(MAPA_CAMPOS)) {
    for (const s of sinonimos) {
      if (norm.includes(normalizarTexto(s))) return campo;
    }
  }
  return null;
}

function formatarDataExcel(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    // data serial do Excel
    const data = XLSX.SSF.parse_date_code(valor);
    if (data) {
      return `${String(data.d).padStart(2, "0")}/${String(data.m).padStart(2, "0")}/${data.y}`;
    }
  }
  const s = String(valor).trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`;
  return s;
}

export async function processarExcel(
  file: File,
  classificacoes: { codigo: number; valor: number }[]
): Promise<ResultadoExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  const avisos: string[] = [];
  if (linhas.length < 2) {
    return { filial: "Não informado", registros: [], colunas: [], mapeamento: [], totalQtd: 0, totalValor: 0, avisos: ["Planilha vazia ou sem dados."] };
  }

  // Cabeçalho = primeira linha
  const cabecalho = (linhas[0] as unknown[]).map((c) => String(c).trim());
  const mapeamento: ColunaMapeada[] = [];
  const indiceCampo: Record<string, number> = {};

  cabecalho.forEach((nome, idx) => {
    const campo = detectarCampo(nome);
    if (campo && indiceCampo[campo] === undefined) {
      indiceCampo[campo] = idx;
      mapeamento.push({ coluna: nome, campo });
    }
  });

  if (indiceCampo.data === undefined) {
    avisos.push("Coluna de DATA não identificada automaticamente.");
  }

  const registros: RegistroImportado[] = [];
  let filial = "Não informado";

  const get = (linha: unknown[], campo: string): string => {
    const idx = indiceCampo[campo];
    if (idx === undefined) return "";
    const v = linha[idx];
    return v === null || v === undefined ? "" : String(v).trim();
  };

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i] as unknown[];
    if (!linha || linha.every((c) => String(c).trim() === "")) continue;

    const data = formatarDataExcel(
      indiceCampo.data !== undefined ? linha[indiceCampo.data] : ""
    );
    if (!data || !data.includes("/")) continue; // pula linhas sem data válida

    const dataInput = formatarDataExcel(
      indiceCampo.dataInput !== undefined ? linha[indiceCampo.dataInput] : ""
    );

    const filialLinha = get(linha, "filial").replace(/\s+/g, " ").trim();
    if (filialLinha && filial === "Não informado") filial = filialLinha;

    const valorUnitario = parseNumeroBR(get(linha, "valorUnitario"));
    const quantidade = parseNumeroBR(get(linha, "quantidade"));
    const subTotal = parseNumeroBR(get(linha, "valorTotal"));
    const vt = parseNumeroBR(get(linha, "vt"));
    const va = parseNumeroBR(get(linha, "va"));
    const totalGeral = parseNumeroBR(get(linha, "totalGeral")) || subTotal + vt + va;

    // Motivo: remove prefixo de código "XXX - "
    let motivo = get(linha, "motivo") || "Não informado";
    const mMotivo = motivo.match(/^[A-Z0-9]{2,4}\s*-\s*(.+)$/);
    if (mMotivo) motivo = mMotivo[1].trim();

    const classificacao = classificacaoPorValor(valorUnitario, classificacoes);

    const reg: RegistroImportado = {
      chave: "",
      data,
      dataISO: dataParaISO(data),
      dataInput: dataInput || undefined,
      dataInputISO: dataInput ? dataParaISO(dataInput) : undefined,
      filial: filialLinha || filial,
      codigoFilial: (filialLinha || filial).split(" - ")[0] || "",
      substituto: get(linha, "substituto") || "Não informado",
      codigoSubstituto: get(linha, "codigoSubstituto"),
      colaborador: get(linha, "colaborador") || "Não informado",
      codigoColaborador: get(linha, "codigoColaborador"),
      posto: get(linha, "posto") || "Não informado",
      codigoPosto: get(linha, "codigoPosto"),
      motivo,
      classificacao,
      quantidade,
      valorUnitario,
      valorTotal: subTotal,
      vt,
      va,
      totalGeral,
      usuario: get(linha, "usuario") || undefined,
      observacao: get(linha, "observacao") || undefined,
      revisaoNecessaria: classificacao === 0,
    };
    reg.chave = gerarChaveRegistro(reg);
    registros.push(reg);
  }

  const totalQtd = registros.reduce((s, r) => s + r.quantidade, 0);
  const totalValor = registros.reduce((s, r) => s + r.totalGeral, 0);

  return { filial, registros, colunas: cabecalho, mapeamento, totalQtd, totalValor, avisos };
}
