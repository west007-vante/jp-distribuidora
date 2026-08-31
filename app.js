/* ============================================================
   JP DISTRIBUIDORA — lógica do sistema
   ============================================================ */

const SUPA_URL = "https://rlrxeegnwjsmxwzoytiz.supabase.co";
const SUPA_KEY = "sb_publishable_9yEhwRIH_L2Vp1FJI0sxKg_6tMg-sOs";
const EMAIL_FIXO = "vinicius@jpdistribuidora.app";

const db = supabase.createClient(SUPA_URL, SUPA_KEY);

/* ---------- estado ---------- */
const S = {
  config: null,
  produtos: [],
  clientes: [],
  vendas: [],
  itens: new Map(), // venda_id -> [itens]
  cheques: [],
  aba: "venda",
};

/* venda em montagem */
let V = null;
function novaVendaVazia() {
  return {
    cliente_id: null, cliente_nome: "", cliente_tel: "",
    itens: [], desconto: 0, forma: "dinheiro", pago: false,
    cheques: [], obs: "",
  };
}

/* ============================================================
   utilitários
   ============================================================ */
const $ = (sel, raiz) => (raiz || document).querySelector(sel);
const $$ = (sel, raiz) => [...(raiz || document).querySelectorAll(sel)];

const fmtBRL = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function aParaNum(txt) {
  if (typeof txt === "number") return txt;
  txt = String(txt || "").trim().replace(/[R$\s]/g, "");
  if (!txt) return 0;
  if (txt.includes(",")) txt = txt.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(txt);
  return isNaN(n) ? 0 : n;
}
const fmtQtd = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
};

/* datas — bom_para é date puro: parse manual pra não escorregar de fuso */
function dataLocal(iso) {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(iso);
}
const fmtData = (iso) => { const d = dataLocal(iso); return d ? d.toLocaleDateString("pt-BR") : "—"; };
const fmtDataHora = (iso) => {
  const d = dataLocal(iso);
  return d ? d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
};
function hojeZero() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function diasAte(iso) {
  const d = dataLocal(iso); if (!d) return 0;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hojeZero()) / 86400000);
}
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const numNota = (n) => "Nº " + String(n).padStart(4, "0");

/* ---------- ícones ---------- */
const IC = {
  venda: '<circle cx="12" cy="12" r="9.25"/><path d="M8.5 12h7M12 8.5v7"/>',
  notas: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M15.5 13h-7M15.5 17h-7"/>',
  produtos: '<path d="M21 8.2a2 2 0 0 0-1-1.74l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8.2v7.6a2 2 0 0 0 1 1.74l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.74Z"/><path d="m3.3 7.1 8.7 5 8.7-5"/><path d="M12 22.1V12"/>',
  entregas: '<path d="M14 17.5V6a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 2 6v10.5a1 1 0 0 0 1 1h1.5"/><path d="M14 17.5H9"/><path d="M18.5 17.5h1.7a1 1 0 0 0 1-1v-3.3a1 1 0 0 0-.22-.63l-3.2-4A1 1 0 0 0 17 8.2h-3"/><circle cx="16.75" cy="17.5" r="1.9"/><circle cx="6.75" cy="17.5" r="1.9"/>',
  pagamentos: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M5.5 12h.01M18.5 12h.01"/>',
  financeiro: '<path d="M20.5 12V7.5H5.25a2.25 2.25 0 0 1 0-4.5H19.5v4"/><path d="M3 5.25V19a2 2 0 0 0 2 2h15.5v-4.5"/><path d="M17.5 12a2.25 2.25 0 0 0 0 4.5h4V12Z"/>',
  ajustes: '<path d="M21 4.5h-7M10 4.5H3M21 12h-9M8 12H3M21 19.5h-5M12 19.5H3"/><path d="M14 2.25v4.5M8 9.75v4.5M16 17.25v4.5"/>',
  imprimir: '<path d="M6.5 9V3h11v6"/><path d="M6.5 17.5H4.75A1.75 1.75 0 0 1 3 15.75v-5A1.75 1.75 0 0 1 4.75 9h14.5A1.75 1.75 0 0 1 21 10.75v5a1.75 1.75 0 0 1-1.75 1.75H17.5"/><rect x="6.5" y="14" width="11" height="7.5"/>',
  check: '<path d="M20 6 9 17.5 4 12.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  lixo: '<path d="M3.5 6.5h17"/><path d="M18.5 6.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V6.5"/><path d="M8.5 6.5V4.75A1.75 1.75 0 0 1 10.25 3h3.5a1.75 1.75 0 0 1 1.75 1.75V6.5"/><path d="M10 11v6M14 11v6"/>',
  lapis: '<path d="M17.7 3.3a2.1 2.1 0 0 1 3 3L8.5 18.5 4 20l1.5-4.5Z"/>',
  busca: '<circle cx="11" cy="11" r="7.25"/><path d="m20.5 20.5-4.4-4.4"/>',
  alerta: '<path d="M12 8.5V13"/><path d="M12 16.5h.01"/><path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/>',
  cheque: '<rect x="2.5" y="5.5" width="19" height="13" rx="1.75"/><path d="M6 9.5h7M6 12.5h4"/><path d="M14.5 15.5H18"/>',
  desfazer: '<path d="M8.5 4.5 4 9l4.5 4.5"/><path d="M4 9h10.25A5.75 5.75 0 0 1 20 14.75v0a5.75 5.75 0 0 1-5.75 5.75H8"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  calendario: '<rect x="3.5" y="4.5" width="17" height="16.5" rx="2"/><path d="M8 2.5v4M16 2.5v4M3.5 10h17"/>',
  caixa: '<rect x="3" y="8.5" width="18" height="12" rx="1.5"/><path d="M3 12.5h18"/><path d="M8 8.5 10.5 3M16 8.5 13.5 3"/><path d="M10 16.5h4"/>',
};
const icone = (nome, cls) => `<svg class="ic ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${IC[nome]}</svg>`;

