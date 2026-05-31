let carrinho = [];
let clienteLogado = JSON.parse(localStorage.getItem("clienteLogadoAgafarma")) || null;
let produtos = [];
let cupomAtual = null;

const listaProdutos = document.getElementById("listaProdutos");
const numeroCarrinho = document.getElementById("contador");
const itensCarrinho = document.getElementById("itensCarrinho");
const totalCarrinho = document.getElementById("totalCarrinho");

criarModalLogin();
atualizarBotaoLogin();
carregarProdutos();
carregarCuponsCliente();

function atualizarBotaoLogin(){
  const botaoLogin = document.querySelector('button[onclick="abrirLogin()"]');
  if(!botaoLogin) return;
  botaoLogin.innerHTML = clienteLogado ? "✅ Logado" : "Entrar / Cadastrar";
}

function calcularPrecoFinal(produto){
  const valor = Number(produto.valor);
  const desconto = Number(produto.desconto) || 0;

  if(produto.promocao && desconto > 0){
    return valor - (valor * desconto / 100);
  }

  return valor;
}

async function carregarProdutos(){
  listaProdutos.innerHTML = "<p class='sem-pedidos'>Carregando produtos...</p>";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if(error){
    console.log(error);
    listaProdutos.innerHTML = "<p class='sem-pedidos'>Erro ao carregar produtos.</p>";
    return;
  }

  produtos = data || [];
  listaProdutos.innerHTML = "";

  if(produtos.length === 0){
    listaProdutos.innerHTML = "<p class='sem-pedidos'>Nenhum produto cadastrado.</p>";
    return;
  }

  produtos.forEach(produto => {
    const precoFinal = calcularPrecoFinal(produto);
    const desconto = Number(produto.desconto) || 0;

    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.nome = produto.nome || "";
    card.dataset.categoria = produto.categoria || "";
    card.dataset.promocao = produto.promocao ? "sim" : "nao";

    card.innerHTML = `
      <img src="${produto.imagem || "logo.png"}" alt="${produto.nome || "Produto"}">

      <div class="info">
        <span class="categoria">
          ${produto.promocao ? "🔥 Promoção" : produto.categoria}
        </span>

        <h2>${produto.nome}</h2>

        <p>Marca: ${produto.marca || "Não informado"}</p>
        <p>Laboratório: ${produto.laboratorio || "Não informado"}</p>
        <p>${produto.descricao || ""}</p>
        <p>Estoque: ${produto.quantidade}</p>

        ${
          produto.promocao && desconto > 0
          ? `
            <div class="preco-antigo">
              R$ ${Number(produto.valor).toFixed(2).replace(".", ",")}
            </div>

            <div class="preco">
              R$ ${precoFinal.toFixed(2).replace(".", ",")}
            </div>

            <p class="desconto-produto">
              ${desconto}% OFF
            </p>
          `
          : `
            <div class="preco">
              R$ ${Number(produto.valor).toFixed(2).replace(".", ",")}
            </div>
          `
        }

        <button class="botao" onclick="adicionarCarrinho(${produto.id})">
          Adicionar ao carrinho
        </button>
      </div>
    `;

    listaProdutos.appendChild(card);
  });
}

async function carregarCuponsCliente(){
  const lista = document.getElementById("listaCuponsCliente");
  if(!lista) return;

  lista.innerHTML = "<p class='sem-pedidos'>Carregando cupons...</p>";

  const { data, error } = await supabaseClient
    .from("cupons")
    .select("*")
    .eq("ativo", true)
    .order("id", { ascending: false });

  if(error){
    console.log(error);
    lista.innerHTML = "<p class='sem-pedidos'>Erro ao carregar cupons.</p>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<p class='sem-pedidos'>Nenhum cupom disponível no momento.</p>";
    return;
  }

  lista.innerHTML = "";

  data.forEach(cupom => {
    const div = document.createElement("div");
    div.classList.add("cupom-card");

    div.innerHTML = `
      <strong>${cupom.codigo}</strong>

      <span>
        ${
          cupom.tipo === "porcentagem"
          ? `${cupom.valor}% OFF`
          : `R$ ${Number(cupom.valor).toFixed(2).replace(".", ",")} OFF`
        }
      </span>

      <button
        class="botao"
        style="margin-top:10px;width:100%;"
        onclick="aplicarCupomAutomatico('${cupom.codigo}')"
      >
        Usar Cupom
      </button>
    `;

    lista.appendChild(div);
  });
}

