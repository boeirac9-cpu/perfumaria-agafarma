const listaPedidos = document.getElementById("listaPedidos");
const listaProdutosAdmin = document.getElementById("listaProdutosAdmin");
const listaCuponsAdmin = document.getElementById("listaCuponsAdmin");

let produtoEditandoId = null;

/* LOGIN ADMIN */

async function loginAdmin(){
  const email = document.getElementById("adminEmail").value;
  const senha = document.getElementById("adminSenha").value;

  if(email.trim() === "" || senha.trim() === ""){
    alert("Preencha email e senha.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if(error){
    console.log(error);
    alert("Login inválido.");
    return;
  }

  const { data: adminData } = await supabaseClient
    .from("admins")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if(!adminData){
    alert("Você não é administrador.");
    await supabaseClient.auth.signOut();
    return;
  }

  abrirPainelAdmin();
}

async function verificarAdmin(){
  const { data:{ session } } = await supabaseClient.auth.getSession();

  if(!session){
    return;
  }

  const { data } = await supabaseClient
    .from("admins")
    .select("*")
    .eq("email", session.user.email)
    .maybeSingle();

  if(data){
    abrirPainelAdmin();
  }
}

function abrirPainelAdmin(){
  document.getElementById("telaLoginAdmin").style.display = "none";
  document.getElementById("painelAdmin").style.display = "block";

  carregarPedidos();
  carregarProdutosAdmin();
  carregarCuponsAdmin();
}

async function sairAdmin(){
  await supabaseClient.auth.signOut();
  location.reload();
}

/* ABAS */

function mostrarAba(aba){
  document.getElementById("abaPedidos").classList.add("escondido");
  document.getElementById("abaProdutos").classList.add("escondido");
  document.getElementById("abaCupons").classList.add("escondido");

  const abaImagens = document.getElementById("abaImagens");

  if(abaImagens){
    abaImagens.classList.add("escondido");
  }

  if(aba === "pedidos"){
    document.getElementById("abaPedidos").classList.remove("escondido");
    carregarPedidos();
  }

  if(aba === "produtos"){
    document.getElementById("abaProdutos").classList.remove("escondido");
    carregarProdutosAdmin();
  }

  if(aba === "cupons"){
    document.getElementById("abaCupons").classList.remove("escondido");
    carregarCuponsAdmin();
  }

  if(aba === "imagens" && abaImagens){
    abaImagens.classList.remove("escondido");
    carregarProdutosSemImagem();
  }
}

/* CÓDIGO DE BARRAS */

const bancoProdutos = {
  "7891234567890":{
    nome:"Shampoo Hidratante",
    marca:"Elseve",
    laboratorio:"L'Oréal",
    categoria:"cabelo",
    descricao:"Shampoo hidratante."
  }
};

function buscarPorCodigoBarras(event){
  if(event.key !== "Enter"){
    return;
  }

  event.preventDefault();

  const codigo = document.getElementById("produtoCodigoBarras").value.trim();
  const produto = bancoProdutos[codigo];

  if(produto){
    document.getElementById("produtoNome").value = produto.nome;
    document.getElementById("produtoMarca").value = produto.marca;
    document.getElementById("produtoLaboratorio").value = produto.laboratorio;
    document.getElementById("produtoCategoria").value = produto.categoria;
    document.getElementById("produtoDescricao").value = produto.descricao;

    alert("Produto encontrado!");
  } else {
    alert("Código não encontrado.");
  }
}

/* PEDIDOS */

async function carregarPedidos(){
  listaPedidos.innerHTML = "<p class='sem-pedidos'>Carregando pedidos...</p>";

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    listaPedidos.innerHTML = "<p class='sem-pedidos'>Erro ao carregar pedidos.</p>";
    return;
  }

  if(!data || data.length === 0){
    listaPedidos.innerHTML = "<p class='sem-pedidos'>Nenhum pedido recebido.</p>";
    return;
  }

  listaPedidos.innerHTML = "";

  data.forEach(pedido => {
    let produtosHTML = "";

    if(pedido.produtos && pedido.produtos.length > 0){
      pedido.produtos.forEach(produto => {
        produtosHTML += `
          <li>
            ${produto.nome} - Qtd: ${produto.quantidade}
            - R$ ${(produto.preco * produto.quantidade).toFixed(2).replace(".", ",")}
          </li>
        `;
      });
    }

    const div = document.createElement("div");
    div.classList.add("pedido-card");

    div.innerHTML = `
      <h2>Pedido #${pedido.id}</h2>

      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Telefone:</strong> ${pedido.telefone_login || "Não informado"}</p>
      <p><strong>Pagamento:</strong> ${pedido.pagamento}</p>
      <p><strong>Status:</strong> ${pedido.status}</p>

      ${pedido.cupom ? `<p><strong>Cupom:</strong> ${pedido.cupom}</p>` : ""}

      <ul>${produtosHTML}</ul>

      <p class="pedido-total">
        <strong>Total:</strong>
        R$ ${Number(pedido.total).toFixed(2).replace(".", ",")}
      </p>

      ${
        pedido.status !== "Cancelado"
        ? `
          <button class="botao excluir-produto" onclick="cancelarPedidoAdmin(${pedido.id})">
            Cancelar pedido e devolver estoque
          </button>
        `
        : `
          <p style="color:#d62828;font-weight:bold;">
            Pedido cancelado
          </p>
        `
      }
    `;

    listaPedidos.appendChild(div);
  });
}

