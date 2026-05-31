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

  const abaXls = document.getElementById("abaXls");
  const abaImagens = document.getElementById("abaImagens");

  if(abaXls){
    abaXls.classList.add("escondido");
  }

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

  if(aba === "xls" && abaXls){
    abaXls.classList.remove("escondido");
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
      categoria: categoriaAtual || "higiene",
      quantidade,
      chaveNome: normalizarTexto(nome)
    });
  });

  return produtos;
}

function extrairPrecos0003(linhas){
  console.log("TESTE PREÇO LINHA 12:", linhas[12]);
  console.log("TESTE PREÇO LINHA 13:", linhas[13]);
  console.log("TESTE PREÇO LINHA 14:", linhas[14]);
  console.log("TESTE PREÇO LINHA 15:", linhas[15]);
  console.log("TESTE PREÇO LINHA 16:", linhas[16]);

  const mapaPrecos = {};

  linhas.forEach(linha => {
    const nome = String(linha[2] || "").trim();

    const preco =
      dinheiroParaNumero(linha[15]) ||
      dinheiroParaNumero(linha[14]) ||
      dinheiroParaNumero(linha[13]) ||
      0;

    if(!nome){
      return;
    }

    if(nome.toUpperCase().includes("DESCRI")){
      return;
    }

    if(preco <= 0){
      return;
    }

    const chave = normalizarTexto(nome);
    mapaPrecos[chave] = preco;
  });

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

    console.log("Produtos extraídos do 0014:", produtosEstoque.slice(0, 10));
    console.log("Preços extraídos do 0003:", Object.entries(mapaPrecos).slice(0, 10));

    const produtosParaSalvar = [];
    let comPreco = 0;
    let semPreco = 0;

    for(const produto of produtosEstoque){
      const precoEncontrado = mapaPrecos[produto.chaveNome] || 0;

      if(precoEncontrado > 0){
        comPreco++;
      } else {
        semPreco++;
      }

      produtosParaSalvar.push({
        codigo: produto.codigo,
        nome: produto.nome,
        laboratorio: produto.laboratorio,
        marca: produto.marca,
        quantidade: produto.quantidade,
        valor: precoEncontrado > 0 ? precoEncontrado : 0,
        desconto: 0,
        imagem: "logo.png",
        descricao: "",
        categoria: produto.categoria || "higiene",
        promocao: false
      });
    }

    resultado.innerHTML = `<p>Salvando ${produtosParaSalvar.length} produtos...</p>`;

    const tamanhoLote = 300;
    let salvos = 0;

    for(let i = 0; i < produtosParaSalvar.length; i += tamanhoLote){
      const lote = produtosParaSalvar.slice(i, i + tamanhoLote);

      const { error } = await supabaseClient
        .from("produtos")
        .upsert(lote, {
  onConflict: "codigo",
  ignoreDuplicates: false
});

      if(error){
        console.log(error);
        resultado.innerHTML = `
          <p><strong>Erro ao salvar lote.</strong></p>
          <p>${error.message}</p>
        `;
        return;
      }

      salvos += lote.length;
      resultado.innerHTML = `<p>Salvando produtos... ${salvos}/${produtosParaSalvar.length}</p>`;
    }

    resultado.innerHTML = `
      <p><strong>Importação concluída!</strong></p>
      <p>Produtos do 0014: ${produtosEstoque.length}</p>
      <p>Com preço encontrado no 0003: ${comPreco}</p>
      <p>Sem preço: ${semPreco}</p>
      <p>Produtos salvos/atualizados: ${salvos}</p>
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
verificarAdmin();