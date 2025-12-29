// ===============================
// CONFIG API
// ===============================
const API_BASE = "https://pagaae-backend.onrender.com";

const API_DADOS = `${API_BASE}/api/dados`;
const API_FECHAR_MES = `${API_BASE}/api/fechar-mes`;
const API_HISTORICO_ANOS = `${API_BASE}/api/historico/anos`;
const API_HISTORICO_PDFS = (ano) =>
  `${API_BASE}/api/historico/${ano}`;

// ===============================
// ESTADO
// ===============================
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

// MODAL HISTÓRICO
const modalHistorico = document.getElementById("modalHistorico");
const fecharHistorico = document.getElementById("fecharHistorico");
const selectAno = document.getElementById("selectAno");
const listaPdfs = document.getElementById("listaPdfs");

// ===============================
// LOADER + TOAST
// ===============================
const loader = document.createElement("div");
loader.className = "loader hidden";
loader.innerHTML = `
  <div class="spinner"></div>
  <span>Carregando...</span>
`;
document.body.appendChild(loader);

const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);

function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function showToast(msg, type = "success") {
  toast.innerText = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===============================
// CARREGAR DADOS (CORRIGIDO)
// ===============================
async function carregarDados() {
  try {
    showLoader();

    const res = await fetch(API_DADOS, {
      method: "GET",
      mode: "cors"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    contas = await res.json();
    renderTabela();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    alert("Erro ao carregar dados do servidor");
  } finally {
    hideLoader();
  }
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
// MODAL ADD / EDIT
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
// SALVAR (CORRIGIDO)
// ===============================
btnSalvar.onclick = async () => {
  try {
    showLoader();

    const dados = {
      Nome: inputNome.value,
      Vencimento: inputVenc.value,
      Valor: inputValor.value,
      Status: inputStatus.value,
      Categoria: inputCategoria.value
    };

    if (!contaSelecionada) {
      await fetch(API_DADOS, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      showToast("Conta adicionada!");
    } else {
      await fetch(`${API_DADOS}/${contaSelecionada._row}`, {
        method: "PUT",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dados, ID: contaSelecionada.ID })
      });
      showToast("Conta atualizada!");
    }

    modal.classList.add("hidden");
    carregarDados();
  } catch {
    showToast("Erro ao salvar conta", "error");
  } finally {
    hideLoader();
  }
};

// ===============================
// AÇÕES
// ===============================
btnPagar.onclick = async () => {
  if (!contaSelecionada) return;

  try {
    showLoader();
    await fetch(`${API_DADOS}/${contaSelecionada._row}`, {
      method: "PUT",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...contaSelecionada, Status: "pago" })
    });
    showToast("Conta marcada como paga!");
    carregarDados();
  } catch {
    showToast("Erro ao pagar conta", "error");
  } finally {
    hideLoader();
  }
};

btnExcluir.onclick = async () => {
  if (!contaSelecionada) return;
  if (!confirm("Deseja excluir esta conta?")) return;

  try {
    showLoader();
    await fetch(`${API_DADOS}/${contaSelecionada._row}`, {
      method: "DELETE",
      mode: "cors"
    });
    showToast("Conta excluída!");
    carregarDados();
  } catch {
    showToast("Erro ao excluir", "error");
  } finally {
    hideLoader();
  }
};

// ===============================
// FECHAR MÊS
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

  try {
    showLoader();
    const res = await fetch(API_FECHAR_MES, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, ano })
    });

    if (!res.ok) throw new Error();

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `PagaAe_${mes}_${ano}.pdf`;
    a.click();

    window.URL.revokeObjectURL(url);

    showToast("Mês fechado com sucesso!");
    carregarDados();
  } catch {
    showToast("Erro ao fechar mês", "error");
  } finally {
    hideLoader();
  }
};

// ===============================
// HISTÓRICO
// ===============================
btnHistorico.onclick = async () => {
  modalHistorico.classList.remove("hidden");
  listaPdfs.innerHTML = "";
  selectAno.innerHTML = `<option value="">Selecione</option>`;

  try {
    showLoader();
    const res = await fetch(API_HISTORICO_ANOS, { mode: "cors" });
    const anos = await res.json();

    if (!anos.length) {
      listaPdfs.innerHTML = "<li>Nenhum histórico disponível</li>";
    }

    anos.forEach(ano => {
      const opt = document.createElement("option");
      opt.value = ano;
      opt.innerText = ano;
      selectAno.appendChild(opt);
    });
  } catch {
    showToast("Erro ao carregar histórico", "error");
  } finally {
    hideLoader();
  }
};

selectAno.onchange = async () => {
  const ano = selectAno.value;
  listaPdfs.innerHTML = "";
  if (!ano) return;

  try {
    showLoader();
    const res = await fetch(API_HISTORICO_PDFS(ano), { mode: "cors" });
    const pdfs = await res.json();

    if (!pdfs.length) {
      listaPdfs.innerHTML = "<li>Nenhum PDF neste ano</li>";
    }

    pdfs.forEach(nome => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${nome}</span>
        <button onclick="window.open('${API_BASE}/api/historico/${ano}/${nome}')">
          Baixar
        </button>
      `;
      listaPdfs.appendChild(li);
    });
  } catch {
    showToast("Erro ao carregar PDFs", "error");
  } finally {
    hideLoader();
  }
};

fecharHistorico.onclick = () => {
  modalHistorico.classList.add("hidden");
};

// ===============================
// INIT
// ===============================
carregarDados();