/* ---------- toast ---------- */
function toast(msg, tipo = "ok") {
  const el = document.createElement("div");
  el.className = "toast " + tipo;
  el.innerHTML = icone(tipo === "ok" ? "check" : "alerta") + `<span></span>`;
  el.lastElementChild.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ---------- modal ---------- */
function abrirModal(html, larga) {
  const veu = $("#veu");
  veu.innerHTML = `<div class="modal ${larga ? "larga" : ""}">${html}</div>`;
  veu.classList.add("aberto");
  return veu.firstElementChild;
}
function fecharModal() {
  $("#veu").classList.remove("aberto");
  $("#veu").innerHTML = "";
}
function confirmar(titulo, msg, rotulo = "Confirmar", perigo = false) {
  return new Promise((res) => {
    const m = abrirModal(`
      <h3></h3><p style="color:var(--ink-2);font-size:14px"></p>
      <div class="linha-botoes">
        <button class="btn btn-fantasma" data-n>Cancelar</button>
        <button class="btn ${perigo ? "btn-perigo" : "btn-azul"}" data-s style="${perigo ? "border:1px solid rgba(242,105,92,.4)" : ""}"></button>
      </div>`);
    m.querySelector("h3").textContent = titulo;
    m.querySelector("p").textContent = msg;
    m.querySelector("[data-s]").textContent = rotulo;
    m.querySelector("[data-n]").onclick = () => { fecharModal(); res(false); };
    m.querySelector("[data-s]").onclick = () => { fecharModal(); res(true); };
  });
}

/* ============================================================
   dados
   ============================================================ */
async function carregarTudo() {
  const [cfg, prod, cli, ven, itens, chq] = await Promise.all([
    db.from("jp_config").select("*").eq("id", 1).single(),
    db.from("jp_produtos").select("*").order("nome"),
    db.from("jp_clientes").select("*").order("nome"),
    db.from("jp_vendas").select("*").order("numero", { ascending: false }),
    db.from("jp_venda_itens").select("*"),
    db.from("jp_cheques").select("*").order("bom_para"),
  ]);
  const erro = cfg.error || prod.error || cli.error || ven.error || itens.error || chq.error;
  if (erro) throw erro;
  S.config = cfg.data;
  S.produtos = prod.data;
  S.clientes = cli.data;
  S.vendas = ven.data;
  S.cheques = chq.data;
  S.itens = new Map();
  for (const it of itens.data) {
    if (!S.itens.has(it.venda_id)) S.itens.set(it.venda_id, []);
    S.itens.get(it.venda_id).push(it);
  }
}

const chequesPraDepositar = () => S.cheques.filter((c) => !c.depositado && diasAte(c.bom_para) <= 0);
const vendaDoId = (id) => S.vendas.find((v) => v.id === id);

/* ============================================================
   navegação
   ============================================================ */
const ABAS = [
  ["venda", "Nova venda", "venda"],
  ["notas", "Notas", "notas"],
  ["produtos", "Produtos", "produtos"],
  ["entregas", "Entregas", "entregas"],
  ["pagamentos", "Pagamentos", "pagamentos"],
  ["financeiro", "Financeiro", "financeiro"],
  ["ajustes", "Ajustes", "ajustes"],
];

function montarRail() {
  $("#rail").innerHTML = `
    <div class="marca-rail">${marcaMini()}</div>
    ${ABAS.slice(0, 6).map(railBtn).join("")}
    <div class="respiro"></div>
    ${railBtn(ABAS[6])}`;
  $$(".rail-btn").forEach((b) => (b.onclick = () => irPara(b.dataset.aba)));
}
function railBtn([id, nome, ic]) {
  return `<button class="rail-btn" data-aba="${id}" aria-label="${nome}">
    ${icone(ic)}<span class="rotulo">${nome}</span>
    ${id === "financeiro" ? '<span class="pino" id="pino-fin" style="display:none"></span>' : ""}
  </button>`;
}
function marcaMini() {
  if (S.config?.logo_dataurl) return `<img src="${S.config.logo_dataurl}" style="width:40px;height:40px;object-fit:contain;background:#fff;border-radius:10px;padding:3px">`;
  return '<div class="monograma mini">JP</div>';
}

function irPara(aba) {
  S.aba = aba;
  $$(".rail-btn").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
  RENDER[aba]();
  atualizarAvisos();
  $("#main").scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

function atualizarAvisos() {
  const devidos = chequesPraDepositar();
  const pino = $("#pino-fin");
  if (pino) {
    pino.style.display = devidos.length ? "block" : "none";
    pino.textContent = devidos.length;
  }
  const banner = $("#banner-cheques");
  if (devidos.length && S.aba !== "financeiro" && !sessionStorage.getItem("banner-ok")) {
    banner.classList.add("visivel");
    $("#banner-texto").textContent =
      devidos.length === 1
        ? `1 cheque pra depositar (${fmtBRL(devidos[0].valor)} · ${devidos[0].cliente_nome || "sem cliente"})`
        : `${devidos.length} cheques pra depositar — total ${fmtBRL(devidos.reduce((s, c) => s + Number(c.valor), 0))}`;
  } else {
    banner.classList.remove("visivel");
  }
}

/* topo padrão da aba */
function topo(titulo, sub, acaoHtml) {
  return `<div class="topo"><div><h2>${titulo}</h2><div class="sub">${sub || ""}</div></div><div>${acaoHtml || ""}</div></div>`;
}
function vazio(ic, titulo, msg, botao) {
  return `<div class="vazio">${icone(ic, "ic-grande")}<h3>${titulo}</h3><p>${msg}</p>${botao || ""}</div>`;
}

/* ============================================================
   COMBOBOX genérico
   ============================================================ */
function ligarCombo(entrada, lista, fonte, aoEscolher, aoCriar, rotuloCriar) {
  let opcoesVivas = [];
  function abrir() { render(); lista.classList.add("aberta"); }
  function fechar() { setTimeout(() => lista.classList.remove("aberta"), 140); }
  function render() {
    const q = entrada.value.trim().toLowerCase();
    opcoesVivas = fonte().filter((o) => !q || o.rotulo.toLowerCase().includes(q)).slice(0, 40);
    let html = opcoesVivas
      .map((o, i) => `<button type="button" class="combo-item" data-i="${i}"><span>${escapa(o.rotulo)}</span>${o.direita ? `<span class="preco dinheiro">${o.direita}</span>` : ""}</button>`)
      .join("");
    if (!opcoesVivas.length && !aoCriar) html = `<div class="combo-vazio">Nada encontrado</div>`;
    if (aoCriar && entrada.value.trim()) {
      html += `<button type="button" class="combo-item novo" data-criar>＋ ${rotuloCriar} “${escapa(entrada.value.trim())}”</button>`;
    }
    lista.innerHTML = html;
    $$(".combo-item[data-i]", lista).forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); aoEscolher(opcoesVivas[+b.dataset.i]); fechar(); }));
    const criar = $("[data-criar]", lista);
    if (criar) criar.onmousedown = (e) => { e.preventDefault(); aoCriar(entrada.value.trim()); fechar(); };
  }
  entrada.addEventListener("focus", abrir);
  entrada.addEventListener("input", render);
  entrada.addEventListener("blur", fechar);
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (opcoesVivas.length) { aoEscolher(opcoesVivas[0]); fechar(); }
      else if (aoCriar && entrada.value.trim()) { aoCriar(entrada.value.trim()); fechar(); }
    }
  });
}
const escapa = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ============================================================
   ABA — NOVA VENDA
   ============================================================ */
