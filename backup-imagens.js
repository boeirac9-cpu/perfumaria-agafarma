import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = "https://bohfiydxvnqqtzxoaddf.supabase.co";
const SUPABASE_KEY = "sb_publishable_P9eKigJblG47ArdcyYB-ZA_xWvaUlbM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pastaBackup = "./backup-imagens";

if (!fs.existsSync(pastaBackup)) {
  fs.mkdirSync(pastaBackup);
}

function limparNomeArquivo(nome) {
  return String(nome || "")
    .replace(/[^\w.-]/g, "")
    .trim();
}

async function baixarImagem(url, caminho) {
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error("Erro ao baixar imagem");
  }

  const buffer = Buffer.from(await resposta.arrayBuffer());
  fs.writeFileSync(caminho, buffer);
}

async function iniciarBackup() {
  console.log("Buscando produtos...");

  let produtos = [];
let inicio = 0;
const lote = 1000;

while (true) {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .not("imagem", "is", null)
    .range(inicio, inicio + lote - 1);

  if (error) {
    console.error("Erro ao buscar produtos:", error);
    return;
  }

  if (!data || data.length === 0) break;

  produtos = produtos.concat(data);

  console.log(`Buscou até agora: ${produtos.length}`);

  if (data.length < lote) break;

  inicio += lote;
}


  console.log(`Produtos encontrados: ${produtos.length}`);

  let salvas = 0;
  let erros = 0;

  for (const produto of produtos) {
    try {
      const codigoReduzido =
        produto.codigo_reduzido ||
        produto.codigoReduzido ||
        produto.codigo ||
        produto.cod ||
        produto.id;

      const imagem = produto.imagem;

      if (!codigoReduzido || !imagem) continue;
      if (imagem.includes("logo.png")) continue;

      const nomeArquivo = limparNomeArquivo(codigoReduzido) + ".jpg";
      const caminhoArquivo = path.join(pastaBackup, nomeArquivo);

      await baixarImagem(imagem, caminhoArquivo);

      console.log("Salvou:", nomeArquivo);
      salvas++;
    } catch (err) {
      console.log("Erro em produto:", produto.nome || produto.codigo);
      erros++;
    }
  }

  const linhasCSV = ["codigo_reduzido,nome_produto,imagem"];

produtos.forEach(produto => {
  const codigoReduzido =
    produto.codigo_reduzido ||
    produto.codigoReduzido ||
    produto.codigo ||
    produto.cod ||
    produto.id;

  const nome = String(produto.nome || "").replace(/,/g, " ");
  const imagem = `${codigoReduzido}.jpg`;

  linhasCSV.push(`${codigoReduzido},${nome},${imagem}`);
});

fs.writeFileSync(
  "./backup-imagens/planilha-backup-imagens.csv",
  linhasCSV.join("\n"),
  "utf8"
);

console.log("Planilha criada: planilha-backup-imagens.csv");

  console.log("Backup finalizado!");
  console.log("Imagens salvas:", salvas);
  console.log("Erros:", erros);
}

iniciarBackup();