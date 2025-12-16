// backend/pdf.js
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Gera o PDF do mês e salva em backend/pdfs/{ano}/
 * Retorna { nomeArquivo, caminho }
 */
export async function gerarPDF(contas, mes, ano) {
  return new Promise((resolve, reject) => {
    try {
      const baseDir = path.resolve("backend", "pdfs", String(ano));

      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const nomeArquivo = `PagaAe_${mes}_${ano}.pdf`;
      const caminho = path.join(baseDir, nomeArquivo);

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = fs.createWriteStream(caminho);

      doc.pipe(stream);

      // Título
      doc
        .fontSize(20)
        .text(`Relatório Financeiro — ${mes}/${ano}`, {
          align: "center",
        })
        .moveDown(2);

      // Cabeçalho
      doc.fontSize(12).text(
        "Nome | Vencimento | Valor | Status | Categoria",
        { underline: true }
      );
      doc.moveDown(0.5);

      // Conteúdo
      contas.forEach((c) => {
        doc.text(
          `${c.Nome} | ${c.Vencimento || "-"} | R$ ${c.Valor || "-"} | ${c.Status} | ${c.Categoria}`
        );
      });

      doc.end();

      stream.on("finish", () => {
        resolve({ nomeArquivo, caminho });
      });

      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}