function renderVenda() {
  if (!V) V = novaVendaVazia();
  $("#conteudo").innerHTML = `
    ${topo("Nova venda", "Monta o pedido, salva e imprime a notinha")}
    <div class="venda-grade">
      <div>
        <div class="cartao">
          <div class="campo combo">
            <label>Cliente</label>
            <input class="entrada" id="v-cliente" placeholder="Nome do cliente…" autocomplete="off" value="${escapa(V.cliente_nome)}">
            <div class="combo-lista" id="v-cliente-lista"></div>
          </div>
          <div class="cab-itens"><span>Produto</span><span>Qtd</span><span>Preço un.</span><span style="text-align:right">Subtotal</span><span></span></div>
          <div class="itens-lista" id="v-itens"></div>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-fantasma" id="v-add-item">＋ Adicionar produto</button>
          </div>
        </div>
        <div class="cartao" style="margin-top:16px;display:grid;gap:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="campo">
              <label>Forma de pagamento</label>
              <select id="v-forma">
                ${["dinheiro:Dinheiro", "pix:Pix", "cartao:Cartão", "cheque:Cheque", "prazo:A prazo"]
                  .map((o) => { const [v, r] = o.split(":"); return `<option value="${v}" ${V.forma === v ? "selected" : ""}>${r}</option>`; }).join("")}
              </select>
            </div>
            <div class="campo">
              <label>Situação</label>
              <select id="v-pago">
                <option value="nao" ${!V.pago ? "selected" : ""}>Paga depois</option>
                <option value="sim" ${V.pago ? "selected" : ""}>Já pagou</option>
              </select>
            </div>
          </div>
          <div id="v-area-cheque"></div>
          <div class="campo">
            <label>Observação (sai na notinha)</label>
            <input class="entrada" id="v-obs" placeholder="Opcional" value="${escapa(V.obs)}">
          </div>
        </div>
      </div>
      <div class="resumo-venda cartao">
        <div class="linha"><span>Subtotal</span><span class="dinheiro" id="v-subtotal">R$ 0,00</span></div>
        <div class="linha desconto-campo">
          <span>Desconto</span>
          <input class="entrada" id="v-desconto" inputmode="decimal" placeholder="0,00" style="width:110px" value="${V.desconto ? String(V.desconto).replace(".", ",") : ""}">
        </div>
        <div class="linha total"><span>Total</span><span class="dinheiro" id="v-total">R$ 0,00</span></div>
        <button class="btn btn-azul btn-grande" id="v-salvar">${icone("imprimir")} Salvar e ver notinha</button>
        <button class="btn btn-fantasma" id="v-limpar">Limpar tudo</button>
      </div>
    </div>`;

  // cliente
  ligarCombo(
    $("#v-cliente"), $("#v-cliente-lista"),
    () => S.clientes.map((c) => ({ rotulo: c.nome, id: c.id, tel: c.telefone })),
    (o) => { V.cliente_id = o.id; V.cliente_nome = o.rotulo; $("#v-cliente").value = o.rotulo; },
    (nome) => { V.cliente_id = null; V.cliente_nome = nome; $("#v-cliente").value = nome; },
    "Usar cliente novo"
  );
  $("#v-cliente").addEventListener("input", () => { V.cliente_id = null; V.cliente_nome = $("#v-cliente").value; });

  $("#v-add-item").onclick = () => { V.itens.push({ produto_id: null, nome: "", unidade: "un", qtd: 1, preco: 0 }); renderItens(); focarUltimoProduto(); };
  $("#v-forma").onchange = (e) => { V.forma = e.target.value; renderAreaCheque(); };
  $("#v-pago").onchange = (e) => { V.pago = e.target.value === "sim"; };
  $("#v-obs").oninput = (e) => { V.obs = e.target.value; };
  $("#v-desconto").oninput = (e) => { V.desconto = aParaNum(e.target.value); recalc(); };
  $("#v-limpar").onclick = async () => {
    if (V.itens.length || V.cliente_nome) { if (!(await confirmar("Limpar venda", "Joga fora tudo que está montado nessa venda.", "Limpar", true))) return; }
    V = novaVendaVazia(); renderVenda();
  };
  $("#v-salvar").onclick = salvarVenda;

  if (!V.itens.length) V.itens.push({ produto_id: null, nome: "", unidade: "un", qtd: 1, preco: 0 });
  renderItens();
  renderAreaCheque();
}

function focarUltimoProduto() {
  const campos = $$("#v-itens .prod-in");
  campos[campos.length - 1]?.focus();
}

function renderItens() {
  const caixa = $("#v-itens");
  caixa.innerHTML = V.itens.map((it, i) => `
    <div class="item-linha">
      <div class="combo">
        <input class="entrada prod-in" data-i="${i}" placeholder="Digite pra buscar…" autocomplete="off" value="${escapa(it.nome)}">
        <div class="combo-lista" data-lista="${i}"></div>
      </div>
      <input class="entrada qtd-in" data-i="${i}" inputmode="decimal" value="${fmtQtd(it.qtd)}">
      <input class="entrada preco-in dinheiro" data-i="${i}" inputmode="decimal" value="${it.preco ? Number(it.preco).toFixed(2).replace(".", ",") : ""}" placeholder="0,00">
      <div class="dinheiro sub-item" data-sub="${i}">${fmtBRL(it.qtd * it.preco)}</div>
      <button class="btn-icone perigo" data-tira="${i}" aria-label="Tirar item">${icone("x")}</button>
    </div>`).join("");

  V.itens.forEach((it, i) => {
    const entrada = $(`.prod-in[data-i="${i}"]`);
    ligarCombo(
      entrada, $(`[data-lista="${i}"]`),
      () => S.produtos.filter((p) => p.ativo).map((p) => ({ rotulo: p.nome, id: p.id, direita: fmtBRL(p.preco), preco: p.preco, unidade: p.unidade })),
      (o) => { it.produto_id = o.id; it.nome = o.rotulo; it.preco = Number(o.preco); it.unidade = o.unidade; renderItens(); recalc(); },
      (nome) => quickAddProduto(nome, it),
      "Cadastrar produto"
    );
    entrada.addEventListener("input", () => { it.produto_id = null; it.nome = entrada.value; });
    $(`.qtd-in[data-i="${i}"]`).addEventListener("input", (e) => { it.qtd = aParaNum(e.target.value) || 0; atualizaSub(i); });
    $(`.preco-in[data-i="${i}"]`).addEventListener("input", (e) => { it.preco = aParaNum(e.target.value); atualizaSub(i); });
    $(`[data-tira="${i}"]`).onclick = () => { V.itens.splice(i, 1); renderItens(); recalc(); };
  });
  recalc();
}
function atualizaSub(i) {
  const it = V.itens[i];
  const el = $(`[data-sub="${i}"]`);
  if (el) el.textContent = fmtBRL(it.qtd * it.preco);
  recalc();
}
function recalc() {
  const sub = V.itens.reduce((s, it) => s + it.qtd * it.preco, 0);
  const desc = Math.min(V.desconto || 0, sub);
  $("#v-subtotal").textContent = fmtBRL(sub);
  $("#v-total").textContent = fmtBRL(sub - desc);
}

/* cadastro de produto na hora (sem sair da venda) */
function quickAddProduto(nome, itemDestino, aoTerminar) {
  const m = abrirModal(`
    <h3>Cadastrar produto</h3>
    <div style="display:grid;gap:12px">
      <div class="campo"><label>Nome</label><input class="entrada" id="qa-nome" value="${escapa(nome || "")}"></div>
      <div style="display:grid;grid-template-columns:1fr 120px;gap:12px">
        <div class="campo"><label>Preço (R$)</label><input class="entrada dinheiro" id="qa-preco" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo"><label>Unidade</label>
          <select id="qa-un"><option>un</option><option>pç</option><option>m</option><option>cx</option><option>kg</option><option>jg</option></select>
        </div>
      </div>
    </div>
    <div class="linha-botoes">
      <button class="btn btn-fantasma" id="qa-cancela">Cancelar</button>
      <button class="btn btn-azul" id="qa-salva">Salvar produto</button>
    </div>`);
  $("#qa-preco").focus();
  $("#qa-cancela").onclick = fecharModal;
  $("#qa-salva").onclick = async () => {
    const nm = $("#qa-nome").value.trim();
    const preco = aParaNum($("#qa-preco").value);
    if (!nm) return toast("Dá um nome pro produto", "err");
    const btn = $("#qa-salva"); btn.disabled = true;
    const { data, error } = await db.from("jp_produtos").insert({ nome: nm, preco, unidade: $("#qa-un").value }).select().single();
    if (error) { btn.disabled = false; return toast("Não salvou: " + error.message, "err"); }
    S.produtos.push(data);
    S.produtos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    fecharModal();
    toast(`Produto “${data.nome}” cadastrado`);
    if (itemDestino) {
      itemDestino.produto_id = data.id; itemDestino.nome = data.nome;
      itemDestino.preco = Number(data.preco); itemDestino.unidade = data.unidade;
      renderItens(); recalc();
    }
    aoTerminar?.(data);
  };
}

