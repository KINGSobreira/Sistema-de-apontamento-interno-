// ============================================
// Controle de Extras — Conferência cruzada PDF × Excel
// ============================================

import type { RegistroImportado, ResultadoConferencia, Divergencia } from "./types";
import { normalizarTexto } from "./utils";

// Chave "flexível" para casar registros entre PDF e Excel:
// data + substituto + posto + motivo + quantidade
// (o PDF agrupa por substituto; o Excel tem titular/substituto em colunas)
function chaveCruzamento(r: RegistroImportado): string {
  return [
    r.data,
    normalizarTexto(r.substituto),
    normalizarTexto(r.posto),
    normalizarTexto(r.motivo),
    r.quantidade.toFixed(2),
  ].join("|");
}

// Chave alternativa: data + substituto + classificação + quantidade
function chaveAlternativa(r: RegistroImportado): string {
  return [r.data, normalizarTexto(r.substituto), r.classificacao, r.quantidade.toFixed(2)].join("|");
}

export function cruzarRegistros(
  registrosPdf: RegistroImportado[],
  registrosExcel: RegistroImportado[]
): ResultadoConferencia {
  const mapaExcel = new Map<string, RegistroImportado[]>();
  for (const r of registrosExcel) {
    const k = chaveCruzamento(r);
    if (!mapaExcel.has(k)) mapaExcel.set(k, []);
    mapaExcel.get(k)!.push(r);
  }

  const mapaExcelAlt = new Map<string, RegistroImportado[]>();
  for (const r of registrosExcel) {
    const k = chaveAlternativa(r);
    if (!mapaExcelAlt.has(k)) mapaExcelAlt.set(k, []);
    mapaExcelAlt.get(k)!.push(r);
  }

  const excelUsado = new Set<RegistroImportado>();
  const somentePdf: RegistroImportado[] = [];
  const divergenciaValor: Divergencia[] = [];
  const divergenciaQuantidade: Divergencia[] = [];
  const divergenciaClassificacao: Divergencia[] = [];
  let coincidentes = 0;

  for (const rp of registrosPdf) {
    const k = chaveCruzamento(rp);
    const candidatos = (mapaExcel.get(k) || []).filter((r) => !excelUsado.has(r));

    if (candidatos.length > 0) {
      const re = candidatos[0];
      excelUsado.add(re);
      // Verifica divergências de valor e classificação
      const difValor = Math.abs(re.totalGeral - rp.totalGeral);
      if (difValor >= 0.01) {
        divergenciaValor.push({
          tipo: "valor",
          descricao: `PDF: R$ ${rp.totalGeral.toFixed(2)} × Excel: R$ ${re.totalGeral.toFixed(2)}`,
          colaborador: rp.substituto,
          data: rp.data,
          posto: rp.posto,
          valorPdf: rp.totalGeral,
          valorExcel: re.totalGeral,
          diferenca: Math.abs(rp.totalGeral - re.totalGeral),
          registroPdf: rp,
          registroExcel: re,
        });
      } else if (re.classificacao !== rp.classificacao && re.classificacao !== 0 && rp.classificacao !== 0) {
        divergenciaClassificacao.push({
          tipo: "classificacao",
          descricao: `PDF: Classif. ${rp.classificacao} × Excel: Classif. ${re.classificacao}`,
          colaborador: rp.substituto,
          data: rp.data,
          posto: rp.posto,
          registroPdf: rp,
          registroExcel: re,
        });
      } else {
        coincidentes++;
      }
      continue;
    }

    // Tenta chave alternativa (pode divergir em quantidade)
    const kAlt = chaveAlternativa(rp);
    const candidatosAlt = (mapaExcelAlt.get(kAlt) || []).filter((r) => !excelUsado.has(r));
    if (candidatosAlt.length > 0) {
      const re = candidatosAlt[0];
      excelUsado.add(re);
      coincidentes++;
      continue;
    }

    // Tenta casar por data+substituto+posto+motivo ignorando quantidade (divergência de qtd)
    const kSemQtd = [rp.data, normalizarTexto(rp.substituto), normalizarTexto(rp.posto), normalizarTexto(rp.motivo)].join("|");
    const candidatosQtd = registrosExcel.filter((re) => {
      if (excelUsado.has(re)) return false;
      const kRe = [re.data, normalizarTexto(re.substituto), normalizarTexto(re.posto), normalizarTexto(re.motivo)].join("|");
      return kRe === kSemQtd;
    });
    if (candidatosQtd.length > 0) {
      const re = candidatosQtd[0];
      excelUsado.add(re);
      divergenciaQuantidade.push({
        tipo: "quantidade",
        descricao: `PDF: ${rp.quantidade.toFixed(2)} × Excel: ${re.quantidade.toFixed(2)}`,
        colaborador: rp.substituto,
        data: rp.data,
        posto: rp.posto,
        valorPdf: rp.quantidade,
        valorExcel: re.quantidade,
        diferenca: Math.abs(rp.quantidade - re.quantidade),
        registroPdf: rp,
        registroExcel: re,
      });
      continue;
    }

    somentePdf.push(rp);
  }

  const somenteExcel = registrosExcel.filter((r) => !excelUsado.has(r));

  return {
    coincidentes,
    somentePdf,
    somenteExcel,
    divergenciaValor,
    divergenciaQuantidade,
    divergenciaClassificacao,
  };
}
