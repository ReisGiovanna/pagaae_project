import { google } from "googleapis";

/**
 * Credenciais via variável de ambiente (Render)
 * GOOGLE_CREDENTIALS = JSON do service account
 */
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/**
 * Utilitário: normaliza status
 */
function normalizarStatus(status) {
  if (!status) return "pendente";
  return status.toString().toLowerCase();
}

/**
 * Utilitário: mantém data no formato original
 */
function normalizarData(data) {
  return data || "";
}

/**
 * ===============================
 * LER TODAS AS CONTAS
 * ===============================
 */
export async function getAll(spreadsheetId) {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A:G",
  });

  const values = res.data.values || [];
  if (values.length <= 1) return [];

  const headers = values[0];

  return values.slice(1).map((row, index) => {
    const obj = {};

    headers.forEach((header, i) => {
      let value = row[i] || "";

      if (header === "Status") {
        value = normalizarStatus(value);
      }

      if (header === "Vencimento") {
        value = normalizarData(value);
      }

      obj[header] = value;
    });

    obj._row = index + 2; // linha real na planilha
    return obj;
  });
}

/**
 * ===============================
 * ADICIONAR CONTA
 * ===============================
 */
export async function add(spreadsheetId, data) {
  const sheets = await getSheetsClient();

  const row = [
    data.ID || "",
    data.Nome || "",
    data.Vencimento || "",
    data.Valor || "",
    normalizarStatus(data.Status),
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
 * ===============================
 * ATUALIZAR CONTA
 * ===============================
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
        normalizarStatus(data.Status),
        data.Categoria || "",
        data.Observacoes || "",
      ]],
    },
  });

  return { ok: true };
}

/**
 * ===============================
 * REMOVER CONTA
 * ===============================
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
 * ===============================
 * FECHAR MÊS
 * - Avança vencimento
 * - Reseta status e valor
 * ===============================
 */
export async function resetarMes(spreadsheetId, contas) {
  const sheets = await getSheetsClient();

  for (const c of contas) {
    let novaData = "";

    if (c.Vencimento && c.Vencimento.includes("/")) {
      const [dia, mes, ano] = c.Vencimento.split("/");
      const data = new Date(`20${ano}-${mes}-${dia}`);
      data.setMonth(data.getMonth() + 1);
      novaData = data.toISOString().split("T")[0];
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `A${c._row}:G${c._row}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          c.ID || "",
          c.Nome || "",
          novaData,
          "",
          "pendente",
          c.Categoria || "",
          c.Observacoes || "",
        ]],
      },
    });
  }

  return { ok: true };
}