async function cancelarPedidoAdmin(id){

  if(!confirm("Cancelar este pedido e devolver os produtos ao estoque?")){
    return;
  }

  const { data: pedido, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if(error || !pedido){
    console.log(error);
    alert("Erro ao localizar pedido.");
    return;
  }

  if(pedido.status === "Cancelado"){
    alert("Pedido já cancelado.");
    return;
  }

  if(pedido.produtos && pedido.produtos.length > 0){
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

  const { error: erroStatus } = await supabaseClient
    .from("pedidos")
    .update({
      status:"Cancelado"
    })
    .eq("id", id);

  if(erroStatus){
    console.log(erroStatus);
    alert("Erro ao cancelar pedido.");
    return;
  }

  alert("Pedido cancelado e estoque devolvido!");

  carregarPedidos();
  carregarProdutosAdmin();
}

/* IMAGEM MANUAL */

const inputImagem = document.getElementById("produtoImagem");

if(inputImagem){
  inputImagem.addEventListener("change", function(){
    const arquivo = this.files[0];

    if(arquivo){
      const leitor = new FileReader();

      leitor.onload = e => {
        document.getElementById("previewImagem").src = e.target.result;
      };

      leitor.readAsDataURL(arquivo);
    }
  });
}

/* PRODUTOS */

async function salvarProduto(){
  const codigo = document.getElementById("produtoCodigoBarras").value;
  const nome = document.getElementById("produtoNome").value;
  const marca = document.getElementById("produtoMarca").value;
  const laboratorio = document.getElementById("produtoLaboratorio").value;
  const descricao = document.getElementById("produtoDescricao").value;
  const valor = document.getElementById("produtoValor").value;
  const desconto = document.getElementById("produtoDesconto").value;
  const quantidade = document.getElementById("produtoQuantidade").value;
  const categoria = document.getElementById("produtoCategoria").value;
  const imagem = document.getElementById("previewImagem").src;

  if(nome.trim() === "" || valor.trim() === "" || quantidade.trim() === ""){
    alert("Preencha nome, valor e quantidade.");
    return;
  }

  const produto = {
    codigo,
    nome,
    marca,
    laboratorio,
    descricao,
    valor:Number(valor),
    desconto:Number(desconto) || 0,
    quantidade:Number(quantidade),
    categoria,
    imagem: imagem || "logo.png"
  };

  let error;

  if(produtoEditandoId){
    const resposta = await supabaseClient
      .from("produtos")
      .update(produto)
      .eq("id", produtoEditandoId);

    error = resposta.error;
  } else {
    produto.promocao = false;

    const resposta = await supabaseClient
      .from("produtos")
      .insert([produto]);

    error = resposta.error;
  }

  if(error){
    console.log(error);
    alert("Erro ao salvar produto.");
    return;
  }

  alert(produtoEditandoId ? "Produto atualizado!" : "Produto cadastrado!");

  produtoEditandoId = null;
  limparFormulario();
  carregarProdutosAdmin();
  carregarProdutosSemImagem();
}

async function carregarProdutosAdmin(){
  listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Carregando produtos...</p>";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Erro ao carregar produtos.</p>";
    return;
  }

  if(!data || data.length === 0){
    listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Nenhum produto cadastrado.</p>";
    return;
  }

  listaProdutosAdmin.innerHTML = "";

  data.forEach(produto => {
    const div = document.createElement("div");
    div.classList.add("produto-admin");

    div.innerHTML = `
      <img src="${produto.imagem || "logo.png"}">

      <div class="produto-admin-info">
        <h3>${produto.promocao ? "🔥 " : ""}${produto.nome}</h3>

        <p><strong>Código:</strong> ${produto.codigo || "Sem código"}</p>
        <p><strong>Marca:</strong> ${produto.marca || "Não informado"}</p>
        <p><strong>Laboratório:</strong> ${produto.laboratorio || "Não informado"}</p>
        <p><strong>Categoria:</strong> ${produto.categoria || "Não informado"}</p>
        <p><strong>Estoque:</strong> ${produto.quantidade}</p>
        <p><strong>Valor:</strong> R$ ${Number(produto.valor).toFixed(2).replace(".", ",")}</p>

        <div class="botoes-produto-admin">
          <button onclick="editarProduto(${produto.id})">
            Editar
          </button>

          <button onclick="alternarPromocao(${produto.id}, ${produto.promocao})">
            ${produto.promocao ? "Remover promoção" : "Colocar em promoção"}
          </button>

          <button class="excluir-produto" onclick="excluirProduto(${produto.id})">
            Excluir
          </button>
        </div>
      </div>
    `;

    listaProdutosAdmin.appendChild(div);
  });
}

async function editarProduto(id){
  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if(error){
    console.log(error);
    alert("Erro ao carregar produto.");
    return;
  }

  produtoEditandoId = id;

  document.getElementById("produtoCodigoBarras").value = data.codigo || "";
  document.getElementById("produtoNome").value = data.nome || "";
  document.getElementById("produtoMarca").value = data.marca || "";
  document.getElementById("produtoLaboratorio").value = data.laboratorio || "";
  document.getElementById("produtoDescricao").value = data.descricao || "";
  document.getElementById("produtoValor").value = data.valor || 0;
  document.getElementById("produtoDesconto").value = data.desconto || 0;
  document.getElementById("produtoQuantidade").value = data.quantidade || 0;
  document.getElementById("produtoCategoria").value = data.categoria || "higiene";
  document.getElementById("previewImagem").src = data.imagem || "logo.png";

  mostrarAba("produtos");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function excluirProduto(id){
  if(!confirm("Deseja excluir este produto?")){
    return;
  }

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir produto.");
    return;
  }

  alert("Produto excluído!");
  carregarProdutosAdmin();
  carregarProdutosSemImagem();
}

async function alternarPromocao(id, promocaoAtual){
  const { error } = await supabaseClient
    .from("produtos")
    .update({ promocao: !promocaoAtual })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao alterar promoção.");
    return;
  }

  carregarProdutosAdmin();
}

