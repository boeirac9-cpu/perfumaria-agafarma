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

/* CUPONS CLIENTE */

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

  document.getElementById("cupomAplicado").innerHTML =
    `Cupom aplicado: ${data.codigo}`;

  atualizarCarrinho();
}

async function aplicarCupomAutomatico(codigoCupom){
  const campo = document.getElementById("campoCupom");

  if(campo){
    campo.value = codigoCupom;
  }

  await aplicarCupom();
}

function calcularTotalComCupom(total){
  if(!cupomAtual){
    return total;
  }

  if(cupomAtual.tipo === "porcentagem"){
    return total - (total * Number(cupomAtual.valor) / 100);
  }

  if(cupomAtual.tipo === "valor"){
    return Math.max(0, total - Number(cupomAtual.valor));
  }

  return total;
}

/* CARRINHO */

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

/* MENU E FILTROS */

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

/* LOGIN */

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

        ${
          clienteLogado
          ? `
            <button
              class="botao sair-conta"
              onclick="sairConta()"
              style="margin-top:12px;background:#d62828;"
            >
              Sair da conta
            </button>
          `
          : ""
        }
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

/* FINALIZAÇÃO */

function abrirFinalizacao(){
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
  if(celular){
    celular.value = clienteLogado.telefone;
  }
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

function limparTextoParaClipboard(texto){
  return String(texto || "").replace(/`/g, "").replace(/\$/g, "");
}

function mostrarPixNaTela(pix, pedidoId){
  const modal = document.createElement("div");
  modal.className = "modal-finalizacao ativo";
  modal.id = "modalPixGerado";

  const copiaCola = limparTextoParaClipboard(pix.pixCopiaECola || "");

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

      ${imagemQr}

      <label>Pix Copia e Cola</label>
      <textarea
        id="pixCopiaEColaGerado"
        readonly
        style="height:130px;"
      >${copiaCola}</textarea>

      <button class="botao confirmar" onclick="copiarPixGerado()">
        Copiar Pix
      </button>

      <button class="botao" onclick="location.reload()" style="margin-top:10px;">
        Concluir
      </button>
    </div>
  `;

  document.body.appendChild(modal);
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
    .then(() => {
      alert("Pix copiado!");
    })
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

  if(!respostaPix.ok){
    console.log("ERRO PIX COMPLETO:");
    console.log(JSON.stringify(pix, null, 2));

    alert(JSON.stringify(pix, null, 2));

    throw new Error(pix.erro || "Erro ao gerar Pix.");
  }

  return pix;
}

  const pix = await respostaPix.json();

  if(!respostaPix.ok){
    console.log(pix);
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

  const statusPedido = ehPix
    ? "Aguardando pagamento PIX"
    : "Novo pedido";

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
      status: statusPedido,
      cupom: cupomAtual ? cupomAtual.codigo : null
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

      await baixarEstoque();

      carrinho = [];
      cupomAtual = null;

      const campoCupom = document.getElementById("campoCupom");
      const cupomAplicado = document.getElementById("cupomAplicado");

      if(campoCupom) campoCupom.value = "";
      if(cupomAplicado) cupomAplicado.innerHTML = "";

      atualizarCarrinho();
      fecharFinalizacao();
      carregarProdutos();

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

  alert(`Pedido enviado!\nNúmero: #${data.id}`);

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