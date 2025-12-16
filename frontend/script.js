// ===============================
// CONFIG API
// ===============================
const API_BASE = "https://pagaae-backend.onrender.com";

const API_DADOS = `${API_BASE}/api/dados`;
const API_FECHAR_MES = `${API_BASE}/api/fechar-mes`;
const API_HISTORICO_ANOS = `${API_BASE}/api/historico/anos`;
const API_HISTORICO_PDFS = (ano) =>
  `${API_BASE}/api/historico/${ano}`;

let contas = [];
let contaSelecionada = null;


// ===============================
// ELEMENTOS
// ===============================
const tabela = document.getElementById("listaContas");

const btnAdicionar = document.getElementById("btnAdicionar");
const btnPagar = document.getElementById("btnPagar");
const btnEditar = document.getElementById("btnEditar");
const btnExcluir = document.getElementById("btnExcluir");
const btnFecharMes = document.getElementById("btnFecharMes");
const btnHistorico = document.getElementById("btnHistorico");

const modal = document.getElementById("modal");
const modalTitulo = document.getElementById("modalTitulo");

const inputNome = document.getElementById("inputNome");
const inputVenc = document.getElementById("inputVenc");
const inputValor = document.getElementById("inputValor");
const inputStatus = document.getElementById("inputStatus");
const inputCategoria = document.getElementById("inputCategoria");

const btnSalvar = document.getElementById("salvarConta");
const btnCancelar = document.getElementById("cancelarModal");

// ===============================
// CARREGAR DADOS
// ===============================
async function carregarDados() {
  const res = await fetch(API_DADOS);
  contas = await res.json();
  renderTabela();
}

// ===============================
// TABELA
// ===============================
function renderTabela() {
  tabela.innerHTML = "";

  contas.forEach(conta => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${conta.Nome}</td>
      <td>${conta.Vencimento}</td>
      <td>${conta.Valor ? `R$ ${conta.Valor}` : "-"}</td>
      <td class="${conta.Status}">${conta.Status}</td>
      <td>${conta.Categoria}</td>
      <td>${gerarAlerta(conta)}</td>
    `;

    tr.onclick = () => selecionarConta(conta, tr);
    tabela.appendChild(tr);
  });
}

function gerarAlerta(conta) {
  if (!conta.Valor) return "-";
  const v = Number(conta.Valor);
  if (v > 500) return "⚠️ Alto";
  if (v < 20) return "ℹ️ Baixo";
  return "-";
}

// ===============================
// SELEÇÃO
// ===============================
function selecionarConta(conta, linha) {
  contaSelecionada = conta;
  [...tabela.children].forEach(l => l.classList.remove("selecionada"));
  linha.classList.add("selecionada");

  btnPagar.disabled = false;
  btnEditar.disabled = false;
  btnExcluir.disabled = false;
}

// ===============================
// MODAL
// ===============================
btnAdicionar.onclick = () => {
  contaSelecionada = null;
  modalTitulo.innerText = "Adicionar Conta";

  inputNome.value = "";
  inputVenc.value = "";
  inputValor.value = "";
  inputStatus.value = "pendente";
  inputCategoria.value = "Casa";

  modal.classList.remove("hidden");
};

btnEditar.onclick = () => {
  if (!contaSelecionada) return;

  modalTitulo.innerText = "Editar Conta";
  inputNome.value = contaSelecionada.Nome;
  inputVenc.value = contaSelecionada.Vencimento;
  inputValor.value = contaSelecionada.Valor;
  inputStatus.value = contaSelecionada.Status;
  inputCategoria.value = contaSelecionada.Categoria;

  modal.classList.remove("hidden");
};

btnCancelar.onclick = () => modal.classList.add("hidden");

// ===============================
// SALVAR
// ===============================
btnSalvar.onclick = async () => {
  const dados = {
    Nome: inputNome.value,
    Vencimento: inputVenc.value,
    Valor: inputValor.value,
    Status: inputStatus.value,
    Categoria: inputCategoria.value
  };

  if (!contaSelecionada) {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
  } else {
    await fetch(`${API_URL}/${contaSelecionada._row}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dados, ID: contaSelecionada.ID })
    });
  }

  modal.classList.add("hidden");
  carregarDados();
};

// ===============================
// AÇÕES
// ===============================
btnPagar.onclick = async () => {
  if (!contaSelecionada) return;

  await fetch(`${API_URL}/${contaSelecionada._row}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...contaSelecionada, Status: "pago" })
  });

  carregarDados();
};

btnExcluir.onclick = async () => {
  if (!contaSelecionada) return;

  await fetch(`${API_URL}/${contaSelecionada._row}`, {
    method: "DELETE"
  });

  carregarDados();
};

// ===============================
// FECHAR MÊS (PDF)
// ===============================
btnFecharMes.onclick = async () => {
  const hoje = new Date();
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();

  if (!confirm(`Fechar mês ${mes}/${ano}?`)) return;

  const res = await fetch(API_FECHAR_MES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mes, ano })
  });

  if (!res.ok) {
    alert("Erro ao fechar mês");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `PagaAe_${mes}_${ano}.pdf`;
  a.click();

  window.URL.revokeObjectURL(url);

  carregarDados();
};


// ===============================
// HISTÓRICO
// ===============================
btnHistorico.onclick = async () => {
  const res = await fetch(API_HISTORICO);
  const dados = await res.json();

  let msg = "PDFs disponíveis:\n\n";
  dados.forEach(p => msg += `${p.ano} → ${p.arquivo}\n`);

  alert(msg);
};

// ===============================
// INIT
// ===============================
carregarDados();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/frontend/sw.js");
}