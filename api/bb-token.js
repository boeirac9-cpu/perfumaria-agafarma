export default async function handler(req, res){

  if(req.method !== "GET"){
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  const clientId = process.env.BB_CLIENT_ID;
  const clientSecret = process.env.BB_CLIENT_SECRET;

  if(!clientId || !clientSecret){
    return res.status(500).json({
      erro: "Credenciais BB não configuradas."
    });
  }

  try{
    const credenciais = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const resposta = await fetch("https://oauth.bb.com.br/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credenciais}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials&scope=pix.write pix.read"
    });

    const dados = await resposta.json();

    if(!resposta.ok){
      return res.status(resposta.status).json({
        erro: "Erro ao gerar token BB.",
        detalhe: dados
      });
    }

    return res.status(200).json({
      access_token: dados.access_token,
      expires_in: dados.expires_in
    });

  }catch(error){
    return res.status(500).json({
      erro: "Erro interno ao gerar token.",
      detalhe: String(error)
    });
  }
}