async function aplicarCupom(){
  const codigo = document.getElementById("campoCupom").value.trim().toUpperCase();

  if(codigo === ""){
    alert("Digite um cupom.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("cupons")
    .select("*")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();

  if(error){
    console.log(error);
    alert("Erro ao buscar cupom.");
    return;
  }

  if(!data){
    alert("Cupom inválido ou inativo.");
    return;
  }

  cupomAtual = data;
  document.getElementById("cupomAplicado").innerHTML = `Cupom aplicado: ${data.codigo}`;
  atualizarCarrinho();
}

async function aplicarCupomAutomatico(codigoCupom){
  const campo = document.getElementById("campoCupom");
  if(campo) campo.value = codigoCupom;
  await aplicarCupom();
}

function calcularTotalComCupom(total){
  if(!cupomAtual) return total;

  if(cupomAtual.tipo === "porcentagem"){
    return total - (total * Number(cupomAtual.valor) / 100);
  }

  if(cupomAtual.tipo === "valor"){
    return Math.max(0, total - Number(cupomAtual.valor));
  }

  return total;
}

function adicionarCarrinho(id){
  const produto = produtos.find(item => item.id === id);

  if(!produto){
    alert("Produto não encontrado.");
    return;
  }

  if(Number(produto.quantidade) <= 0){
    alert("Produto sem estoque.");
    return;
  }

  const produtoExistente = carrinho.find(item => item.id === id);

  if(produtoExistente){
    if(produtoExistente.quantidade >= Number(produto.quantidade)){
      alert("Quantidade maior que estoque.");
      return;
    }

    produtoExistente.quantidade++;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: calcularPrecoFinal(produto),
      quantidade: 1
    });
  }

  atualizarCarrinho();
}

function atualizarCarrinho(){
  itensCarrinho.innerHTML = "";

  let total = 0;
  let quantidadeTotal = 0;

  carrinho.forEach((item, index) => {
    total += item.preco * item.quantidade;
    quantidadeTotal += item.quantidade;

    const div = document.createElement("div");
    div.classList.add("item-carrinho");

    div.innerHTML = `
      <div>
        <p>${item.nome}</p>
        <span>R$ ${item.preco.toFixed(2).replace(".", ",")}</span>
      </div>

      <div class="quantidade">
        <button onclick="diminuirQuantidade(${index})">-</button>
        <strong>${item.quantidade}</strong>
        <button onclick="aumentarQuantidade(${index})">+</button>
      </div>

      <button class="remover-item" onclick="removerItem(${index})">🗑️</button>
    `;

    itensCarrinho.appendChild(div);
  });

  const totalComCupom = calcularTotalComCupom(total);

  numeroCarrinho.innerHTML = quantidadeTotal;
  totalCarrinho.innerHTML = totalComCupom.toFixed(2).replace(".", ",");
}

function aumentarQuantidade(index){
  const itemCarrinho = carrinho[index];
  const produto = produtos.find(p => p.id === itemCarrinho.id);

  if(produto && itemCarrinho.quantidade >= Number(produto.quantidade)){
    alert("Quantidade maior que estoque.");
    return;
  }

  carrinho[index].quantidade++;
  atualizarCarrinho();
}

