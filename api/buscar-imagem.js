export default async function handler(req, res){

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if(req.method === "OPTIONS"){
    return res.status(200).end();
  }

  const { q } = req.query;

  if(!q){
    return res.status(400).json({
      erro: "Pesquisa não informada."
    });
  }

  const apiKey = process.env.SERP_API_KEY;

  if(!apiKey){
    return res.status(500).json({
      erro: "SERP_API_KEY não configurada no Vercel."
    });
  }

  try{
    const url =
      `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(q)}&api_key=${apiKey}`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    const imagens = dados.image_results || [];

    return res.status(200).json({
      imagens
    });

  }catch(error){
    return res.status(500).json({
      erro: "Erro ao buscar imagens."
    });
  }
}