/* PRODUTOS SEM IMAGEM */

let sugestoesImagem = {};

async function carregarProdutosSemImagem(){
  const lista = document.getElementById("listaProdutosSemImagem");

  if(!lista){
    return;
  }

  lista.innerHTML = "<p class='sem-pedidos'>Carregando produtos sem imagem...</p>";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    lista.innerHTML = "<p class='sem-pedidos'>Erro ao carregar produtos.</p>";
    return;
  }

  const semImagem = (data || []).filter(produto => {
    return (
      !produto.imagem ||
      produto.imagem === "" ||
      produto.imagem === "logo.png" ||
      produto.imagem.includes("logo.png")
    );
  });

  if(semImagem.length === 0){
    lista.innerHTML = "<p class='sem-pedidos'>Todos os produtos estão com imagem.</p>";
    return;
  }

  lista.innerHTML = "";

  semImagem.forEach(produto => {
    const div = document.createElement("div");
    div.classList.add("produto-admin");

    div.innerHTML = `
      <img src="${produto.imagem || "logo.png"}">

      <div class="produto-admin-info">
        <h3>${produto.nome}</h3>

        <p><strong>Código:</strong> ${produto.codigo || "Sem código"}</p>
        <p><strong>Marca:</strong> ${produto.marca || "Não informado"}</p>
        <p><strong>Laboratório:</strong> ${produto.laboratorio || "Não informado"}</p>
        <p><strong>Estoque:</strong> ${produto.quantidade}</p>

        <div class="botoes-produto-admin">
          <button onclick="buscarSugestaoImagem(${produto.id}, '${String(produto.nome).replace(/'/g, "")}', '${produto.codigo || ""}')">
            Buscar sugestão
          </button>

          <button onclick="proximaSugestaoImagem(${produto.id})">
            Outra sugestão
          </button>

          <button onclick="aprovarSugestaoImagem(${produto.id})">
            Aprovar imagem
          </button>

          <button onclick="editarProduto(${produto.id})">
            Editar produto
          </button>
        </div>

        <div id="areaSugestaoImagem${produto.id}" style="margin-top:15px;"></div>
      </div>
    `;

    lista.appendChild(div);
  });
}

async function buscarSugestaoImagem(id, nome, codigo){
  const area = document.getElementById(`areaSugestaoImagem${id}`);

  area.innerHTML = "<p>Buscando imagem...</p>";

  const pesquisa = encodeURIComponent(`${nome} ${codigo} produto embalagem`);

  try{
    const resposta = await fetch(`/api/buscar-imagem?q=${pesquisa}`);

    const dados = await resposta.json();

    const imagens = dados.imagens || [];

    if(imagens.length === 0){
      area.innerHTML = "<p>Nenhuma imagem encontrada.</p>";
      return;
    }

    sugestoesImagem[id] = {
      imagens,
      indice:0
    };

    mostrarSugestaoImagem(id);

  }catch(erro){
    console.log(erro);
    area.innerHTML = "<p>Erro ao buscar imagem.</p>";
  }
}