function diminuirQuantidade(index){
  if(carrinho[index].quantidade > 1){
    carrinho[index].quantidade--;
  } else {
    carrinho.splice(index, 1);
  }

  atualizarCarrinho();
}

function removerItem(index){
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function abrirMenu(){
  document.getElementById("menuLateral").classList.add("ativo");
}

function fecharMenu(){
  document.getElementById("menuLateral").classList.remove("ativo");
}

function filtrarCategoria(categoria){
  document.querySelectorAll(".card").forEach(card => {
    card.style.display =
      categoria === "todos" || card.dataset.categoria === categoria
      ? "block"
      : "none";
  });

  fecharMenu();
}

function filtrarPromocoes(){
  document.querySelectorAll(".card").forEach(card => {
    card.style.display =
      card.dataset.promocao === "sim"
      ? "block"
      : "none";
  });

  fecharMenu();
}

function pesquisarProduto(){
  const valorPesquisa = document.getElementById("campoPesquisa").value.toLowerCase();

  document.querySelectorAll(".card").forEach(card => {
    const nomeProduto = card.dataset.nome.toLowerCase();

    card.style.display =
      nomeProduto.includes(valorPesquisa)
      ? "block"
      : "none";
  });
}

function criarModalLogin(){
  const modal = document.createElement("div");

  modal.innerHTML = `
    <div class="modal-finalizacao" id="modalLogin">
      <div class="finalizacao-caixa">
        <button class="fechar-finalizacao" onclick="fecharLogin()">×</button>

        <h2>Entrar ou cadastrar</h2>

        <p style="margin-bottom:18px;color:#666;">
          Para finalizar o pedido, informe telefone e senha.
        </p>

        <label>Número de telefone</label>
        <input
          type="text"
          id="loginTelefone"
          placeholder="Ex: 54999999999"
          autocomplete="off"
          inputmode="numeric"
        >

        <label>Senha</label>
        <input
          type="password"
          id="loginSenha"
          placeholder="Digite uma senha"
          autocomplete="new-password"
        >

        <button class="botao confirmar" onclick="entrarOuCadastrar()">
          Entrar / Cadastrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function abrirLogin(){
  document.getElementById("modalLogin").classList.add("ativo");
}

function fecharLogin(){
  document.getElementById("modalLogin").classList.remove("ativo");
}

function telefoneValido(telefone){
  const numeros = telefone.replace(/\D/g, "");
  return numeros.length === 10 || numeros.length === 11;
}

async function entrarOuCadastrar(){
  const telefone = document.getElementById("loginTelefone").value.replace(/\D/g, "");
  const senha = document.getElementById("loginSenha").value;

  if(!telefoneValido(telefone)){
    alert("Digite um telefone válido.");
    return;
  }

  if(senha.length < 4){
    alert("Senha precisa ter 4 caracteres.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("telefone", telefone)
    .maybeSingle();

  if(error){
    console.log(error);
    alert("Erro ao verificar cadastro.");
    return;
  }

  if(data){
    if(data.senha !== senha){
      alert("Senha incorreta.");
      return;
    }

    clienteLogado = data;
  } else {
    const { data: novoCliente, error: erroCadastro } = await supabaseClient
      .from("clientes")
      .insert([{ telefone, senha }])
      .select()
      .single();

    if(erroCadastro){
      console.log(erroCadastro);
      alert("Erro ao cadastrar cliente.");
      return;
    }

    clienteLogado = novoCliente;
  }

  localStorage.setItem("clienteLogadoAgafarma", JSON.stringify(clienteLogado));

  atualizarBotaoLogin();
  alert("✅ Login realizado com sucesso!");
  fecharLogin();
}

function sairConta(){
  localStorage.removeItem("clienteLogadoAgafarma");
  clienteLogado = null;
  atualizarBotaoLogin();
  fecharLogin();
  alert("Conta desconectada.");
}

function abrirFinalizacao(){const carrinhoMobile = document.querySelector(".carrinho-lateral");

if(carrinhoMobile){
  carrinhoMobile.classList.remove("ativo");
}
  if(carrinho.length === 0){
    alert("Adicione produtos no carrinho.");
    return;
  }

  if(!clienteLogado){
    alert("Faça login antes de finalizar.");
    abrirLogin();
    return;
  }

  document.getElementById("modalFinalizacao").classList.add("ativo");

  const celular = document.getElementById("celular");
  if(celular) celular.value = clienteLogado.telefone;
}

function fecharFinalizacao(){
  document.getElementById("modalFinalizacao").classList.remove("ativo");
}

function mostrarEndereco(){
  const tipoEntrega = document.getElementById("tipoEntrega").value;

  document.getElementById("camposEndereco").style.display =
    tipoEntrega === "tele"
    ? "block"
    : "none";
}

function pagamentoEhPix(pagamento){
  const texto = String(pagamento || "").toLowerCase();
  return texto.includes("pix");
}

function mostrarPixNaTela(pix, pedidoId){
  const modal = document.createElement("div");
  modal.className = "modal-finalizacao ativo";
  modal.id = "modalPixGerado";

  const copiaCola = String(pix.pixCopiaECola || "");

  const imagemQr = pix.imagemQrcode
    ? `
      <img
        src="${pix.imagemQrcode}"
        style="width:240px;max-width:100%;margin:15px auto;display:block;border-radius:14px;"
      >
    `
    : "";

  modal.innerHTML = `
    <div class="finalizacao-caixa">
      <h2>Pagamento via PIX</h2>

      <p style="margin-bottom:10px;color:#555;">
        Pedido #${pedidoId} criado com sucesso.
      </p>

      <p style="margin-bottom:15px;color:#555;">
        Escaneie o QR Code ou copie o Pix Copia e Cola abaixo.
      </p>

      <div id="pixContainer">
  ${imagemQr}

  <label>Pix Copia e Cola</label>

  <textarea
    id="pixCopiaEColaGerado"
    readonly
    style="height:130px;"
  >${copiaCola}</textarea>

  <button
    class="botao confirmar"
    onclick="copiarPixGerado()"
  >
    Copiar Pix
  </button>
</div>

      <button
        class="botao"
        onclick="location.reload()"
        style="margin-top:10px;"
      >
        Concluir
      </button>
    </div>
  `;

  document.body.appendChild(modal);

let tentativasPix = 0;
const txid = String(pix.txid || "");

const intervaloPix = setInterval(async () => {
  tentativasPix++;

  console.log("VERIFICANDO PIX AUTOMATICAMENTE", {
    pedidoId,
    txid,
    tentativa: tentativasPix
  });

  const confirmado = await verificarPagamentoPix(pedidoId, txid, true);

  if(confirmado){
    clearInterval(intervaloPix);
    document.getElementById("pixContainer").innerHTML = `
  <div style="
    text-align:center;
    padding:40px 20px;
  ">
    <div style="
      font-size:90px;
      margin-bottom:10px;
    ">
      ✅
    </div>

    <h2 style="
      color:#16a34a;
      margin-bottom:10px;
    ">
      Pagamento Confirmado
    </h2>

    <p>
      Seu pedido foi recebido com sucesso.
    </p>
  </div>
`;
  }

  if(tentativasPix >= 60){
    clearInterval(intervaloPix);
  }
}, 5000);
}

function copiarPixGerado(){
  const campo = document.getElementById("pixCopiaEColaGerado");

  if(!campo){
    alert("Pix não encontrado.");
    return;
  }

  campo.select();
  campo.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(campo.value)
    .then(() => alert("Pix copiado!"))
    .catch(() => {
      document.execCommand("copy");
      alert("Pix copiado!");
    });
}

async function gerarPixPedido(valor, nomeCliente, pedidoId){
  const respostaPix = await fetch("/api/gerar-pix", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      valor:Number(valor.toFixed(2)),
      nome:nomeCliente,
      pedidoId:pedidoId
    })
  });

  const pix = await respostaPix.json();

  console.log("DADOS PIX:", pix);

  if(!respostaPix.ok){
    console.log("ERRO PIX COMPLETO:");
    console.log(JSON.stringify(pix, null, 2));
    alert(JSON.stringify(pix, null, 2));
    throw new Error(pix.erro || "Erro ao gerar Pix.");
  }

  return pix;
}

async function enviarPedido(){
  if(!clienteLogado){
    alert("Faça login antes de finalizar.");
    abrirLogin();
    return;
  }

  const nomeCliente = document.getElementById("nomeCliente").value;
  const tipoEntrega = document.getElementById("tipoEntrega").value;
  const pagamento = document.getElementById("pagamento").value;
  const observacoes = document.getElementById("observacoes").value;

  if(nomeCliente.trim() === ""){
    alert("Digite seu nome.");
    return;
  }

  let enderecoPedido = null;

  if(tipoEntrega === "tele"){
    const endereco = document.getElementById("endereco").value;
    const numero = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;
    const celular = document.getElementById("celular").value;

    if(
      endereco.trim() === "" ||
      numero.trim() === "" ||
      bairro.trim() === "" ||
      celular.trim() === ""
    ){
      alert("Preencha dados da entrega.");
      return;
    }

    enderecoPedido = {
      rua: endereco,
      numero,
      bairro,
      referencia: document.getElementById("referencia").value,
      celular
    };
  }

  let totalBruto = 0;

  carrinho.forEach(item => {
    totalBruto += item.preco * item.quantidade;
  });

  const totalFinal = calcularTotalComCupom(totalBruto);
  const ehPix = pagamentoEhPix(pagamento);

  const { data, error } = await supabaseClient
    .from("pedidos")
    .insert([{
      cliente: nomeCliente,
      telefone_login: clienteLogado.telefone,
      tipo_entrega: tipoEntrega === "tele" ? "Tele-entrega" : "Retirar na farmácia",
      pagamento,
      observacoes,
      produtos: carrinho,
      endereco: enderecoPedido,
      total: Number(totalFinal.toFixed(2)),
      status: ehPix ? "Aguardando pagamento PIX" : "Novo pedido",
cupom: cupomAtual ? cupomAtual.codigo : null,
pix_txid: null,
pix_pago: false,
estoque_baixado: false,
criado_em: new Date().toISOString()
    }])
    .select()
    .single();

  if(error){
    console.log(error);
    alert("Erro ao enviar pedido.");
    return;
  }

  if(ehPix){
    try{
      const pix = await gerarPixPedido(totalFinal, nomeCliente, data.id);

      await supabaseClient
  .from("pedidos")
  .update({
    pix_txid: pix.txid,
    status: "Aguardando pagamento PIX",
    estoque_baixado: false
  })
  .eq("id", data.id);

limparCarrinhoDepoisPedido();

mostrarPixNaTela(pix, data.id);

    }catch(erroPix){
      console.log(erroPix);

      await supabaseClient
        .from("pedidos")
        .update({ status:"Erro ao gerar PIX" })
        .eq("id", data.id);

      alert("Pedido criado, mas houve erro ao gerar o Pix. Entre em contato com a farmácia.");
    }

    return;
  }

  await baixarEstoque();

await supabaseClient
  .from("pedidos")
  .update({
    estoque_baixado: true
  })
  .eq("id", data.id);

alert(`Pedido enviado!\nNúmero: #${data.id}`);

limparCarrinhoDepoisPedido();
}

function limparCarrinhoDepoisPedido(){
  carrinho = [];
  cupomAtual = null;

  const campoCupom = document.getElementById("campoCupom");
  const cupomAplicado = document.getElementById("cupomAplicado");

  if(campoCupom) campoCupom.value = "";
  if(cupomAplicado) cupomAplicado.innerHTML = "";

  atualizarCarrinho();
  fecharFinalizacao();
  carregarProdutos();
}

async function baixarEstoque(){
  for(const item of carrinho){
    const produto = produtos.find(p => p.id === item.id);

    if(produto){
      const novaQuantidade = Math.max(
        0,
        Number(produto.quantidade) - Number(item.quantidade)
      );

      await supabaseClient
        .from("produtos")
        .update({ quantidade: novaQuantidade })
        .eq("id", produto.id);
    }
  }
}

/* MEUS PEDIDOS */

function abrirMeusPedidos(){
  if(!clienteLogado){
    alert("Faça login para ver seus pedidos.");
    abrirLogin();
    return;
  }

  document.getElementById("modalMeusPedidos").classList.add("ativo");
  carregarMeusPedidos();
}

function fecharMeusPedidos(){
  document.getElementById("modalMeusPedidos").classList.remove("ativo");
}

async function carregarMeusPedidos(){
  const lista = document.getElementById("listaMeusPedidos");

  if(!lista){
    return;
  }

  lista.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("telefone_login", clienteLogado.telefone)
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    lista.innerHTML = "<p>Erro ao carregar pedidos.</p>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<p>Você ainda não fez pedidos.</p>";
    return;
  }

  lista.innerHTML = "";

  data.forEach(pedido => {
    let produtosHTML = "";

    if(pedido.produtos && pedido.produtos.length > 0){
      pedido.produtos.forEach(item => {
        produtosHTML += `<li>${item.nome} - Qtd: ${item.quantidade}</li>`;
      });
    }

    const criadoEm = pedido.criado_em ? new Date(pedido.criado_em) : null;
    const minutos = criadoEm ? (new Date() - criadoEm) / 1000 / 60 : 999;

    const podeCancelar =
  pedido.status !== "Cancelado" &&
  pedido.status !== "Cancelado pelo cliente" &&
  pedido.status !== "Pago" &&
  pedido.status !== "Concluído" &&
  pedido.status !== "Concluido";

    const div = document.createElement("div");
    div.classList.add("pedido-card");

    div.innerHTML = `
      <h3>Pedido #${pedido.id}</h3>

      <p><strong>Status:</strong> ${pedido.status}</p>
      <p><strong>Pagamento:</strong> ${pedido.pagamento}</p>
      <p><strong>Total:</strong> R$ ${Number(pedido.total).toFixed(2).replace(".", ",")}</p>

      <ul>${produtosHTML}</ul>

      

${
  podeCancelar
  ? `
    <button
      class="botao"
      style="background:#d62828;margin-top:10px;"
      onclick="cancelarPedidoCliente(${pedido.id})"
    >
      Cancelar pedido
    </button>
  `
  : `
    <p style="color:#777;font-size:14px;">
      Cancelamento disponível apenas até 5 minutos após o pedido.
    </p>
  `
}
    `;

    lista.appendChild(div);
  });
}

