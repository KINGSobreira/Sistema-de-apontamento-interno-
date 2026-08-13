// ============================================
// Controle de Extras — Parser do relatório PDF "MAPA DE COBERTURA"
// ============================================
// Estrutura do PDF (extraída via pdf.js como linhas de texto):
//   Cabeçalho: FILIAL : XXXX - NOME   PERÍODO : dd/mm/aaaa - dd/mm/aaaa
//   Grupo:     SUBSTITUTO : MATRICULA - NOME
//   Registro:  DATA CLASSIF SUBSTITUÍDO LOCAL MOTIVO SIT QTD VALOR VT VA TOTAL
//   (LOCAL e SUBSTITUÍDO podem quebrar em múltiplas linhas)
//   Rodapé do grupo: "Assinatura do empregado ... TOTAL qtd ... total"
//   Fim: TOTAL GERAL qtd ... total
// ============================================

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { RegistroImportado } from "./types";
import { parseNumeroBR, dataParaISO, gerarChaveRegistro } from "./utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ResultadoPdf {
  filial: string;
  codigoFilial: string;
  periodo: string;
  periodoInicio: string;
  periodoFim: string;
  registros: RegistroImportado[];
  totalGeralQtd: number;
  totalGeralValor: number;
  avisos: string[];
}

interface Linha {
  texto: string;
  y: number;
}

