// ============================================
// Controle de Extras — Parser PDF (Mapa de Cobertura)
// Suporta TODAS as filiais e TODOS os períodos
// ============================================

import * as pdfjsLib from "pdfjs-dist";
import type { RegistroImportado } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ---- Regexes ----

// Aceita qualquer data no formato DD/MM/AAAA
const RE_DATA = /^(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.*)$/;
const RE_SUBSTITUTO = /^SUBSTITUTO\s*:\s*(\d+)\s*-\s*(.+)$/;
const RE_FILIAL = /FILIAL\s*:\s*(\d+)\s*-\s*(.+?)(?:PERÍODO|$)/;
const RE_PERIODO = /PERÍODO\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/;
const RE_TOTAL_GERAL = /TOTAL GERAL\s+(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;

// Aceita vários formatos de código de local
const RE_CODIGO_LOCAL = /(\d{1,3}\.\d{4}\.\d{4}\.\d{4}\.[\d-]+|\d{9,}-\d{4}\.\d{4}|\d{8,}-\d{8,}|\d{8,}-\d{4,}|\d{4,}-\d{4,})/;

const RE_NUMEROS_FIM = /([A-Z])\s+(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;

// ---- Motivos conhecidos (todas as filiais) ----

const MOTIVOS = [
  "AFASTAMENTO SUP. 15D",
  "AFASTAMENTO ATÉ 15D",
  "FALTA NÃO JUSTIFICADA",
  "COBERTURA DE FOLGA",
  "FOLGA ESCALA 5X1",
  "FOLGA ESCALA 6X1",
  "SERVIÇO EXTRA",
  "RECICLAGEM",
  "IMPLANTACAO",
  "IMPLANTAÇÃO",
  "INTEGRAÇÃO",
  "DEVOLUÇÃO",
  "DEMISSAO",
  "DEMISSÃO",
  "CASAMENTO",
  "FÉRIAS",
  "SOLICITAÇÃO DO CLIENTE",
  "INSAL 20%",
  "INSALUBRIDADE",
  "INSALUBRIDADE 20%",
  "ATESTADO MEDICO",
  "ATESTADO MÉDICO",
  "COBERTURA ENTRE FILIAIS",
];

// ---- Funções auxiliares ----

function parseNumeroBR(valor: string): number {
  if (!valor) return 0;
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function dataParaISO(data: string): string {
  const [dia, mes, ano] = data.split("/");
  return `${ano}-${mes}-${dia}`;
}

// ---- Extração de texto ----

async function extrairLinhas(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const linhas: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    
    const porLinha = new Map<number, { x: number; str: string }[]>();
    
    for (const item of content.items) {
      if (!("str" in item) || !item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      
      if (!porLinha.has(y)) porLinha.set(y, []);
      porLinha.get(y)!.push({ x, str: item.str });
    }
    
    const ys = Array.from(porLinha.keys()).sort((a, b) => b - a);
    for (const y of ys) {
      const partes = porLinha.get(y)!.sort((a, b) => a.x - b.x);
      const texto = partes.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
      if (texto) linhas.push(texto);
    }
  }

  return linhas;
}

// ---- Parsing de registro ----

interface RegistroParcial {
  data: string;
  classificacao: number;
  texto: string;
}

function tentarParseRegistro(
  data: string,
  classificacao: number,
  corpo: string,
  substitutoAtual: string
): RegistroImportado | null {
  // Encontrar números no final
  const mNum = corpo.match(RE_NUMEROS_FIM);
  if (!mNum) return null;

  const [, sit, qtdS, valorS, vtS, vaS, totalS] = mNum;
  const resto = corpo.slice(0, mNum.index).trim();

  // Encontrar motivo
  let motivo = "Não informado";
  let idxMotivo = -1;
  const upper = resto.toUpperCase();
  
  for (const m of MOTIVOS) {
    const idx = upper.lastIndexOf(m);
    if (idx > idxMotivo) {
      idxMotivo = idx;
      motivo = m;
    }
  }

  // Separar antes do motivo
  let antesMotivo = resto;
  if (idxMotivo >= 0) {
    antesMotivo = resto.slice(0, idxMotivo).trim();
    motivo = resto.slice(idxMotivo).trim();
  }

  // Encontrar código do local
  let local = "Não informado";
  let codigoPosto = "";
  const mCod = antesMotivo.match(RE_CODIGO_LOCAL);
  
  if (mCod) {
    codigoPosto = mCod[1];
    const idxCod = antesMotivo.indexOf(mCod[1]);
    const nomeLocal = antesMotivo.slice(idxCod + mCod[1].length).replace(/^-\s*/, "").trim();
    local = nomeLocal || antesMotivo.slice(0, idxCod).trim() || "Não informado";
    antesMotivo = antesMotivo.slice(0, idxCod).trim();
  } else {
    local = antesMotivo || "Não informado";
    antesMotivo = "";
  }

  // Encontrar colaborador
  let colaborador = "Não informado";
  let codColab = "";
  const mSubst = antesMotivo.match(/(\d{7})\s*-\s*(.+)$/);
  
  if (mSubst) {
    codColab = mSubst[1];
    colaborador = mSubst[2].trim();
  } else if (antesMotivo && antesMotivo !== "-") {
    colaborador = antesMotivo.replace(/^-\s*/, "").trim() || "Não informado";
  }

  local = local.replace(/^-\s*/, "").trim() || "Não informado";

  return {
    data,
    dataISO: dataParaISO(data),
    classificacao,
    substituto: substitutoAtual,
    colaborador,
    posto: local,
    motivo,
    quantidade: parseNumeroBR(qtdS),
    valorUnitario: parseNumeroBR(valorS),
    totalGeral: parseNumeroBR(totalS),
    situacao: sit,
  };
}

// ---- Processamento principal ----

export interface ResultadoPdf {
  registros: RegistroImportado[];
  filial: string;
  periodo: string;
  totalGeralQtd: number;
  totalGeralValor: number;
  totalCalculadoQtd: number;
  totalCalculadoValor: number;
  conferido: boolean;
}

export async function processarPdf(file: File): Promise<ResultadoPdf> {
  const linhas = await extrairLinhas(file);
  
  let filial = "";
  let periodo = "";
  let totalGQtd = 0;
  let totalGVal = 0;
  let substitutoAtual = "";
  
  const registros: RegistroImportado[] = [];
  let pendente: RegistroParcial | null = null;

  for (const linha of linhas) {
    // Filial
    const mF = linha.match(RE_FILIAL);
    if (mF) filial = `${mF[1]} - ${mF[2].trim()}`;

    // Período
    const mP = linha.match(RE_PERIODO);
    if (mP) periodo = `${mP[1]} - ${mP[2]}`;

    // Total geral
    const mTG = linha.match(RE_TOTAL_GERAL);
    if (mTG) {
      totalGQtd = parseNumeroBR(mTG[1]);
      totalGVal = parseNumeroBR(mTG[4]);
      continue;
    }

    // Substituto
    const mS = linha.match(RE_SUBSTITUTO);
    if (mS) {
      substitutoAtual = mS[2].trim();
      pendente = null;
      continue;
    }

    // Ignorar cabeçalho/rodapé
    if (
      linha.startsWith("MAPA DE COBERTURA") ||
      linha.startsWith("DATA ") ||
      linha.startsWith("Assinatura do empregado") ||
      /^\d+\s+\d{2}\/\d{2}\/\d{4}$/.test(linha) ||
      linha.startsWith("TOTAL")
    ) {
      continue;
    }

    // Tentar parse de data (aceita QUALQUER data no formato DD/MM/AAAA)
    const mD = linha.match(RE_DATA);
    if (mD) {
      const [, data, classifStr, corpo] = mD;
      const classificacao = parseInt(classifStr, 10);
      
      const reg = tentarParseRegistro(data, classificacao, corpo, substitutoAtual);
      if (reg) {
        registros.push(reg);
        pendente = null;
      } else {
        pendente = { data, classificacao, texto: corpo };
      }
      continue;
    }

    // Completar registro pendente
    if (pendente) {
      const combinado = pendente.texto + " " + linha;
      const reg = tentarParseRegistro(pendente.data, pendente.classificacao, combinado, substitutoAtual);
      if (reg) {
        registros.push(reg);
        pendente = null;
      } else {
        pendente.texto = combinado;
      }
    }
  }

  const totalCalculadoQtd = registros.reduce((s, r) => s + r.quantidade, 0);
  const totalCalculadoValor = registros.reduce((s, r) => s + r.totalGeral, 0);

  const conferido =
    Math.abs(totalCalculadoQtd - totalGQtd) < 0.01 &&
    Math.abs(totalCalculadoValor - totalGVal) < 0.05;

  return {
    registros,
    filial,
    periodo,
    totalGeralQtd: totalGQtd,
    totalGeralValor: totalGVal,
    totalCalculadoQtd,
    totalCalculadoValor,
    conferido,
  };
}