async function cancelarPedidoCliente(pedidoId){

  if(!confirm("Deseja cancelar este pedido?")){
  return;
}

  const { data: pedido, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .single();

  if(error || !pedido){
    console.log(error);
    alert("Erro ao localizar pedido.");
    return;
  }

  if(pedido.status === "Cancelado" || pedido.status === "Cancelado pelo cliente"){
    alert("Este pedido já está cancelado.");
    carregarMeusPedidos();
    return;
  }

  if(pedido.status === "Pago" || pedido.status === "Concluído" || pedido.status === "Concluido"){
    alert("Este pedido já foi pago ou concluído e não pode ser cancelado.");
    carregarMeusPedidos();
    return;
  }

  const criadoEm = pedido.criado_em ? new Date(pedido.criado_em) : null;
  const minutos = criadoEm
  ? Math.floor((Date.now() - criadoEm.getTime()) / 1000 / 60)
  : 999;

console.log("PEDIDO", pedido.id);
console.log("PEDIDO COMPLETO", pedido);
console.log("MINUTOS", minutos);

  if(minutos > 5){
    alert("O prazo de 5 minutos para cancelamento acabou. Entre em contato com a farmácia.");
    carregarMeusPedidos();
    return;
  }

  const deveDevolverEstoque =
  pedido.status !== "Aguardando pagamento" &&
  pedido.status !== "Pix pendente" &&
  pedido.status !== "Pendente";

if(deveDevolverEstoque && pedido.produtos && pedido.produtos.length > 0){

  for(const item of pedido.produtos){

    const { data: produtoAtual } = await supabaseClient
      .from("produtos")
      .select("quantidade")
      .eq("id", item.id)
      .single();

    if(produtoAtual){
      await supabaseClient
        .from("produtos")
        .update({
          quantidade:
            Number(produtoAtual.quantidade || 0) +
            Number(item.quantidade || 0)
        })
        .eq("id", item.id);
    }
  }

}

  const { error: erroCancelar } = await supabaseClient
    .from("pedidos")
    .update({
      status:"Cancelado pelo cliente"
    })
    .eq("id", pedidoId);

  if(erroCancelar){
    console.log(erroCancelar);
    alert("Erro ao cancelar pedido.");
    return;
  }

  alert("Pedido cancelado com sucesso e estoque devolvido!");

  carregarMeusPedidos();
  carregarProdutos();
}
async function verificarPagamentoPix(pedidoId, txid, automatico = false){

  if(!txid || txid === "null"){
    alert("Este pedido ainda não tem TXID do Pix.");
    return;
  }

  const resposta = await fetch(`/api/verificar-pix?txid=${encodeURIComponent(txid)}`);

console.log("CHAMANDO API PIX", txid);

const dados = await resposta.json();

console.log("RETORNO DO BANCO DO BRASIL:", dados);

if(automatico){
  console.log("VERIFICAÇÃO AUTOMÁTICA RODANDO");
}

  if(!resposta.ok){
    console.log(dados);
    alert("Erro ao verificar pagamento Pix.");
    return;
  }

  if(!dados.pago){

  console.log("PIX AINDA NÃO CONFIRMADO", dados);

  if(!automatico){
    alert("Pagamento ainda não confirmado.");
  }

  return false;
}

  const { data: pedido, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .single();

  if(error || !pedido){
    alert("Erro ao localizar pedido.");
    return;
  }

  if(!pedido.estoque_baixado){
    for(const item of pedido.produtos || []){
      const { data: produtoAtual } = await supabaseClient
        .from("produtos")
        .select("quantidade")
        .eq("id", item.id)
        .single();

      if(produtoAtual){
        await supabaseClient
          .from("produtos")
          .update({
            quantidade: Math.max(
              0,
              Number(produtoAtual.quantidade || 0) - Number(item.quantidade || 0)
            )
          })
          .eq("id", item.id);
      }
    }
  }

  await supabaseClient
    .from("pedidos")
    .update({
      status:"Pago",
      pix_pago:true,
      pix_pago_em:new Date().toISOString(),
      estoque_baixado:true
    })
    .eq("id", pedidoId);

  console.log("PIX CONFIRMADO");

console.log("PIX CONFIRMADO");

if(!automatico){
  alert("Pagamento confirmado! Pedido marcado como Pago.");
}

carregarMeusPedidos();
carregarProdutos();

return true;
}
function abrirFecharCupons(){
  const area = document.getElementById("areaCuponsCliente");

  if(!area){
    return;
  }

  area.classList.toggle("area-cupons-fechada");
}
function abrirFecharCarrinhoMobile(){
  const carrinho = document.querySelector(".carrinho-lateral");

  if(!carrinho){
    return;
  }

  carrinho.classList.toggle("ativo");
}