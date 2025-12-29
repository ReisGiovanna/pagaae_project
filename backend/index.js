import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { getAll, add, update, remove, resetarMes } from "./sheets.js";
import { gerarPDF } from "./pdf.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID não definido");
  process.exit(1);
}

// ======================================================
// 📌 ROTA RAIZ (DEBUG / RENDER)
// ======================================================

app.get("/", (req, res) => {
  res.send("API PagaAê rodando");
});

// ======================================================
// 📌 HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend rodando" });
});

// ======================================================
// 📌 CRUD CONTAS
// ======================================================

// ROTA PRINCIPAL
app.get("/api/dados", async (req, res) => {
  try {
    const dados = await getAll(SHEET_ID);
    res.json(dados);
  } catch (err) {
    console.error("ERRO AO BUSCAR DADOS:", err);
    res.status(500).json({ error: "Erro ao buscar dados", detalhe: err.message});
  }
});

// ALIASES (para compatibilidade com o frontend atual)
app.get("/dados", (req, res) => res.redirect("/api/dados"));
app.get("/contas", (req, res) => res.redirect("/api/dados"));

app.post("/api/dados", async (req, res) => {
  try {
    await add(SHEET_ID, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/dados:", err);
    res.status(500).json({ error: "Erro ao adicionar", detalhe: err.message});
  }
});

app.post("/dados", (req, res) => res.redirect(307, "/api/dados"));
app.post("/contas", (req, res) => res.redirect(307, "/api/dados"));

app.put("/api/dados/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await update(SHEET_ID, row, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/dados:", err);
    res.status(500).json({ error: "Erro ao utilizar", detalhe: err.message});
  }
});

app.delete("/api/dados/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await remove(SHEET_ID, row);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/dados:", err);
    res.status(500).json({ error: "Erro ao excluir", detalhe: err.message});
  }
});

// ======================================================
// 📌 FECHAR MÊS
// ======================================================

app.post("/api/fechar-mes", async (req, res) => {
  try {
    const { mes, ano } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({ error: "Mês e ano obrigatórios" });
    }

    const contas = await getAll(SHEET_ID);
    if (!contas.length) {
      return res.status(400).json({ error: "Sem contas" });
    }

    const pdf = await gerarPDF(contas, mes, ano);
    await resetarMes(SHEET_ID, contas);

    res.download(pdf.caminho, pdf.nomeArquivo);
  } catch (err) {
    console.error("POST /api/fechar-mes:", err);
    res.status(500).json({ error: "Erro ao fechar mês", detalhe: err.message});
  }
});

// ======================================================
// 📌 HISTÓRICO
// ======================================================

const PDF_BASE = path.join(process.cwd(), "pdfs");

if (!fs.existsSync(PDF_BASE)) {
  fs.mkdirSync(PDF_BASE, { recursive: true });
}

app.get("/api/historico/anos", (req, res) => {
  const anos = fs
    .readdirSync(PDF_BASE)
    .filter(a => fs.statSync(path.join(PDF_BASE, a)).isDirectory());

  res.json(anos);
});

app.get("/api/historico/:ano", (req, res) => {
  const pasta = path.join(PDF_BASE, req.params.ano);
  if (!fs.existsSync(pasta)) return res.json([]);

  const arquivos = fs.readdirSync(pasta).filter(a => a.endsWith(".pdf"));
  res.json(arquivos);
});

app.get("/api/historico/:ano/:arquivo", (req, res) => {
  const caminho = path.join(PDF_BASE, req.params.ano, req.params.arquivo);
  if (!fs.existsSync(caminho)) {
    return res.status(404).send("Arquivo não encontrado");
  }
  res.download(caminho);
});

// ======================================================
// 🚀 START
// ======================================================

app.listen(PORT, () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
});
