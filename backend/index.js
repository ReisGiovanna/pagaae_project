import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { getAll, add, update, remove, resetarMes } from "./sheets.js";
import { gerarPDF } from "./pdf.js";

dotenv.config();

const app = express();

/* =========================
   CORS — CONFIG CORRETA
========================= */
app.use(cors({
  origin: "https://pagaae-project.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID não definido");
  process.exit(1);
}

/* =========================
   ROTAS
========================= */

app.get("/", (req, res) => {
  res.send("API PagaAê rodando");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend rodando" });
});

app.get("/api/dados", async (req, res) => {
  try {
    const dados = await getAll(SHEET_ID);
    res.json(dados);
  } catch (err) {
    console.error("ERRO AO BUSCAR DADOS:", err);
    res.status(500).json({ error: "Erro ao buscar dados", detalhe: err.message });
  }
});

app.post("/api/dados", async (req, res) => {
  try {
    await add(SHEET_ID, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/dados:", err);
    res.status(500).json({ error: "Erro ao adicionar", detalhe: err.message });
  }
});

app.put("/api/dados/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await update(SHEET_ID, row, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/dados:", err);
    res.status(500).json({ error: "Erro ao atualizar", detalhe: err.message });
  }
});

app.delete("/api/dados/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await remove(SHEET_ID, row);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/dados:", err);
    res.status(500).json({ error: "Erro ao excluir", detalhe: err.message });
  }
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
});