/* área de cheques dentro da venda */
function renderAreaCheque() {
  const area = $("#v-area-cheque");
  if (!area) return;
  if (V.forma !== "cheque") { area.innerHTML = ""; V.cheques = []; return; }
  area.innerHTML = `
    <div class="campos-cheque">
      <div style="font-weight:600;display:flex;align-items:center;gap:8px">${icone("cheque")} Cheques desse pedido</div>
      <div class="cheques-pilha" id="v-cheques-pilha"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="campo"><label>Valor (R$)</label><input class="entrada dinheiro" id="ch-valor" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo"><label>Bom para (data)</label><input class="entrada" type="date" id="ch-data" value="${hojeISO()}"></div>
        <div class="campo"><label>Banco</label><input class="entrada" id="ch-banco" placeholder="Opcional"></div>
        <div class="campo"><label>Nº do cheque</label><input class="entrada" id="ch-num" placeholder="Opcional"></div>
      </div>
      <button class="btn btn-fantasma" id="ch-add">＋ Guardar esse cheque</button>
    </div>`;
  pintarChequesDaVenda();
  $("#ch-add").onclick = () => {
    const valor = aParaNum($("#ch-valor").value);
    const data = $("#ch-data").value;
    if (!valor) return toast("Valor do cheque tá vazio", "err");
    if (!data) return toast("Falta a data do cheque", "err");
    V.cheques.push({ valor, bom_para: data, banco: $("#ch-banco").value.trim(), numero: $("#ch-num").value.trim() });
    $("#ch-valor").value = ""; $("#ch-banco").value = ""; $("#ch-num").value = "";
    pintarChequesDaVenda();
  };
}
function pintarChequesDaVenda() {
  const pilha = $("#v-cheques-pilha");
  if (!pilha) return;
  pilha.innerHTML = V.cheques.map((c, i) => `
    <div class="cheque-chip">
      <span><b class="dinheiro">${fmtBRL(c.valor)}</b> · bom p/ ${fmtData(c.bom_para)}${c.banco ? " · " + escapa(c.banco) : ""}</span>
      <button class="btn-icone perigo" data-chx="${i}">${icone("x")}</button>
    </div>`).join("") || `<div style="color:var(--ink-3);font-size:13px">Nenhum cheque guardado ainda — preenche aí embaixo.</div>`;
  $$("[data-chx]", pilha).forEach((b) => (b.onclick = () => { V.cheques.splice(+b.dataset.chx, 1); pintarChequesDaVenda(); }));
}

