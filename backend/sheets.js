// backend/sheets.js
import { google } from "googleapis";
import fs from "fs";

// Autenticação Google
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync("./credentials.json")),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/**
 * Lê todas as contas da aba principal
 */
export async function getAll(spreadsheetId) {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A:G",
  });

  const values = res.data.values || [];
  if (!values.length) return [];

  const headers = values[0];
  return values.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });
    obj._row = i + 2; // linha real na planilha
    return obj;
  });
}

/**
 * Adiciona nova conta
 */
export async function add(spreadsheetId, data) {
  const sheets = await getSheetsClient();

  const row = [
    data.ID || "",
    data.Nome || "",
    data.Vencimento || "",
    data.Valor || "",
    data.Status || "pendente",
    data.Categoria || "",
    data.Observacoes || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:G",
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  return { ok: true };
}

/**
 * Atualiza conta
 */
export async function update(spreadsheetId, row, data) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `A${row}:G${row}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        data.ID || "",
        data.Nome || "",
        data.Vencimento || "",
        data.Valor || "",
        data.Status || "",
        data.Categoria || "",
        data.Observacoes || "",
      ]],
    },
  });

  return { ok: true };
}

/**
 * Remove conta
 */
export async function remove(spreadsheetId, row) {
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets[0].properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: row - 1,
            endIndex: row,
          },
        },
      }],
    },
  });

  return { ok: true };
}

/**
 * Fecha o mês:
 * - Gera PDF
 * - Reseta status/valor e avança vencimento
 */
export async function resetarMes(spreadsheetId, contas) {
  const sheets = await getSheetsClient();

  for (const c of contas) {
    const data = new Date(c.Vencimento || new Date());
    data.setMonth(data.getMonth() + 1);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `A${c._row}:G${c._row}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          c.ID,
          c.Nome,
          data.toISOString().split("T")[0],
          "",
          "pendente",
          c.Categoria,
          c.Observacoes || "",
        ]],
      },
    });
  }
}