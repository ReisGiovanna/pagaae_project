import { google } from "googleapis";

/**
 * Retorna client do Google Sheets
 * Credenciais lidas SOMENTE em runtime
 */
async function getSheetsClient() {
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error("GOOGLE_CREDENTIALS não definido");
  }

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } catch (err) {
    console.error("Erro ao parsear GOOGLE_CREDENTIALS:", err.message);
    throw err;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/**
 * ===============================
 * UTILITÁRIOS
 * ===============================
 */
function normalizarStatus(status) {
  if (!status) return "pendente";
  return status.toString().toLowerCase();
}

function normalizarData(data) {
  return data || "";
}

/**
 * ===============================
 * LER TODAS AS CONTAS
 * ===============================
 */
export async function getAll(spreadsheetId) {
  try {
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

      obj._row = index + 2;
      return obj;
    });
  } catch (err) {
    console.error("Erro em getAll:", err);
    throw err;
  }
}

/**
 * ===============================
 * ADICIONAR CONTA
 * ===============================
 */
export async function add(spreadsheetId, data) {
  try {
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
  } catch (err) {
    console.error("Erro em add:", err);
    throw err;
  }
}

/**
 * ===============================
 * ATUALIZAR CONTA
 * ===============================
 */
export async function update(spreadsheetId, row, data) {
  try {
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
  } catch (err) {
    console.error("Erro em update:", err);
    throw err;
  }
}

/**
 * ===============================
 * REMOVER CONTA
 * ===============================
 */
export async function remove(spreadsheetId, row) {
  try {
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
  } catch (err) {
    console.error("Erro em remove:", err);
    throw err;
  }
}

/**
 * ===============================
 * FECHAR MÊS
 * ===============================
 */
export async function resetarMes(spreadsheetId, contas) {
  try {
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
  } catch (err) {
    console.error("Erro em resetarMes:", err);
    throw err;
  }
}
