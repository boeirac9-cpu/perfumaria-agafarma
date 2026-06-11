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
  carregarCategoriasNoProduto();

  iniciarImpressaoAutomatica();
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

  const abaCategorias = document.getElementById("abaCategorias");

if(abaCategorias){
  abaCategorias.classList.add("escondido");
}

  const abaBanners = document.getElementById("abaBanners");
  const abaVideos = document.getElementById("abaVideos");
  const abaXls = document.getElementById("abaXls");
  const abaImagens = document.getElementById("abaImagens");

  if(abaBanners) abaBanners.classList.add("escondido");
  if(abaVideos) abaVideos.classList.add("escondido");
  if(abaXls) abaXls.classList.add("escondido");
  if(abaImagens) abaImagens.classList.add("escondido");

  if(aba === "pedidos"){
    document.getElementById("abaPedidos").classList.remove("escondido");
    carregarPedidos();
  }

  if(aba === "produtos"){
    document.getElementById("abaProdutos").classList.remove("escondido");
    carregarProdutosAdmin();
  }

  if(aba === "xls" && abaXls){
    abaXls.classList.remove("escondido");
  }

  if(aba === "cupons"){
    document.getElementById("abaCupons").classList.remove("escondido");
    carregarCuponsAdmin();
  }

  if(aba === "categorias" && abaCategorias){
  abaCategorias.classList.remove("escondido");
  carregarCategoriasAdmin();
}

  if(aba === "banners" && abaBanners){
    abaBanners.classList.remove("escondido");
    carregarBannersAdmin();
  }

  if(aba === "videos" && abaVideos){
    abaVideos.classList.remove("escondido");
    carregarVideosAdmin();
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
  .neq("status", "Aguardando pagamento PIX")
  .neq("status", "Cancelado pelo cliente")
  .neq("status", "Cancelado")
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

let paginaAdminAtual = 1;
const produtosPorPaginaAdmin = 100;
let todosProdutosAdmin = [];

async function carregarProdutosAdmin(){
  listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Carregando produtos...</p>";

  todosProdutosAdmin = [];
  let pagina = 0;
  const tamanhoPagina = 1000;

  while(true){
    const inicio = pagina * tamanhoPagina;
    const fim = inicio + tamanhoPagina - 1;

    const { data, error } = await supabaseClient
      .from("produtos")
      .select("*")
      .order("id", { ascending:false })
      .range(inicio, fim);

    if(error){
      console.log(error);
      listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Erro ao carregar produtos.</p>";
      return;
    }

    if(!data || data.length === 0){
      break;
    }

    todosProdutosAdmin = todosProdutosAdmin.concat(data);

    if(data.length < tamanhoPagina){
      break;
    }

    pagina++;
  }

  paginaAdminAtual = 1;
  mostrarPaginaProdutosAdmin();
}

function mostrarPaginaProdutosAdmin(){
  if(!todosProdutosAdmin || todosProdutosAdmin.length === 0){
    listaProdutosAdmin.innerHTML = "<p class='sem-pedidos'>Nenhum produto cadastrado.</p>";
    return;
  }

  const totalPaginas = Math.ceil(todosProdutosAdmin.length / produtosPorPaginaAdmin);
  const inicio = (paginaAdminAtual - 1) * produtosPorPaginaAdmin;
  const fim = inicio + produtosPorPaginaAdmin;

  const produtosPagina = todosProdutosAdmin.slice(inicio, fim);

  listaProdutosAdmin.innerHTML = `
    <p class='sem-pedidos'>
      Total de produtos: <strong>${todosProdutosAdmin.length}</strong><br>
      Página <strong>${paginaAdminAtual}</strong> de <strong>${totalPaginas}</strong>
    </p>

    <div style="display:flex;gap:10px;justify-content:center;margin:15px 0;flex-wrap:wrap;">
      <button onclick="paginaAnteriorAdmin()" ${paginaAdminAtual === 1 ? "disabled" : ""}>
        ⬅️ Anterior
      </button>

      <button onclick="proximaPaginaAdmin()" ${paginaAdminAtual === totalPaginas ? "disabled" : ""}>
        Próxima ➡️
      </button>
    </div>
  `;

  produtosPagina.forEach(produto => {
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

<div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:10px;">
  <input
    id="editNome${produto.id}"
    value="${produto.nome || ""}"
    placeholder="Nome"
    style="width:100%;margin-bottom:6px;"
  >

  <select id="editCategoria${produto.id}" style="width:100%;margin-bottom:6px;">
    <option value="higiene" ${produto.categoria === "higiene" ? "selected" : ""}>Higiene</option>
    <option value="cabelo" ${produto.categoria === "cabelo" ? "selected" : ""}>Cabelo</option>
    <option value="corpo" ${produto.categoria === "corpo" ? "selected" : ""}>Corpo</option>
    <option value="perfumes" ${produto.categoria === "perfumes" ? "selected" : ""}>Perfumes</option>
    <option value="skincare" ${produto.categoria === "skincare" ? "selected" : ""}>Skincare</option>
    <option value="maquiagem" ${produto.categoria === "maquiagem" ? "selected" : ""}>Maquiagem</option>
    <option value="infantil" ${produto.categoria === "infantil" ? "selected" : ""}>Infantil</option>
    <option value="leites" ${produto.categoria === "leites" ? "selected" : ""}>Leites</option>
  </select>

  <input
    id="editImagem${produto.id}"
    type="file"
    accept="image/*"
    style="width:100%;margin-bottom:6px;"
  >

</div>

        <div class="botoes-produto-admin">
          <button onclick="editarProduto(${produto.id})">
            Editar
          </button>

          <button onclick="alternarPromocao(${produto.id}, ${produto.promocao})">
            ${produto.promocao ? "Remover promoção" : "Colocar em promoção"}
          </button>

          <button onclick="alternarDestaqueHome(${produto.id}, ${produto.destaque_home})">
            ${produto.destaque_home ? "Remover da página inicial" : "Colocar na página inicial"}
          </button>

          <button class="excluir-produto" onclick="excluirProduto(${produto.id})">
            Excluir
          </button>
        </div>
      </div>
    `;

    listaProdutosAdmin.appendChild(div);
  });

  const botaoSalvarTodos = document.createElement("button");
  botaoSalvarTodos.type = "button";
  botaoSalvarTodos.innerHTML = "💾 Salvar todas as alterações desta página";
  botaoSalvarTodos.style.cssText = "width:100%;padding:15px;margin:20px 0;font-size:18px;font-weight:bold;background:#0057b8;color:white;border:none;border-radius:12px;cursor:pointer;";
  botaoSalvarTodos.onclick = salvarTodosProdutosPagina;

  listaProdutosAdmin.appendChild(botaoSalvarTodos);
}

function paginaAnteriorAdmin(){
  if(paginaAdminAtual > 1){
    paginaAdminAtual--;
    mostrarPaginaProdutosAdmin();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function salvarEdicaoRapidaProduto(event, id){
  event.preventDefault();
  event.stopPropagation();

  const nome = document.getElementById(`editNome${id}`).value;
  const categoria = document.getElementById(`editCategoria${id}`).value;
  const imagem = document.getElementById(`editImagem${id}`).value;

  const { error } = await supabaseClient
    .from("produtos")
    .update({
      nome,
      categoria,
      imagem
    })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao salvar.");
    return;
  }

  alert("Produto atualizado!");
}

function proximaPaginaAdmin(){
  const totalPaginas = Math.ceil(todosProdutosAdmin.length / produtosPorPaginaAdmin);

  if(paginaAdminAtual < totalPaginas){
    paginaAdminAtual++;
    mostrarPaginaProdutosAdmin();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function salvarTodosProdutosPagina(){
  const inicio = (paginaAdminAtual - 1) * produtosPorPaginaAdmin;
  const fim = inicio + produtosPorPaginaAdmin;
  const produtosPagina = todosProdutosAdmin.slice(inicio, fim);

  if(!confirm("Salvar todas as alterações desta página?")){
    return;
  }

  let salvos = 0;
  let erros = 0;

  for(const produto of produtosPagina){
    const nome = document.getElementById(`editNome${produto.id}`).value.trim();
    const categoria = document.getElementById(`editCategoria${produto.id}`).value;
    const arquivoImagem = document.getElementById(`editImagem${produto.id}`).files[0];

    if(nome === ""){
      erros++;
      continue;
    }

    const dadosAtualizacao = {
      nome,
      categoria
    };

    if(arquivoImagem){
      dadosAtualizacao.imagem = await converterImagemParaBase64(arquivoImagem);
    }

    const { error } = await supabaseClient
      .from("produtos")
      .update(dadosAtualizacao)
      .eq("id", produto.id);

    if(error){
      console.log(error);
      erros++;
    } else {
      salvos++;
    }
  }

  alert(`Alterações salvas!\nProdutos salvos: ${salvos}\nErros: ${erros}`);

  carregarProdutosAdmin();
}

function converterImagemParaBase64(arquivo){
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;

    leitor.readAsDataURL(arquivo);
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

  let todosProdutos = [];
  let pagina = 0;
  const tamanhoPagina = 1000;

  while(true){
    const inicio = pagina * tamanhoPagina;
    const fim = inicio + tamanhoPagina - 1;

    const { data, error } = await supabaseClient
      .from("produtos")
      .select("*")
      .order("id", { ascending:false })
      .range(inicio, fim);

    if(error){
      console.log(error);
      lista.innerHTML = "<p class='sem-pedidos'>Erro ao carregar produtos.</p>";
      return;
    }

    if(!data || data.length === 0){
      break;
    }

    todosProdutos = todosProdutos.concat(data);

    if(data.length < tamanhoPagina){
      break;
    }

    pagina++;
  }

  const semImagem = todosProdutos.filter(produto => {
    const img = String(produto.imagem || "").trim();

    return (
      img === "" ||
      img === "logo.png" ||
      img.includes("logo.png") ||
      img.includes("undefined") ||
      img.includes("null")
    );
  });

  if(semImagem.length === 0){
    lista.innerHTML = "<p class='sem-pedidos'>Todos os produtos estão com imagem.</p>";
    return;
  }

  lista.innerHTML = `
    <p class='sem-pedidos'>
      Produtos sem imagem encontrados: <strong>${semImagem.length}</strong>
    </p>
  `;

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

  if(area){
    area.innerHTML = "<p>Buscando imagem...</p>";
  }

  const pesquisa = encodeURIComponent(`${nome} ${codigo} produto embalagem`);

  try{
    const resposta = await fetch(`/api/buscar-imagem?q=${pesquisa}`);

    const dados = await resposta.json();

    const imagens = dados.imagens || [];

    if(imagens.length === 0){
      if(area){
        area.innerHTML = "<p>Nenhuma imagem encontrada.</p>";
      }
      return false;
    }

    sugestoesImagem[id] = {
      imagens,
      indice:0
    };

    if(area){
      mostrarSugestaoImagem(id);
    }

    return true;

  }catch(erro){
    console.log(erro);

    if(area){
      area.innerHTML = "<p>Erro ao buscar imagem.</p>";
    }

    return false;
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
/* IMPORTAR XLS 0014 + 0003 */

function normalizarTexto(texto){
  return String(texto || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function dinheiroParaNumero(valor){
  if(valor === null || valor === undefined || valor === ""){
    return 0;
  }

  if(typeof valor === "number"){
    return valor;
  }

  return Number(
    String(valor)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

function lerArquivoXLS(arquivo){
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = function(e){
      try{
        const dados = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dados, { type:"array" });
        const primeiraAba = workbook.SheetNames[0];
        const planilha = workbook.Sheets[primeiraAba];

        const linhas = XLSX.utils.sheet_to_json(planilha, {
          header: 1,
          defval: ""
        });

        resolve(linhas);
      }catch(erro){
        reject(erro);
      }
    };

    leitor.onerror = reject;
    leitor.readAsArrayBuffer(arquivo);
  });
}

function pegarCategoriaAtual(linha){
  const texto = linha.join(" ").trim();

  if(texto.toUpperCase().includes("CATEGORIA")){
    return texto.replace("CATEGORIA:", "").trim();
  }

  return null;
}
function definirCategoriaPeloNome(nome){
  const n = normalizarTexto(nome);

  if(
    n.includes("SHAMPOO") ||
    n.includes("CONDICIONADOR") ||
    n.includes("MASCARA") ||
    n.includes("CREMEPENTEAR") ||
    n.includes("TINTURA") ||
    n.includes("COLORACAO") ||
    n.includes("TONALIZANTE")
  ){
    return "cabelo";
  }

  if(
    n.includes("PERFUME") ||
    n.includes("COLONIA") ||
    n.includes("DEOCOLONIA")
  ){
    return "perfumes";
  }

  if(
    n.includes("FRALDA") ||
    n.includes("LENCOUMEDECIDO") ||
    n.includes("MAMADEIRA") ||
    n.includes("CHUPETA") ||
    n.includes("BABY")
  ){
    return "infantil";
  }

  if(
    n.includes("LEITE") ||
    n.includes("NAN") ||
    n.includes("NESTOGENO") ||
    n.includes("APTAMIL")
  ){
    return "leites";
  }

  if(
    n.includes("BATOM") ||
    n.includes("BASE") ||
    n.includes("RIMEL") ||
    n.includes("MAQUIAGEM") ||
    n.includes("ESMALTE")
  ){
    return "maquiagem";
  }

  if(
    n.includes("PROTETOR") ||
    n.includes("SOLAR") ||
    n.includes("FACIAL") ||
    n.includes("SKINCARE") ||
    n.includes("SERUM")
  ){
    return "skincare";
  }

  if(
    n.includes("HIDRATANTE") ||
    n.includes("CREMECORPORAL") ||
    n.includes("OLEO") ||
    n.includes("LOCAO")
  ){
    return "corpo";
  }

  if(
    n.includes("SABONETE") ||
    n.includes("DESODORANTE") ||
    n.includes("ABSORVENTE") ||
    n.includes("ESCOVA") ||
    n.includes("PASTA") ||
    n.includes("FIO") ||
    n.includes("ENXAGUANTE")
  ){
    return "higiene";
  }

  return "higiene";
}
function extrairProdutosEstoque0014(linhas){
  const produtos = [];
  let categoriaAtual = "higiene";

  linhas.forEach(linha => {
    const textoLinha = linha.join(" ").toUpperCase();

    if(textoLinha.includes("CATEGORIA:")){
      categoriaAtual = textoLinha
        .replace("CATEGORIA:", "")
        .trim()
        .toLowerCase();

      return;
    }

    const codigo = String(linha[1] || "").trim();
    const nome = String(linha[2] || "").trim();
    const laboratorio = String(linha[4] || "").trim();

    const quantidade =
      dinheiroParaNumero(linha[15]) ||
      dinheiroParaNumero(linha[16]) ||
      dinheiroParaNumero(linha[17]) ||
      0;

    if(!codigo || !nome){
      return;
    }

    if(nome.toUpperCase().includes("DESCRI")){
      return;
    }

    if(nome.length < 3){
      return;
    }

    produtos.push({
      codigo,
      nome,
      laboratorio,
      marca: laboratorio,
      categoria: definirCategoriaPeloNome(nome),
      quantidade,
      chaveNome: normalizarTexto(nome)
    });
  });

  return produtos;
}

function extrairPrecos0003(linhas){
  const mapaPrecos = {};

  linhas.forEach(linha => {
    const nome = String(linha[3] || "").trim();

    if(!nome) return;
    if(nome.toUpperCase().includes("DESCRICAO")) return;

    let preco = 0;

    for(let i = linha.length - 1; i >= 0; i--){
      const valor = dinheiroParaNumero(linha[i]);

      if(valor > 1 && valor < 10000){
        preco = valor;
        break;
      }
    }

    if(preco <= 0) return;

    const codigo = String(linha[1] || "").trim();

if(!codigo){
  return;
}

mapaPrecos[codigo] = preco;
  });

  console.log("TOTAL DE PREÇOS LIDOS:", Object.keys(mapaPrecos).length);
  console.log("AMOSTRA PREÇOS:", Object.entries(mapaPrecos).slice(0, 10));

  return mapaPrecos;
}

async function importarXLSComPrecos(){
  const arquivoEstoque = document.getElementById("xlsEstoque").files[0];
  const arquivoPrecos = document.getElementById("xlsPrecos").files[0];
  const resultado = document.getElementById("resultadoImportacao");

  if(!arquivoEstoque || !arquivoPrecos){
    alert("Selecione o XLS 0014 e o XLS 0003.");
    return;
  }

  resultado.innerHTML = "<p>Lendo arquivos...</p>";

  try{
    const linhasEstoque = await lerArquivoXLS(arquivoEstoque);
    const linhasPrecos = await lerArquivoXLS(arquivoPrecos);

    const produtosEstoque = extrairProdutosEstoque0014(linhasEstoque);
    const mapaPrecos = extrairPrecos0003(linhasPrecos);

    let comPreco = 0;
    let semPreco = 0;
    let atualizados = 0;
    let inseridos = 0;

    resultado.innerHTML = `<p>Atualizando ${produtosEstoque.length} produtos...</p>`;

    for(const produto of produtosEstoque){
      const precoEncontrado = mapaPrecos[produto.codigo] || 0;

      if(precoEncontrado > 0){
        comPreco++;
      } else {
        semPreco++;
      }

      const dadosAtualizacao = {
        nome: produto.nome,
        laboratorio: produto.laboratorio,
        marca: produto.marca,
        quantidade: produto.quantidade,
        valor: precoEncontrado > 0 ? precoEncontrado : 0,
        desconto: 0,
        descricao: "",
        categoria: produto.categoria || "higiene",
        promocao: false
      };

      const { data: produtoExiste, error: erroBusca } = await supabaseClient
        .from("produtos")
        .select("id")
        .eq("codigo", produto.codigo)
        .maybeSingle();

      if(erroBusca){
        console.log(erroBusca);
        continue;
      }

      if(produtoExiste){
        const { error } = await supabaseClient
          .from("produtos")
          .update(dadosAtualizacao)
          .eq("codigo", produto.codigo);

        if(!error){
          atualizados++;
        } else {
          console.log(error);
        }

      } else {
        const { error } = await supabaseClient
          .from("produtos")
          .insert([{
            codigo: produto.codigo,
            ...dadosAtualizacao,
            imagem: "logo.png"
          }]);

        if(!error){
          inseridos++;
        } else {
          console.log(error);
        }
      }

      resultado.innerHTML = `
        <p>Processando produtos...</p>
        <p>Atualizados: ${atualizados}</p>
        <p>Inseridos novos: ${inseridos}</p>
      `;

      await new Promise(resolve => setTimeout(resolve, 20));
    }

    resultado.innerHTML = `
      <p><strong>Importação concluída!</strong></p>
      <p>Produtos do 0014: ${produtosEstoque.length}</p>
      <p>Com preço encontrado no 0003: ${comPreco}</p>
      <p>Sem preço: ${semPreco}</p>
      <p>Produtos atualizados sem alterar imagem: ${atualizados}</p>
      <p>Produtos novos inseridos com logo: ${inseridos}</p>
    `;

    carregarProdutosAdmin();
    carregarProdutosSemImagem();

  }catch(erro){
    console.log(erro);
    resultado.innerHTML = `
      <p><strong>Erro ao importar XLS.</strong></p>
      <p>${erro.message || erro}</p>
    `;
  }
}

async function buscarSugestoesParaTodosSemImagem(){
  const status = document.getElementById("statusBuscaTodasImagens");

  status.innerHTML = "Carregando produtos sem imagem...";

  let data = [];
let pagina = 0;
const tamanhoPagina = 1000;

while(true){
  const inicio = pagina * tamanhoPagina;
  const fim = inicio + tamanhoPagina - 1;

  const { data: loteProdutos, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("id", { ascending:false })
    .range(inicio, fim);

  if(error){
    console.log(error);
    status.innerHTML = "Erro ao carregar produtos.";
    return;
  }

  if(!loteProdutos || loteProdutos.length === 0){
    break;
  }

  data = data.concat(loteProdutos);

  if(loteProdutos.length < tamanhoPagina){
    break;
  }

  pagina++;
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
    status.innerHTML = "Todos os produtos já possuem imagem.";
    return;
  }

  const lote = semImagem.slice(0, 100);

let processados = 0;
const totalSemImagem = semImagem.length;

status.innerHTML = `
  Buscando sugestões... ${processados}/${lote.length}<br>
  Restam sem imagem: ${Math.max(0, totalSemImagem - processados)}
`;

  for(const produto of lote){
    try{
      await buscarSugestaoImagem(
        produto.id,
        produto.nome,
        produto.codigo || ""
      );

      processados++;

      status.innerHTML = `
        Buscando sugestões... ${processados}/${lote.length}<br>
        Restam sem imagem: ${Math.max(0, semImagem.length - processados)}
      `;

      await new Promise(resolve => setTimeout(resolve, 300));

    }catch(erro){
      console.log(erro);
    }
  }

  status.innerHTML = `
    Concluído! Foram carregadas sugestões para ${processados} produtos.<br>
    Confira as imagens e clique em <strong>Aprovar todas as imagens carregadas</strong>.
  `;
}

async function aprovarTodasImagensLote(){
  const status = document.getElementById("statusBuscaTodasImagens");

  const ids = Object.keys(sugestoesImagem);

  if(ids.length === 0){
    alert("Nenhuma sugestão carregada ainda.");
    return;
  }

  if(!confirm(`Aprovar e salvar ${ids.length} imagens carregadas?`)){
    return;
  }

  let salvas = 0;
  let erros = 0;

  status.innerHTML = `Salvando imagens... 0/${ids.length}`;

  for(const id of ids){
    try{
      const grupo = sugestoesImagem[id];

      if(!grupo || !grupo.imagens || grupo.imagens.length === 0){
        erros++;
        continue;
      }

      const imagem = grupo.imagens[grupo.indice || 0];

      const urlImagem =
        imagem.original ||
        imagem.thumbnail;

      if(!urlImagem){
        erros++;
        continue;
      }

      const { error } = await supabaseClient
        .from("produtos")
        .update({ imagem: urlImagem })
        .eq("id", Number(id));

      if(error){
        console.log(error);
        erros++;
      } else {
        salvas++;
      }

      status.innerHTML = `Salvando imagens... ${salvas}/${ids.length}`;

      await new Promise(resolve => setTimeout(resolve, 100));

    }catch(erro){
      console.log(erro);
      erros++;
    }
  }

  sugestoesImagem = {};

  status.innerHTML = `
    Imagens salvas: ${salvas}<br>
    Erros: ${erros}<br><br>
    Clique em <strong>Buscar sugestões para todos sem imagem</strong> para carregar mais 50.
  `;

  carregarProdutosSemImagem();
  carregarProdutosAdmin();
}
let ultimoPedidoImpressoId = Number(localStorage.getItem("ultimoPedidoImpressoId")) || 0;

function iniciarImpressaoAutomatica(){
  setInterval(async () => {
    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .neq("status", "Aguardando pagamento PIX")
      .neq("status", "Cancelado")
      .neq("status", "Cancelado pelo cliente")
      .order("id", { ascending:false })
      .limit(1);

    if(error || !data || data.length === 0){
      return;
    }

    const pedido = data[0];

    if(pedido.id > ultimoPedidoImpressoId){
      ultimoPedidoImpressoId = pedido.id;
      localStorage.setItem("ultimoPedidoImpressoId", pedido.id);

      imprimirPedidoAutomatico(pedido);
    }
  }, 5000);
}

function imprimirPedidoAutomatico(pedido){
  let produtosTexto = "";

  if(pedido.produtos && pedido.produtos.length > 0){
    pedido.produtos.forEach(item => {
      produtosTexto += `
${item.quantidade}x ${item.nome}
R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
---------------------------
`;
    });
  }

  const conteudo = `
AGAFARMA LAGOA VERMELHA
===========================

PEDIDO #${pedido.id}

Cliente: ${pedido.cliente}
Telefone: ${pedido.telefone_login || "Não informado"}

Entrega: ${pedido.tipo_entrega}
Pagamento: ${pedido.pagamento}
Status: ${pedido.status}

---------------------------
PRODUTOS
---------------------------
${produtosTexto}

TOTAL: R$ ${Number(pedido.total).toFixed(2).replace(".", ",")}

Observações:
${pedido.observacoes || "Nenhuma"}

===========================
`;

  const janela = window.open("", "_blank", "width=400,height=600");

  janela.document.write(`
    <html>
      <head>
        <title>Pedido #${pedido.id}</title>
        <style>
          body{
            font-family: monospace;
            font-size: 13px;
            width: 280px;
            margin: 0;
            padding: 8px;
          }

          pre{
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <pre>${conteudo}</pre>

        <script>
          window.onload = function(){
            window.print();
            setTimeout(function(){
              window.close();
            }, 1000);
          };
        <\/script>
      </body>
    </html>
  `);

  janela.document.close();
}

/* BANNERS / FOLDERS */

async function salvarBanner(){
  const titulo = document.getElementById("bannerTitulo").value.trim();
  const ordem = Number(document.getElementById("bannerOrdem").value) || 0;
  const arquivo = document.getElementById("bannerImagem").files[0];

  if(!arquivo){
    alert("Selecione uma imagem para o banner.");
    return;
  }

  const nomeArquivo = `banner-${Date.now()}-${arquivo.name}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from("banners")
    .upload(nomeArquivo, arquivo);

  if(erroUpload){
    console.log(erroUpload);
    alert("Erro ao enviar imagem.");
    return;
  }

  const { data: urlData } = supabaseClient.storage
    .from("banners")
    .getPublicUrl(nomeArquivo);

  const imagemUrl = urlData.publicUrl;

  const { error } = await supabaseClient
    .from("banners")
    .insert([{
      titulo,
      imagem: imagemUrl,
      ativo: true,
      ordem
    }]);

  if(error){
    console.log(error);
    alert("Erro ao salvar banner.");
    return;
  }

  alert("Banner salvo com sucesso!");

  document.getElementById("bannerTitulo").value = "";
  document.getElementById("bannerOrdem").value = "0";
  document.getElementById("bannerImagem").value = "";

  carregarBannersAdmin();
}

async function carregarBannersAdmin(){
  const lista = document.getElementById("listaBannersAdmin");

  if(!lista){
    return;
  }

  lista.innerHTML = "<p class='sem-pedidos'>Carregando banners...</p>";

  const { data, error } = await supabaseClient
    .from("banners")
    .select("*")
    .order("ordem", { ascending:true })
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    lista.innerHTML = "<p class='sem-pedidos'>Erro ao carregar banners.</p>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<p class='sem-pedidos'>Nenhum banner cadastrado.</p>";
    return;
  }

  lista.innerHTML = "";

  data.forEach(banner => {
    const div = document.createElement("div");
    div.classList.add("produto-admin");

    div.innerHTML = `
      <img src="${banner.imagem}" style="width:180px;height:90px;object-fit:cover;">

      <div class="produto-admin-info">
        <h3>${banner.titulo || "Banner sem título"}</h3>
        <p><strong>Ordem:</strong> ${banner.ordem || 0}</p>
        <p><strong>Status:</strong> ${banner.ativo ? "Ativo" : "Inativo"}</p>

        <div class="botoes-produto-admin">
          <button onclick="alternarBanner(${banner.id}, ${banner.ativo})">
            ${banner.ativo ? "Desativar" : "Ativar"}
          </button>

          <button class="excluir-produto" onclick="excluirBanner(${banner.id})">
            Excluir
          </button>
        </div>
      </div>
    `;

    lista.appendChild(div);
  });
}

async function alternarBanner(id, ativoAtual){
  const { error } = await supabaseClient
    .from("banners")
    .update({ ativo: !ativoAtual })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao alterar banner.");
    return;
  }

  carregarBannersAdmin();
}

async function excluirBanner(id){
  if(!confirm("Deseja excluir este banner?")){
    return;
  }

  const { error } = await supabaseClient
    .from("banners")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir banner.");
    return;
  }

  alert("Banner excluído!");
  carregarBannersAdmin();
}

/* VÍDEOS HOME */

async function salvarVideoHome(){
  const titulo = document.getElementById("videoTitulo").value.trim();
  const ordem = Number(document.getElementById("videoOrdem").value) || 1;
  const arquivo = document.getElementById("videoArquivo").files[0];

  if(!arquivo){
    alert("Selecione um vídeo.");
    return;
  }

  const nomeArquivo = `video-${Date.now()}-${arquivo.name}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from("videos")
    .upload(nomeArquivo, arquivo);

  if(erroUpload){
    console.log(erroUpload);
    alert("Erro ao enviar vídeo.");
    return;
  }

  const { data: urlData } = supabaseClient.storage
    .from("videos")
    .getPublicUrl(nomeArquivo);

  const videoUrl = urlData.publicUrl;

  const { error } = await supabaseClient
    .from("videos_home")
    .insert([{
      titulo,
      video_url: videoUrl,
      ativo: true,
      ordem
    }]);

  if(error){
    console.log(error);
    alert("Erro ao salvar vídeo.");
    return;
  }

  alert("Vídeo salvo com sucesso!");

  document.getElementById("videoTitulo").value = "";
  document.getElementById("videoOrdem").value = "1";
  document.getElementById("videoArquivo").value = "";

  carregarVideosAdmin();
}

async function carregarVideosAdmin(){
  const lista = document.getElementById("listaVideosAdmin");

  if(!lista){
    return;
  }

  lista.innerHTML = "<p class='sem-pedidos'>Carregando vídeos...</p>";

  const { data, error } = await supabaseClient
    .from("videos_home")
    .select("*")
    .order("ordem", { ascending:true })
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    lista.innerHTML = "<p class='sem-pedidos'>Erro ao carregar vídeos.</p>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<p class='sem-pedidos'>Nenhum vídeo cadastrado.</p>";
    return;
  }

  lista.innerHTML = "";

  data.forEach(video => {
    const div = document.createElement("div");
    div.classList.add("produto-admin");

    div.innerHTML = `
      <video
        src="${video.video_url}"
        controls
        style="width:110px;height:190px;object-fit:cover;border-radius:14px;background:#000;"
      ></video>

      <div class="produto-admin-info">
        <h3>${video.titulo || "Vídeo sem título"}</h3>
        <p><strong>Ordem:</strong> ${video.ordem || 1}</p>
        <p><strong>Status:</strong> ${video.ativo ? "Ativo" : "Inativo"}</p>

        <div class="botoes-produto-admin">
          <button onclick="alternarVideoHome(${video.id}, ${video.ativo})">
            ${video.ativo ? "Desativar" : "Ativar"}
          </button>

          <button class="excluir-produto" onclick="excluirVideoHome(${video.id})">
            Excluir
          </button>
        </div>
      </div>
    `;

    lista.appendChild(div);
  });
}

async function alternarVideoHome(id, ativoAtual){
  const { error } = await supabaseClient
    .from("videos_home")
    .update({ ativo: !ativoAtual })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao alterar vídeo.");
    return;
  }

  carregarVideosAdmin();
}

async function excluirVideoHome(id){
  if(!confirm("Deseja excluir este vídeo?")){
    return;
  }

  const { error } = await supabaseClient
    .from("videos_home")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir vídeo.");
    return;
  }

  alert("Vídeo excluído!");
  carregarVideosAdmin();
}

async function alternarDestaqueHome(id, destaqueAtual){
  const { error } = await supabaseClient
    .from("produtos")
    .update({ destaque_home: !destaqueAtual })
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao alterar destaque da página inicial.");
    return;
  }

  carregarProdutosAdmin();
}

function criarSlugCategoria(nome){
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function salvarCategoria(){

  const nome = document.getElementById("nomeCategoria").value.trim();

  if(!nome){
    alert("Digite o nome da categoria.");
    return;
  }

  const slug = criarSlugCategoria(nome);

  const { error } = await supabaseClient
    .from("categorias")
    .insert([{
      nome,
      slug,
      ativo:true
    }]);

  if(error){
    console.log(error);
    alert("Erro ao salvar categoria.");
    return;
  }

  document.getElementById("nomeCategoria").value = "";

  carregarCategoriasAdmin();

  alert("Categoria criada!");
}

async function carregarCategoriasAdmin(){

  const lista = document.getElementById("listaCategoriasAdmin");

  if(!lista) return;

  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .order("nome");

  if(error){
    console.log(error);
    return;
  }

  lista.innerHTML = "";

  data.forEach(cat => {

    lista.innerHTML += `
      <div class="pedido-card">
        <h3>${cat.nome}</h3>

        <button
          class="excluir-produto"
          onclick="excluirCategoria(${cat.id})"
        >
          Excluir
        </button>
      </div>
    `;
  });
}

async function excluirCategoria(id){

  if(!confirm("Excluir categoria?")){
    return;
  }

  const { error } = await supabaseClient
    .from("categorias")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir.");
    return;
  }

  carregarCategoriasAdmin();
}

async function carregarCategoriasNoProduto(){

  const select = document.getElementById("produtoCategoria");

  if(!select) return;

  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    console.log(error);
    return;
  }

  select.innerHTML = "";

  data.forEach(cat => {
    select.innerHTML += `
      <option value="${cat.slug}">
        ${cat.nome}
      </option>
    `;
  });
}

verificarAdmin();