let produtosImportados = [];

function limparTexto(valor){
  return String(valor || "").trim();
}

function pegarCodigo(valor){
  const codigo = String(valor || "").replace(/\D/g, "");

  if(codigo.length >= 8 && codigo.length <= 14){
    return codigo;
  }

  return null;
}

function detectarCategoria(nome){
  const n = nome.toLowerCase();

  if(n.includes("perf") || n.includes("colonia")) return "perfumes";
  if(n.includes("shamp") || n.includes("cond") || n.includes("ampola")) return "cabelo";
  if(n.includes("fralda") || n.includes("baby") || n.includes("mam")) return "infantil";
  if(n.includes("batom") || n.includes("base") || n.includes("blush")) return "maquiagem";
  if(n.includes("rosto") || n.includes("facial") || n.includes("micel")) return "rosto";
  if(n.includes("hidrat") || n.includes("body") || n.includes("sabonete")) return "corpo";

  return "higiene";
}

function lerArquivo(){
  const arquivo = document.getElementById("arquivoXLS").files[0];

  if(!arquivo){
    alert("Selecione um XLS.");
    return;
  }

  const leitor = new FileReader();

  leitor.onload = function(e){
    const dados = new Uint8Array(e.target.result);
    const workbook = XLSX.read(dados, { type:"array" });
    const planilha = workbook.Sheets[workbook.SheetNames[0]];

    const linhas = XLSX.utils.sheet_to_json(planilha, {
      header:1,
      defval:""
    });

    produtosImportados = [];

    linhas.forEach(linha => {
      const valores = linha.map(limparTexto);

      valores.forEach((valor, index) => {
        const codigo = pegarCodigo(valor);

        if(!codigo){
          return;
        }

        const nome = valores[index + 1] || "";
        const laboratorio = valores[index + 2] || "";

        if(nome.length < 3){
          return;
        }

        let quantidade = 0;

        for(let i = valores.length - 1; i >= 0; i--){
          const numero = Number(String(valores[i]).replace(",", "."));

          if(!isNaN(numero) && numero >= 0 && numero < 99999){
            quantidade = numero;
            break;
          }
        }

        produtosImportados.push({
          codigo: codigo,
          nome: nome,
          marca: laboratorio,
          laboratorio: laboratorio,
          descricao: "",
          valor: 0,
          desconto: 0,
          quantidade: quantidade,
          categoria: detectarCategoria(nome),
          promocao: false,
          imagem: "logo.png"
        });
      });
    });

    document.getElementById("resultado").innerHTML =
      `<p>${produtosImportados.length} produtos encontrados.</p>`;

    mostrarPreview();
  };

  leitor.readAsArrayBuffer(arquivo);
}

function mostrarPreview(){
  const preview = document.getElementById("previewProdutos");
  preview.innerHTML = "";

  produtosImportados.slice(0,30).forEach(produto => {
    preview.innerHTML += `
      <div class="produto-preview">
        <strong>${produto.nome}</strong><br>
        Código: ${produto.codigo}<br>
        Laboratório: ${produto.laboratorio || "Em branco"}<br>
        Estoque: ${produto.quantidade}<br>
        Categoria sugerida: ${produto.categoria}<br>
        Descrição: em branco<br>
        Valor: R$ 0,00<br>
        Imagem: logo.png
      </div>
    `;
  });
}

async function importarProdutos(quantidade){
  if(produtosImportados.length === 0){
    alert("Leia o XLS primeiro.");
    return;
  }

  const lista = quantidade === "todos"
    ? produtosImportados
    : produtosImportados.slice(0, quantidade);

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for(const produtoNovo of lista){
    const { data: existente, error: erroBusca } = await supabaseClient
      .from("produtos")
      .select("*")
      .eq("codigo", produtoNovo.codigo)
      .maybeSingle();

    if(erroBusca){
      console.log(erroBusca);
      erros++;
      continue;
    }

    if(existente){
      const { error } = await supabaseClient
        .from("produtos")
        .update({
          quantidade: produtoNovo.quantidade,
          laboratorio: produtoNovo.laboratorio || existente.laboratorio,
          marca: existente.marca || produtoNovo.marca
        })
        .eq("id", existente.id);

      if(error){
        console.log(error);
        erros++;
      } else {
        atualizados++;
      }
    } else {
      const { error } = await supabaseClient
        .from("produtos")
        .insert([produtoNovo]);

      if(error){
        console.log(error);
        erros++;
      } else {
        criados++;
      }
    }

    document.getElementById("resultado").innerHTML =
      `<p>Criados: ${criados}<br>Atualizados: ${atualizados}<br>Erros: ${erros}</p>`;
  }

  alert(`Finalizado!\nCriados: ${criados}\nAtualizados: ${atualizados}\nErros: ${erros}`);
}