/* salvar venda */
async function salvarVenda() {
  const nomeCliente = V.cliente_nome.trim();
  const itensValidos = V.itens.filter((it) => it.nome.trim() && it.qtd > 0);
  if (!nomeCliente) return toast("Falta o nome do cliente", "err");
  if (!itensValidos.length) return toast("A venda precisa de pelo menos 1 produto", "err");
  if (V.forma === "cheque" && !V.cheques.length) return toast("Forma é cheque — guarda o cheque ali embaixo", "err");

  const btn = $("#v-salvar");
  btn.disabled = true;
  btn.innerHTML = `<span class="girando"></span> Salvando…`;
  try {
    // cliente: acha ou cria
    let clienteId = V.cliente_id;
    if (!clienteId) {
      const jaTem = S.clientes.find((c) => c.nome.trim().toLowerCase() === nomeCliente.toLowerCase());
      if (jaTem) clienteId = jaTem.id;
      else {
        const { data, error } = await db.from("jp_clientes").insert({ nome: nomeCliente }).select().single();
        if (error) throw error;
        S.clientes.push(data);
        clienteId = data.id;
      }
    }
    const subtotal = itensValidos.reduce((s, it) => s + it.qtd * it.preco, 0);
    const desconto = Math.min(V.desconto || 0, subtotal);
    const agora = new Date().toISOString();
    const { data: venda, error: eV } = await db.from("jp_vendas").insert({
      cliente_id: clienteId, cliente_nome: nomeCliente,
      subtotal: subtotal.toFixed(2), desconto: desconto.toFixed(2), total: (subtotal - desconto).toFixed(2),
      forma_pagamento: V.forma, pago: V.pago, pago_em: V.pago ? agora : null, obs: V.obs.trim(),
    }).select().single();
    if (eV) throw eV;

    const linhas = itensValidos.map((it) => ({
      venda_id: venda.id, produto_id: it.produto_id, produto_nome: it.nome.trim(),
      unidade: it.unidade || "un", qtd: it.qtd, preco_unit: it.preco.toFixed(2),
      subtotal: (it.qtd * it.preco).toFixed(2),
    }));
    const { data: itensGravados, error: eI } = await db.from("jp_venda_itens").insert(linhas).select();
    if (eI) throw eI;

    if (V.cheques.length) {
      const { error: eC } = await db.from("jp_cheques").insert(V.cheques.map((c) => ({
        venda_id: venda.id, cliente_nome: nomeCliente, valor: c.valor.toFixed(2),
        bom_para: c.bom_para, banco: c.banco, numero: c.numero,
      })));
      if (eC) throw eC;
      const { data } = await db.from("jp_cheques").select("*").order("bom_para");
      S.cheques = data || S.cheques;
    }

    S.vendas.unshift(venda);
    S.itens.set(venda.id, itensGravados);
    V = novaVendaVazia();
    toast(`Venda ${numNota(venda.numero)} salva!`);
    atualizarAvisos();
    abrirNota(venda.id);
    renderVenda();
  } catch (err) {
    toast("Deu erro ao salvar: " + (err.message || err), "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icone("imprimir")} Salvar e ver notinha`;
  }
}

/* ============================================================
   NOTINHA — montagem e impressão
   ============================================================ */
function htmlNota(venda) {
  const cfg = S.config || {};
  const itens = S.itens.get(venda.id) || [];
  const cliente = S.clientes.find((c) => c.id === venda.cliente_id);
  const formas = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão", cheque: "Cheque", prazo: "A prazo" };
  const linhaEnd = [cfg.endereco, cfg.cidade].filter(Boolean).join(" — ");
  return `
  <div class="nota">
    <div class="nota-cab">
      <div class="empresa">
        ${cfg.logo_dataurl ? `<img src="${cfg.logo_dataurl}" alt="logo">` : `<div class="nota-mono">JP</div>`}
        <div>
          <h1>${escapa(cfg.nome || "JP Distribuidora")}</h1>
          <div class="dados-emp">
            ${cfg.cnpj ? `CNPJ ${escapa(cfg.cnpj)}<br>` : ""}
            ${linhaEnd ? `${escapa(linhaEnd)}<br>` : ""}
            ${cfg.telefone ? escapa(cfg.telefone) : ""}
          </div>
        </div>
      </div>
      <div class="nota-num">
        <div class="rot-nota">NOTA DE PEDIDO</div>
        <div class="numero mono">${numNota(venda.numero)}</div>
        <div class="data-nota">${fmtDataHora(venda.data)}</div>
      </div>
    </div>
    <div class="nota-cliente">
      <div class="par"><div class="r">CLIENTE</div><div class="v">${escapa(venda.cliente_nome)}</div></div>
      ${cliente?.telefone ? `<div class="par"><div class="r">TELEFONE</div><div class="v">${escapa(cliente.telefone)}</div></div>` : ""}
      <div class="par"><div class="r">PAGAMENTO</div><div class="v">${formas[venda.forma_pagamento] || "—"}${venda.pago ? " · pago" : ""}</div></div>
    </div>
    <table class="nota-itens">
      <thead><tr><th style="width:24px">#</th><th>PRODUTO</th><th class="num">QTD</th><th>UN</th><th class="num">PREÇO</th><th class="num">TOTAL</th></tr></thead>
      <tbody>
        ${itens.map((it, i) => `
          <tr>
            <td class="num">${i + 1}</td>
            <td>${escapa(it.produto_nome)}</td>
            <td class="num">${fmtQtd(it.qtd)}</td>
            <td>${escapa(it.unidade)}</td>
            <td class="num">${fmtBRL(it.preco_unit)}</td>
            <td class="num">${fmtBRL(it.subtotal)}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div class="nota-totais">
      <div class="bloco">
        <div class="lin"><span>Subtotal</span><span class="num">${fmtBRL(venda.subtotal)}</span></div>
        ${Number(venda.desconto) > 0 ? `<div class="lin"><span>Desconto</span><span class="num">− ${fmtBRL(venda.desconto)}</span></div>` : ""}
        <div class="lin geral"><span>TOTAL</span><span class="num">${fmtBRL(venda.total)}</span></div>
      </div>
    </div>
    ${venda.obs ? `<div class="nota-obs"><b>Obs.:</b> ${escapa(venda.obs)}</div>` : ""}
    <div class="nota-rodape">
      <div class="nota-pgto">Recebi os produtos descritos<br>nesta nota em perfeitas condições.</div>
      <div class="nota-assina"><div class="risco"></div><div class="quem">Assinatura do cliente</div></div>
    </div>
    <div class="nota-aviso">Documento sem valor fiscal · ${escapa(cfg.nome || "JP Distribuidora")}</div>
  </div>`;
}

function abrirNota(vendaId) {
  const venda = vendaDoId(vendaId);
  if (!venda) return;
  const html = htmlNota(venda);
  $("#print-root").innerHTML = html;
  const m = abrirModal(`
    <div id="modal-nota">
      <h3>Notinha ${numNota(venda.numero)}</h3>
      <div class="folha-scroll">${html}</div>
      <div class="linha-botoes">
        <button class="btn btn-fantasma" id="n-fecha">Fechar</button>
        <button class="btn btn-azul btn-grande" id="n-imprime">${icone("imprimir")} Imprimir</button>
      </div>
    </div>`, true);
  $("#n-fecha").onclick = fecharModal;
  $("#n-imprime").onclick = () => window.print();
}

/* ============================================================
   ABA — NOTAS (histórico + reimpressão)
   ============================================================ */
function renderNotas() {
  const miolo = $("#conteudo");
  miolo.innerHTML = `
    ${topo("Notas", `${S.vendas.length} venda${S.vendas.length === 1 ? "" : "s"} registrada${S.vendas.length === 1 ? "" : "s"}`,
      `<button class="btn btn-azul" id="ir-venda">＋ Nova venda</button>`)}
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div class="busca-caixa">${icone("busca")}<input class="entrada" id="busca-notas" placeholder="Buscar por cliente ou número…"></div>
    </div>
    <div id="lista-notas"></div>`;
  $("#ir-venda").onclick = () => irPara("venda");
  $("#busca-notas").oninput = pintarNotas;
  pintarNotas();
}
function pintarNotas() {
  const q = ($("#busca-notas")?.value || "").trim().toLowerCase();
  const vendas = S.vendas.filter((v) => !q || v.cliente_nome.toLowerCase().includes(q) || String(v.numero).includes(q.replace(/^0+/, "").replace(/\D/g, "")));
  const caixa = $("#lista-notas");
  if (!S.vendas.length) {
    caixa.innerHTML = vazio("notas", "Nenhuma venda ainda", "A primeira notinha do Vinícius nasce na aba Nova venda.", `<button class="btn btn-azul" onclick="irPara('venda')">Fazer a primeira venda</button>`);
    return;
  }
  if (!vendas.length) { caixa.innerHTML = vazio("busca", "Nada encontrado", "Nenhuma nota bate com essa busca."); return; }
  caixa.innerHTML = `
    <div class="tabela-caixa rolagem-x"><table class="tab">
      <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th class="num">Total</th><th>Pagamento</th><th>Entrega</th><th></th></tr></thead>
      <tbody>
        ${vendas.map((v) => `
          <tr>
            <td class="mono" style="color:var(--az);font-weight:600">${String(v.numero).padStart(4, "0")}</td>
            <td class="col-some" style="color:var(--ink-2)">${fmtData(v.data)}</td>
            <td style="font-weight:500">${escapa(v.cliente_nome)}</td>
            <td class="num dinheiro">${fmtBRL(v.total)}</td>
            <td>${v.pago ? `<span class="selo selo-ok">PAGO</span>` : `<span class="selo selo-warn">ABERTO</span>`}</td>
            <td>${v.entregue ? `<span class="selo selo-ok">ENTREGUE</span>` : `<span class="selo selo-neutro">PENDENTE</span>`}</td>
            <td><div class="acoes-linha">
              <button class="btn-icone" data-imprime="${v.id}" aria-label="Imprimir">${icone("imprimir")}</button>
              <button class="btn-icone perigo" data-apaga="${v.id}" aria-label="Excluir">${icone("lixo")}</button>
            </div></td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  $$("[data-imprime]").forEach((b) => (b.onclick = () => abrirNota(b.dataset.imprime)));
  $$("[data-apaga]").forEach((b) => (b.onclick = () => apagarVenda(b.dataset.apaga)));
}
async function apagarVenda(id) {
  const v = vendaDoId(id);
  if (!(await confirmar("Excluir venda", `Apaga de vez a nota ${numNota(v.numero)} de ${v.cliente_nome} (${fmtBRL(v.total)}). Não tem volta.`, "Excluir", true))) return;
  const { error } = await db.from("jp_vendas").delete().eq("id", id);
  if (error) return toast("Não excluiu: " + error.message, "err");
  S.vendas = S.vendas.filter((x) => x.id !== id);
  S.itens.delete(id);
  toast("Venda excluída");
  pintarNotas();
}

/* ============================================================
   ABA — PRODUTOS
   ============================================================ */
function renderProdutos() {
  $("#conteudo").innerHTML = `
    ${topo("Produtos", `${S.produtos.length} cadastrado${S.produtos.length === 1 ? "" : "s"} — dá pra cadastrar direto na venda também`,
      `<button class="btn btn-azul" id="p-novo">＋ Novo produto</button>`)}
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div class="busca-caixa">${icone("busca")}<input class="entrada" id="busca-prod" placeholder="Buscar produto…"></div>
    </div>
    <div id="lista-prod"></div>`;
  $("#p-novo").onclick = () => quickAddProduto("", null, () => pintarProdutos());
  $("#busca-prod").oninput = pintarProdutos;
  pintarProdutos();
}
function pintarProdutos() {
  const q = ($("#busca-prod")?.value || "").trim().toLowerCase();
  const lista = S.produtos.filter((p) => !q || p.nome.toLowerCase().includes(q));
  const caixa = $("#lista-prod");
  if (!S.produtos.length) {
    caixa.innerHTML = vazio("produtos", "Nenhum produto ainda", "Cadastra aqui ou direto na hora da venda — como preferir.", `<button class="btn btn-azul" id="p-primeiro">Cadastrar o primeiro</button>`);
    $("#p-primeiro").onclick = () => quickAddProduto("", null, () => pintarProdutos());
    return;
  }
  if (!lista.length) { caixa.innerHTML = vazio("busca", "Nada encontrado", "Nenhum produto bate com essa busca."); return; }
  caixa.innerHTML = `
    <div class="tabela-caixa rolagem-x"><table class="tab">
      <thead><tr><th>Produto</th><th>Un</th><th class="num">Preço</th><th></th></tr></thead>
      <tbody>
        ${lista.map((p) => `
          <tr style="${p.ativo ? "" : "opacity:.45"}">
            <td style="font-weight:500">${escapa(p.nome)}${p.ativo ? "" : ' <span class="selo selo-neutro">INATIVO</span>'}</td>
            <td style="color:var(--ink-2)">${escapa(p.unidade)}</td>
            <td class="num dinheiro">${fmtBRL(p.preco)}</td>
            <td><div class="acoes-linha">
              <button class="btn-icone" data-edita="${p.id}" aria-label="Editar">${icone("lapis")}</button>
              <button class="btn-icone perigo" data-tira="${p.id}" aria-label="Excluir">${icone("lixo")}</button>
            </div></td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  $$("[data-edita]").forEach((b) => (b.onclick = () => editarProduto(b.dataset.edita)));
  $$("[data-tira]").forEach((b) => (b.onclick = () => apagarProduto(b.dataset.tira)));
}
function editarProduto(id) {
  const p = S.produtos.find((x) => x.id === id);
  const m = abrirModal(`
    <h3>Editar produto</h3>
    <div style="display:grid;gap:12px">
      <div class="campo"><label>Nome</label><input class="entrada" id="e-nome" value="${escapa(p.nome)}"></div>
      <div style="display:grid;grid-template-columns:1fr 120px;gap:12px">
        <div class="campo"><label>Preço (R$)</label><input class="entrada dinheiro" id="e-preco" inputmode="decimal" value="${Number(p.preco).toFixed(2).replace(".", ",")}"></div>
        <div class="campo"><label>Unidade</label>
          <select id="e-un">${["un", "pç", "m", "cx", "kg", "jg"].map((u) => `<option ${p.unidade === u ? "selected" : ""}>${u}</option>`).join("")}</select>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-2)">
        <input type="checkbox" id="e-ativo" ${p.ativo ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--az)"> Produto ativo (aparece na venda)
      </label>
    </div>
    <div class="linha-botoes">
      <button class="btn btn-fantasma" id="e-cancela">Cancelar</button>
      <button class="btn btn-azul" id="e-salva">Salvar</button>
    </div>`);
  $("#e-cancela").onclick = fecharModal;
  $("#e-salva").onclick = async () => {
    const upd = { nome: $("#e-nome").value.trim(), preco: aParaNum($("#e-preco").value).toFixed(2), unidade: $("#e-un").value, ativo: $("#e-ativo").checked };
    if (!upd.nome) return toast("Nome vazio", "err");
    const { data, error } = await db.from("jp_produtos").update(upd).eq("id", id).select().single();
    if (error) return toast("Não salvou: " + error.message, "err");
    Object.assign(p, data);
    S.produtos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    fecharModal(); toast("Produto atualizado"); pintarProdutos();
  };
}
async function apagarProduto(id) {
  const p = S.produtos.find((x) => x.id === id);
  if (!(await confirmar("Excluir produto", `Tira “${p.nome}” da lista. As notas antigas continuam com ele registrado.`, "Excluir", true))) return;
  const { error } = await db.from("jp_produtos").delete().eq("id", id);
  if (error) return toast("Não excluiu: " + error.message, "err");
  S.produtos = S.produtos.filter((x) => x.id !== id);
  toast("Produto excluído");
  pintarProdutos();
}

/* ============================================================
   ABA — ENTREGAS
   ============================================================ */
function resumoItens(vendaId) {
  const itens = S.itens.get(vendaId) || [];
  const partes = itens.slice(0, 3).map((it) => `${fmtQtd(it.qtd)}× ${it.produto_nome}`);
  if (itens.length > 3) partes.push(`+${itens.length - 3}…`);
  return partes.join(" · ") || "sem itens";
}
function renderEntregas() {
  const pendentes = S.vendas.filter((v) => !v.entregue);
  const feitas = S.vendas.filter((v) => v.entregue).slice(0, 8);
  $("#conteudo").innerHTML = `
    ${topo("Entregas", pendentes.length ? `${pendentes.length} pedido${pendentes.length === 1 ? "" : "s"} esperando entrega` : "Tudo entregue ✓")}
    <div id="ent-pend">
      ${pendentes.length ? pendentes.map((v) => `
        <div class="pendencia">
          <div class="info">
            <div class="titulo"><span class="mono" style="color:var(--az)">${String(v.numero).padStart(4, "0")}</span> ${escapa(v.cliente_nome)}
              ${v.pago ? '<span class="selo selo-ok">PAGO</span>' : '<span class="selo selo-warn">ABERTO</span>'}</div>
            <div class="detalhe">${fmtData(v.data)} · ${escapa(resumoItens(v.id))}</div>
          </div>
          <div class="valor-p">${fmtBRL(v.total)}</div>
          <button class="btn btn-ok" data-entrega="${v.id}">${icone("check")} Entregue</button>
        </div>`).join("")
      : vazio("entregas", "Nada pra entregar", "Quando uma venda for salva, ela aparece aqui até você marcar como entregue.")}
    </div>
    ${feitas.length ? `<div class="secao-rotulo">Últimas entregues</div>
      ${feitas.map((v) => `
        <div class="pendencia" style="opacity:.65">
          <div class="info">
            <div class="titulo"><span class="mono">${String(v.numero).padStart(4, "0")}</span> ${escapa(v.cliente_nome)}</div>
            <div class="detalhe">entregue ${v.entregue_em ? fmtData(v.entregue_em) : ""}</div>
          </div>
          <button class="btn-icone" data-desentrega="${v.id}" aria-label="Desfazer">${icone("desfazer")}</button>
        </div>`).join("")}` : ""}`;
  $$("[data-entrega]").forEach((b) => (b.onclick = () => marcarEntrega(b.dataset.entrega, true)));
  $$("[data-desentrega]").forEach((b) => (b.onclick = () => marcarEntrega(b.dataset.desentrega, false)));
}
async function marcarEntrega(id, valor) {
  const { data, error } = await db.from("jp_vendas").update({ entregue: valor, entregue_em: valor ? new Date().toISOString() : null }).eq("id", id).select().single();
  if (error) return toast("Deu erro: " + error.message, "err");
  Object.assign(vendaDoId(id), data);
  toast(valor ? `Entrega da ${numNota(data.numero)} confirmada` : "Entrega desfeita");
  renderEntregas();
}

/* ============================================================
   ABA — PAGAMENTOS
   ============================================================ */
function renderPagamentos() {
  const formas = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão", cheque: "Cheque", prazo: "A prazo" };
  const abertas = S.vendas.filter((v) => !v.pago);
  const totalAberto = abertas.reduce((s, v) => s + Number(v.total), 0);
  const pagas = S.vendas.filter((v) => v.pago).slice(0, 8);
  $("#conteudo").innerHTML = `
    ${topo("Pagamentos", abertas.length ? `${abertas.length} em aberto — ${fmtBRL(totalAberto)} pra receber` : "Ninguém devendo ✓")}
    ${abertas.length ? abertas.map((v) => `
      <div class="pendencia">
        <div class="info">
          <div class="titulo"><span class="mono" style="color:var(--az)">${String(v.numero).padStart(4, "0")}</span> ${escapa(v.cliente_nome)}
            <span class="selo selo-az">${formas[v.forma_pagamento] || "—"}</span></div>
          <div class="detalhe">${fmtData(v.data)} · ${escapa(resumoItens(v.id))}</div>
        </div>
        <div class="valor-p">${fmtBRL(v.total)}</div>
        <button class="btn btn-ok" data-paga="${v.id}">${icone("check")} Recebi</button>
      </div>`).join("")
    : vazio("pagamentos", "Nada em aberto", "As vendas que ficarem pra pagar depois aparecem aqui até o dinheiro entrar.")}
    ${pagas.length ? `<div class="secao-rotulo">Últimas pagas</div>
      ${pagas.map((v) => `
        <div class="pendencia" style="opacity:.65">
          <div class="info">
            <div class="titulo"><span class="mono">${String(v.numero).padStart(4, "0")}</span> ${escapa(v.cliente_nome)}</div>
            <div class="detalhe">pago ${v.pago_em ? fmtData(v.pago_em) : ""} · ${formas[v.forma_pagamento] || ""}</div>
          </div>
          <div class="valor-p" style="color:var(--ok)">${fmtBRL(v.total)}</div>
          <button class="btn-icone" data-despaga="${v.id}" aria-label="Desfazer">${icone("desfazer")}</button>
        </div>`).join("")}` : ""}`;
  $$("[data-paga]").forEach((b) => (b.onclick = () => receberVenda(b.dataset.paga)));
  $$("[data-despaga]").forEach((b) => (b.onclick = () => marcarPago(b.dataset.despaga, false)));
}
async function receberVenda(id) {
  const v = vendaDoId(id);
  const temCheque = S.cheques.some((c) => c.venda_id === id);
  if (v.forma_pagamento === "cheque" && !temCheque) {
    modalChequeAvulso(v, () => marcarPago(id, true));
    return;
  }
  marcarPago(id, true);
}
async function marcarPago(id, valor) {
  const { data, error } = await db.from("jp_vendas").update({ pago: valor, pago_em: valor ? new Date().toISOString() : null }).eq("id", id).select().single();
  if (error) return toast("Deu erro: " + error.message, "err");
  Object.assign(vendaDoId(id), data);
  toast(valor ? `${numNota(data.numero)} marcada como paga` : "Pagamento desfeito");
  renderPagamentos();
  atualizarAvisos();
}

/* cheque avulso (na hora de receber, ou direto no financeiro) */
function modalChequeAvulso(venda, aoGravar) {
  const m = abrirModal(`
    <h3>${venda ? `Cheque da ${numNota(venda.numero)} — ${escapa(venda.cliente_nome)}` : "Cadastrar cheque"}</h3>
    <div style="display:grid;gap:12px">
      ${venda ? "" : `<div class="campo"><label>Cliente</label><input class="entrada" id="ca-cli" placeholder="De quem é o cheque"></div>`}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="campo"><label>Valor (R$)</label><input class="entrada dinheiro" id="ca-valor" inputmode="decimal" value="${venda ? Number(venda.total).toFixed(2).replace(".", ",") : ""}" placeholder="0,00"></div>
        <div class="campo"><label>Bom para (data)</label><input class="entrada" type="date" id="ca-data" value="${hojeISO()}"></div>
        <div class="campo"><label>Banco</label><input class="entrada" id="ca-banco" placeholder="Opcional"></div>
        <div class="campo"><label>Nº do cheque</label><input class="entrada" id="ca-num" placeholder="Opcional"></div>
      </div>
    </div>
    <div class="linha-botoes">
      <button class="btn btn-fantasma" id="ca-cancela">Cancelar</button>
      <button class="btn btn-azul" id="ca-salva">Guardar cheque</button>
    </div>`);
  $("#ca-cancela").onclick = fecharModal;
  $("#ca-salva").onclick = async () => {
    const valor = aParaNum($("#ca-valor").value);
    const data = $("#ca-data").value;
    const cliente = venda ? venda.cliente_nome : $("#ca-cli").value.trim();
    if (!valor) return toast("Valor vazio", "err");
    if (!data) return toast("Falta a data", "err");
    const { data: novo, error } = await db.from("jp_cheques").insert({
      venda_id: venda?.id || null, cliente_nome: cliente, valor: valor.toFixed(2),
      bom_para: data, banco: $("#ca-banco").value.trim(), numero: $("#ca-num").value.trim(),
    }).select().single();
    if (error) return toast("Não salvou: " + error.message, "err");
    S.cheques.push(novo);
    S.cheques.sort((a, b) => a.bom_para.localeCompare(b.bom_para));
    fecharModal();
    toast("Cheque guardado — o sistema te lembra na data");
    atualizarAvisos();
    aoGravar?.();
  };
}

/* ============================================================
   ABA — FINANCEIRO
   ============================================================ */
function renderFinanceiro() {
  const agora = new Date();
  const mesTxt = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const doMes = (iso) => { const d = dataLocal(iso); return d && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); };

  const fatMes = S.vendas.filter((v) => doMes(v.data)).reduce((s, v) => s + Number(v.total), 0);
  const recebidoMes = S.vendas.filter((v) => v.pago && doMes(v.pago_em || v.data)).reduce((s, v) => s + Number(v.total), 0);
  const aReceber = S.vendas.filter((v) => !v.pago).reduce((s, v) => s + Number(v.total), 0);
  const naMao = S.cheques.filter((c) => !c.depositado);
  const naMaoTotal = naMao.reduce((s, c) => s + Number(c.valor), 0);
  const devidos = chequesPraDepositar();

  $("#conteudo").innerHTML = `
    ${topo("Financeiro", `Fechamento de ${mesTxt}`, `<button class="btn btn-fantasma" id="f-cheque-novo">＋ Cadastrar cheque</button>`)}
    <div class="tiles">
      <div class="tile t-az"><div class="rot">${icone("caixa")} Faturamento do mês</div><div class="valor">${fmtBRL(fatMes)}</div><div class="apoio">${S.vendas.filter((v) => doMes(v.data)).length} venda(s)</div></div>
      <div class="tile t-ok"><div class="rot">${icone("check")} Recebido no mês</div><div class="valor">${fmtBRL(recebidoMes)}</div><div class="apoio">dinheiro que já entrou</div></div>
      <div class="tile t-warn"><div class="rot">${icone("alerta")} A receber</div><div class="valor">${fmtBRL(aReceber)}</div><div class="apoio">${S.vendas.filter((v) => !v.pago).length} venda(s) em aberto</div></div>
      <div class="tile ${devidos.length ? "t-err" : "t-az"}"><div class="rot">${icone("cheque")} Cheques na mão</div><div class="valor">${fmtBRL(naMaoTotal)}</div><div class="apoio">${naMao.length} cheque(s)${devidos.length ? ` · ${devidos.length} pra depositar` : ""}</div></div>
    </div>
    <div class="secao-rotulo">Cheques — do mais perto pro mais longe</div>
    <div id="f-cheques">
      ${naMao.length ? naMao.map(linhaCheque).join("")
        : vazio("cheque", "Nenhum cheque guardado", "Quando um cliente pagar com cheque, cadastra aqui (ou na própria venda) que o sistema te lembra do dia de depositar.")}
    </div>
    ${S.cheques.some((c) => c.depositado) ? `<div class="secao-rotulo">Já depositados</div>
      ${S.cheques.filter((c) => c.depositado).slice(-6).reverse().map((c) => `
        <div class="pendencia" style="opacity:.6">
          <div class="info"><div class="titulo dinheiro">${fmtBRL(c.valor)}</div>
          <div class="detalhe">${escapa(c.cliente_nome || "sem cliente")} · depositado ${c.depositado_em ? fmtData(c.depositado_em) : ""}</div></div>
        </div>`).join("")}` : ""}`;
  $("#f-cheque-novo").onclick = () => modalChequeAvulso(null, renderFinanceiro);
  $$("[data-deposita]").forEach((b) => (b.onclick = () => depositarCheque(b.dataset.deposita)));
}
function linhaCheque(c) {
  const dias = diasAte(c.bom_para);
  let selo;
  if (dias < 0) selo = `<span class="selo selo-err">VENCIDO HÁ ${-dias} DIA${dias === -1 ? "" : "S"}</span>`;
  else if (dias === 0) selo = `<span class="selo selo-warn">DEPOSITAR HOJE</span>`;
  else if (dias <= 5) selo = `<span class="selo selo-warn">FALTAM ${dias} DIA${dias === 1 ? "" : "S"}</span>`;
  else selo = `<span class="selo selo-neutro">em ${dias} dias</span>`;
  return `
    <div class="pendencia">
      <div class="info">
        <div class="titulo"><span class="dinheiro" style="font-size:16px">${fmtBRL(c.valor)}</span> ${selo}</div>
        <div class="detalhe">${escapa(c.cliente_nome || "sem cliente")}${c.banco ? " · " + escapa(c.banco) : ""}${c.numero ? " · nº " + escapa(c.numero) : ""} · bom para <b>${fmtData(c.bom_para)}</b></div>
      </div>
      <button class="btn btn-ok" data-deposita="${c.id}">${icone("check")} Depositei</button>
    </div>`;
}
async function depositarCheque(id) {
  const { data, error } = await db.from("jp_cheques").update({ depositado: true, depositado_em: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return toast("Deu erro: " + error.message, "err");
  Object.assign(S.cheques.find((c) => c.id === id), data);
  toast("Cheque marcado como depositado");
  renderFinanceiro();
  atualizarAvisos();
}

/* ============================================================
   ABA — AJUSTES
   ============================================================ */
function renderAjustes() {
  const c = S.config || {};
  $("#conteudo").innerHTML = `
    ${topo("Ajustes", "Dados que saem impressos na notinha")}
    <div class="ajustes-grade">
      <div class="cartao" style="display:grid;gap:14px">
        <div class="campo"><label>Nome da empresa</label><input class="entrada" id="a-nome" value="${escapa(c.nome || "")}"></div>
        <div class="campo"><label>CNPJ</label><input class="entrada" id="a-cnpj" placeholder="00.000.000/0000-00" value="${escapa(c.cnpj || "")}"></div>
        <div class="campo"><label>Telefone / WhatsApp</label><input class="entrada" id="a-tel" value="${escapa(c.telefone || "")}"></div>
        <div class="campo"><label>Endereço</label><input class="entrada" id="a-end" value="${escapa(c.endereco || "")}"></div>
        <div class="campo"><label>Cidade / UF</label><input class="entrada" id="a-cid" value="${escapa(c.cidade || "")}"></div>
        <button class="btn btn-azul" id="a-salvar">Salvar dados</button>
      </div>
      <div class="cartao" style="display:grid;gap:14px">
        <div class="campo"><label>Logo (sai na notinha e no sistema)</label>
          <div class="logo-preview">
            ${c.logo_dataurl ? `<img src="${c.logo_dataurl}" alt="logo">` : `<div class="monograma mini">JP</div>`}
            <div style="display:grid;gap:8px">
              <input type="file" id="a-logo" accept="image/*" style="font-size:13px;color:var(--ink-2)">
              <span style="font-size:12px;color:var(--ink-3)">PNG ou JPG · fica guardada no sistema</span>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-fantasma" id="a-sair" style="justify-self:start">${icone("sair")} Sair do sistema</button>
    </div>`;
  $("#a-salvar").onclick = salvarConfig;
  $("#a-logo").onchange = subirLogo;
  $("#a-sair").onclick = async () => { await db.auth.signOut(); location.reload(); };
}
async function salvarConfig() {
  const upd = {
    nome: $("#a-nome").value.trim() || "JP Distribuidora",
    cnpj: $("#a-cnpj").value.trim(),
    telefone: $("#a-tel").value.trim(),
    endereco: $("#a-end").value.trim(),
    cidade: $("#a-cid").value.trim(),
    atualizado_em: new Date().toISOString(),
  };
  const { data, error } = await db.from("jp_config").update(upd).eq("id", 1).select().single();
  if (error) return toast("Não salvou: " + error.message, "err");
  S.config = data;
  toast("Dados salvos — já saem na próxima notinha");
}
function subirLogo(e) {
  const arq = e.target.files?.[0];
  if (!arq) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = async () => {
      const escala = Math.min(1, 600 / img.width);
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * escala);
      cv.height = Math.round(img.height * escala);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const dataurl = cv.toDataURL("image/png");
      const { data, error } = await db.from("jp_config").update({ logo_dataurl: dataurl, atualizado_em: new Date().toISOString() }).eq("id", 1).select().single();
      if (error) return toast("Não subiu a logo: " + error.message, "err");
      S.config = data;
      toast("Logo salva!");
      montarRail();
      irPara("ajustes");
    };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arq);
}

/* ============================================================
   render por aba
   ============================================================ */
const RENDER = {
  venda: renderVenda,
  notas: renderNotas,
  produtos: renderProdutos,
  entregas: renderEntregas,
  pagamentos: renderPagamentos,
  financeiro: renderFinanceiro,
  ajustes: renderAjustes,
};

/* ============================================================
   auth + partida
   ============================================================ */
async function entrarNoApp() {
  try {
    await carregarTudo();
  } catch (err) {
    toast("Erro ao carregar os dados: " + (err.message || err), "err");
    return;
  }
  $("#tela-login").style.display = "none";
  $("#app").classList.add("ativo");
  montarRail();
  $("#banner-ver").onclick = () => irPara("financeiro");
  $("#banner-fecha").onclick = () => { sessionStorage.setItem("banner-ok", "1"); $("#banner-cheques").classList.remove("visivel"); };
  irPara("venda");
}

async function partida() {
  const { data: { session } } = await db.auth.getSession();
  if (session) { entrarNoApp(); return; }
  $("#tela-login").style.display = "grid";
  $("#form-login").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#btn-entrar");
    btn.disabled = true;
    btn.innerHTML = '<span class="girando"></span> Entrando…';
    $("#login-erro").textContent = "";
    const { error } = await db.auth.signInWithPassword({ email: EMAIL_FIXO, password: $("#senha").value });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Entrar";
      $("#login-erro").textContent = "Senha errada — tenta de novo.";
      return;
    }
    entrarNoApp();
  };
}

partida();