async function extrairLinhas(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const linhas: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const porLinha = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items as { str: string; transform: number[] }[]) {
      if (!item.str || !item.str.trim()) continue;
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

const RE_DATA = /^(\d{2}\/\d{2}\/\d{4})\s+(\d)\s+(.*)$/;
const RE_SUBSTITUTO = /^SUBSTITUTO\s*:\s*(\d+)\s*-\s*(.+)$/;
const RE_FILIAL = /FILIAL\s*:\s*(\d+)\s*-\s*(.+?)(?:PERÍODO|$)/;
const RE_PERIODO = /PERÍODO\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/;
const RE_TOTAL_GRUPO = /TOTAL\s+(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;
const RE_TOTAL_GERAL = /TOTAL GERAL\s+(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;
const RE_CODIGO_LOCAL = /(\d\.\d{4}\.\d{4}\.\d{4}\.[\d-]+|\d{15,}-\d{4}\.\d{4})/;
const RE_NUMEROS_FIM = /([A-Z])\s+(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;

const MOTIVOS_CONHECIDOS = [
  "AFASTAMENTO SUP. 15D",
  "AFASTAMENTO ATÉ 15D",
  "FALTA NÃO JUSTIFICADA",
  "COBERTURA DE FOLGA",
  "FOLGA ESCALA 5X1",
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
];

export async function processarPdf(file: File): Promise<ResultadoPdf> {
  const linhas = await extrairLinhas(file);
  const avisos: string[] = [];

  let filial = "Não informado";
  let codigoFilial = "";
  let periodo = "";
  let periodoInicio = "";
  let periodoFim = "";
  let totalGeralQtd = 0;
  let totalGeralValor = 0;

  const registros: RegistroImportado[] = [];
  let substitutoAtual = "Não informado";
  let codigoSubstitutoAtual = "";
  let pendente: {
    data: string;
    classificacao: number;
    texto: string;
  } | null = null;

  const tentarParseRegistro = (
    data: string,
    classificacao: number,
    corpo: string
  ): RegistroImportado | null => {
    // Extrai números do final: SIT QTD VALOR VT VA TOTAL
    const mNum = corpo.match(RE_NUMEROS_FIM);
    if (!mNum) return null;
    const [, situacao, qtdS, valorS, vtS, vaS, totalS] = mNum;
    const resto = corpo.slice(0, mNum.index).trim();

    // Identifica o motivo no texto
    let motivo = "Não informado";
    let idxMotivo = -1;
    const corpoUpper = resto.toUpperCase();
    for (const m of MOTIVOS_CONHECIDOS) {
      const idx = corpoUpper.lastIndexOf(m);
      if (idx > idxMotivo) {
        idxMotivo = idx;
        motivo = m;
      }
    }

    let antesLocal = resto;
    let local = "Não informado";
    let codigoPosto = "";

    if (idxMotivo >= 0) {
      antesLocal = resto.slice(0, idxMotivo).trim();
      motivo = resto.slice(idxMotivo).trim();
    }

    // Extrai código do local
    const mCod = antesLocal.match(RE_CODIGO_LOCAL);
    if (mCod) {
      codigoPosto = mCod[1];
      const idxCod = antesLocal.indexOf(mCod[1]);
      const nomeLocal = antesLocal.slice(idxCod + mCod[1].length).replace(/^-\s*/, "").trim();
      local = nomeLocal.replace(/^-\s*/, "") || antesLocal.slice(0, idxCod).trim() || "Não informado";
      antesLocal = antesLocal.slice(0, idxCod).trim();
    } else {
      local = (antesLocal || "Não informado").replace(/^-\s*/, "").trim() || "Não informado";
      antesLocal = "";
    }

    // O que sobrou antes do local é o substituído (matrícula - nome) ou "-"
    let colaborador = "Não informado";
    let codigoColaborador = "";
    const mSubst = antesLocal.match(/(\d{7})\s*-\s*(.+)$/);
    if (mSubst) {
      codigoColaborador = mSubst[1];
      colaborador = mSubst[2].trim();
    } else if (antesLocal && antesLocal !== "-") {
      colaborador = antesLocal.replace(/^-\s*/, "").trim() || "Não informado";
    }

    const quantidade = parseNumeroBR(qtdS);
    const valorUnitario = parseNumeroBR(valorS);
    const vt = parseNumeroBR(vtS);
    const va = parseNumeroBR(vaS);
    const total = parseNumeroBR(totalS);

    const reg: RegistroImportado = {
      chave: "",
      data,
      dataISO: dataParaISO(data),
      filial,
      codigoFilial,
      substituto: substitutoAtual,
      codigoSubstituto: codigoSubstitutoAtual,
      colaborador,
      codigoColaborador,
      posto: local,
      codigoPosto,
      motivo,
      classificacao,
      quantidade,
      valorUnitario,
      valorTotal: total,
      vt,
      va,
      totalGeral: total,
      situacao,
      revisaoNecessaria: false,
    };
    reg.chave = gerarChaveRegistro(reg);
    return reg;
  };

  for (const linha of linhas) {
    // Filial / período
    const mFilial = linha.match(RE_FILIAL);
    if (mFilial) {
      codigoFilial = mFilial[1].trim();
      filial = `${mFilial[1].trim()} - ${mFilial[2].trim()}`;
    }
    const mPeriodo = linha.match(RE_PERIODO);
    if (mPeriodo) {
      periodoInicio = mPeriodo[1];
      periodoFim = mPeriodo[2];
      periodo = `${mPeriodo[1]} - ${mPeriodo[2]}`;
    }

    // Total geral
    const mTG = linha.match(RE_TOTAL_GERAL);
    if (mTG) {
      totalGeralQtd = parseNumeroBR(mTG[1]);
      totalGeralValor = parseNumeroBR(mTG[4]);
      continue;
    }

    // Substituto (novo grupo)
    const mSubst = linha.match(RE_SUBSTITUTO);
    if (mSubst) {
      codigoSubstitutoAtual = mSubst[1].trim();
      substitutoAtual = mSubst[2].trim();
      pendente = null;
      continue;
    }

    // Ignora cabeçalhos/rodapés
    if (
      linha.startsWith("MAPA DE COBERTURA") ||
      linha.startsWith("DATA ") ||
      linha.startsWith("Assinatura do empregado") ||
      /^\d+\s+\d{2}\/\d{2}\/\d{4}$/.test(linha)
    ) {
      // "Assinatura do empregado" pode conter TOTAL do grupo — ignora
      continue;
    }

    // Linha de registro?
    const mData = linha.match(RE_DATA);
    if (mData) {
      const [, data, classif, corpo] = mData;
      const reg = tentarParseRegistro(data, parseInt(classif, 10), corpo);
      if (reg) {
        registros.push(reg);
        pendente = null;
      } else {
        // Registro quebrado — aguarda continuação
        pendente = { data, classificacao: parseInt(classif, 10), texto: corpo };
      }
      continue;
    }

    // Continuação de registro pendente
    if (pendente) {
      const combinado = pendente.texto + " " + linha;
      const reg = tentarParseRegistro(pendente.data, pendente.classificacao, combinado);
      if (reg) {
        registros.push(reg);
        pendente = null;
      } else {
        pendente.texto = combinado;
        // Segurança: se acumular demais, marca revisão
        if (pendente.texto.length > 400) {
          avisos.push(`Registro de ${pendente.data} marcado para revisão (quebra incomum).`);
          pendente = null;
        }
      }
    }
  }

  // Fallback: se não achou total geral, calcula
  if (totalGeralValor === 0 && registros.length > 0) {
    totalGeralQtd = registros.reduce((s, r) => s + r.quantidade, 0);
    totalGeralValor = registros.reduce((s, r) => s + r.totalGeral, 0);
  }

  return {
    filial,
    codigoFilial,
    periodo,
    periodoInicio,
    periodoFim,
    registros,
    totalGeralQtd,
    totalGeralValor,
    avisos,
  };
}