function mostrarSugestaoImagem(id){
  const area = document.getElementById(`areaSugestaoImagem${id}`);
  const grupo = sugestoesImagem[id];

  if(!grupo || !grupo.imagens || grupo.imagens.length === 0){
    area.innerHTML = "<p>Nenhuma sugestão disponível.</p>";
    return;
  }

  const imagem = grupo.imagens[grupo.indice];

  const urlImagem =
    imagem.original ||
    imagem.thumbnail;

  area.innerHTML = `
    <p><strong>Sugestão ${grupo.indice + 1} de ${grupo.imagens.length}</strong></p>

    <img
      src="${urlImagem}"
      style="max-width:220px;max-height:220px;border-radius:14px;border:1px solid #ddd;background:white;"
    >

    <p style="font-size:13px;color:#666;margin-top:8px;">
      Fonte: ${imagem.source || "Google Imagens"}
    </p>
  `;
}

function proximaSugestaoImagem(id){
  const grupo = sugestoesImagem[id];

  if(!grupo){
    alert("Clique primeiro em Buscar sugestão.");
    return;
  }

  grupo.indice++;

  if(grupo.indice >= grupo.imagens.length){
    grupo.indice = 0;
  }

  mostrarSugestaoImagem(id);
}

async function aprovarSugestaoImagem(id){
  const grupo = sugestoesImagem[id];

  if(!grupo){
    alert("Busque uma sugestão primeiro.");
    return;
  }

  const imagem = grupo.imagens[grupo.indice];

  const urlImagem =
    imagem.original ||
    imagem.thumbnail;

  if(!urlImagem){
    alert("Imagem inválida.");
    return;
  }

  const { error } = await supabaseClient
    .from("produtos")
    .update({ imagem: urlImagem })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao salvar imagem.");
    return;
  }

  alert("Imagem aprovada e salva!");

  carregarProdutosSemImagem();
  carregarProdutosAdmin();
}

/* CUPONS */

async function salvarCupom(){
  const codigo = document.getElementById("cupomCodigo").value.trim().toUpperCase();
  const tipo = document.getElementById("cupomTipo").value;
  const valor = document.getElementById("cupomValor").value;

  if(codigo === "" || valor === ""){
    alert("Preencha código e valor.");
    return;
  }

  const { error } = await supabaseClient
    .from("cupons")
    .insert([{
      codigo,
      tipo,
      valor:Number(valor),
      ativo:true
    }]);

  if(error){
    console.log(error);
    alert("Erro ao criar cupom.");
    return;
  }

  alert("Cupom criado!");

  document.getElementById("cupomCodigo").value = "";
  document.getElementById("cupomValor").value = "";

  carregarCuponsAdmin();
}

async function carregarCuponsAdmin(){
  listaCuponsAdmin.innerHTML = "<p class='sem-pedidos'>Carregando cupons...</p>";

  const { data, error } = await supabaseClient
    .from("cupons")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    listaCuponsAdmin.innerHTML = "<p class='sem-pedidos'>Erro ao carregar cupons.</p>";
    return;
  }

  if(!data || data.length === 0){
    listaCuponsAdmin.innerHTML = "<p class='sem-pedidos'>Nenhum cupom criado.</p>";
    return;
  }

  listaCuponsAdmin.innerHTML = "";

  data.forEach(cupom => {
    const div = document.createElement("div");
    div.classList.add("pedido-card");

    div.innerHTML = `
      <h2>${cupom.codigo}</h2>

      <p>
        <strong>Desconto:</strong>
        ${
          cupom.tipo === "porcentagem"
          ? `${cupom.valor}%`
          : `R$ ${Number(cupom.valor).toFixed(2).replace(".", ",")}`
        }
      </p>

      <p><strong>Status:</strong> ${cupom.ativo ? "Ativo" : "Inativo"}</p>
    `;

    listaCuponsAdmin.appendChild(div);
  });
}

/* LIMPAR FORMULÁRIO */

function limparFormulario(){
  document.getElementById("produtoCodigoBarras").value = "";
  document.getElementById("produtoNome").value = "";
  document.getElementById("produtoMarca").value = "";
  document.getElementById("produtoLaboratorio").value = "";
  document.getElementById("produtoDescricao").value = "";
  document.getElementById("produtoValor").value = "";
  document.getElementById("produtoDesconto").value = "";
  document.getElementById("produtoQuantidade").value = "";
  document.getElementById("produtoImagem").value = "";
  document.getElementById("previewImagem").src = "";
}

verificarAdmin();