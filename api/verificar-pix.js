import https from "https";
import fetch from "node-fetch";

export default async function handler(req, res){

  if(req.method !== "GET"){
    return res.status(405).json({ erro:"Método não permitido." });
  }

  const { txid } = req.query;

  if(!txid){
    return res.status(400).json({ erro:"TXID não informado." });
  }

  const clientId = process.env.BB_CLIENT_ID;
  const clientSecret = process.env.BB_CLIENT_SECRET;
  const appKey = process.env.BB_APP_KEY;
  const certBase64 = process.env.BB_CERT_BASE64;
  const certPassword = process.env.BB_CERT_PASSWORD;

  try{
    const httpsAgent = new https.Agent({
      pfx: Buffer.from(certBase64, "base64"),
      passphrase: certPassword,
      rejectUnauthorized: true
    });

    const credenciais = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const tokenResposta = await fetch("https://oauth.bb.com.br/oauth/token", {
      method:"POST",
      headers:{
        "Authorization":`Basic ${credenciais}`,
        "Content-Type":"application/x-www-form-urlencoded"
      },
      body:"grant_type=client_credentials&scope=cob.read pix.read"
    });

    const tokenDados = await tokenResposta.json();

    if(!tokenResposta.ok){
      return res.status(tokenResposta.status).json({
        erro:"Erro ao gerar token.",
        detalhe:tokenDados
      });
    }

    const resposta = await fetch(
      `https://api-pix.bb.com.br/pix/v2/cob/${txid}?gw-dev-app-key=${appKey}`,
      {
        method:"GET",
        agent:httpsAgent,
        headers:{
          "Authorization":`Bearer ${tokenDados.access_token}`,
          "Content-Type":"application/json"
        }
      }
    );

    const texto = await resposta.text();

    let dados;
    try{
      dados = JSON.parse(texto);
    }catch(e){
      dados = { respostaBruta:texto };
    }

    if(!resposta.ok){
      return res.status(resposta.status).json({
        erro:"Erro ao consultar Pix.",
        detalhe:dados
      });
    }

    const pago = dados.status === "CONCLUIDA";

    return res.status(200).json({
      sucesso:true,
      pago,
      status:dados.status,
      txid,
      dados
    });

  }catch(error){
    return res.status(500).json({
      erro:"Erro interno ao verificar Pix.",
      detalhe:String(error)
    });
  }
}