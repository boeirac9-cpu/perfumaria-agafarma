import https from "https";
import fetch from "node-fetch";

function emv(id, valor){
  const texto = String(valor);
  const tamanho = String(texto.length).padStart(2, "0");
  return `${id}${tamanho}${texto}`;
}

function crc16(payload){
  let crc = 0xffff;

  for(let i = 0; i < payload.length; i++){
    crc ^= payload.charCodeAt(i) << 8;

    for(let j = 0; j < 8; j++){
      crc = (crc & 0x8000)
        ? (crc << 1) ^ 0x1021
        : crc << 1;
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function gerarPixCopiaCola({ chave, nome, cidade, valor, txid }){
  const gui = emv("00", "br.gov.bcb.pix");
  const chavePix = emv("01", chave);
  const merchantAccount = emv("26", gui + chavePix);

  let payload =
    emv("00", "01") +
    merchantAccount +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", Number(valor).toFixed(2)) +
    emv("58", "BR") +
    emv("59", nome.substring(0, 25)) +
    emv("60", cidade.substring(0, 15)) +
    emv("62", emv("05", txid.substring(0, 25)));

  payload += "6304";

  return payload + crc16(payload);
}

export default async function handler(req, res){

  if(req.method !== "POST"){
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const clientId = process.env.BB_CLIENT_ID;
  const clientSecret = process.env.BB_CLIENT_SECRET;
  const appKey = process.env.BB_APP_KEY;
  const pixKey = process.env.BB_PIX_KEY;
  const certBase64 = process.env.BB_CERT_BASE64;
  const certPassword = process.env.BB_CERT_PASSWORD;

  if(!clientId || !clientSecret || !appKey || !pixKey || !certBase64 || !certPassword){
    return res.status(500).json({
      erro: "Credenciais BB ou certificado não configurados."
    });
  }

  try{
    const pfxBuffer = Buffer.from(certBase64, "base64");

    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: certPassword,
      rejectUnauthorized: true
    });

    const { valor, nome, cpf, pedidoId } = req.body;

    if(!valor || Number(valor) <= 0){
      return res.status(400).json({ erro: "Valor inválido." });
    }

    const credenciais = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const tokenResposta = await fetch("https://oauth.bb.com.br/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credenciais}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials&scope=cob.write cob.read pix.write pix.read"
    });

    const tokenDados = await tokenResposta.json();

    if(!tokenResposta.ok){
      return res.status(tokenResposta.status).json({
        erro: "Erro ao gerar token BB.",
        detalhe: tokenDados
      });
    }

    const token = tokenDados.access_token;

    const txid = (
      "AGAFARMA" +
      Date.now() +
      Math.floor(Math.random() * 1000000000)
    ).substring(0, 35);

    

const corpoCobranca = {
  calendario:{
    expiracao:3600
  },
  valor:{
    original:Number(valor).toFixed(2)
  },
  chave:pixKey,
  
  solicitacaoPagador:`Pedido Agafarma ${pedidoId || txid}`
};

    if(nome && cpf){
      corpoCobranca.devedor = {
        cpf:String(cpf).replace(/\D/g, ""),
        nome:String(nome).substring(0, 200)
      };
    }

    const criarCobranca = await fetch(
      `https://api-pix.bb.com.br/pix/v2/cob/${txid}?gw-dev-app-key=${appKey}`,
      {
        method:"PUT",
        agent:httpsAgent,
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify(corpoCobranca)
      }
    );

    const cobrancaTexto = await criarCobranca.text();

    let cobranca;
    try{
      cobranca = JSON.parse(cobrancaTexto);
    }catch(e){
      cobranca = { respostaBruta:cobrancaTexto };
    }

    if(!criarCobranca.ok){
      return res.status(criarCobranca.status).json({
        erro:"Erro ao criar cobrança Pix.",
        status:criarCobranca.status,
        detalhe:cobranca
      });
    }

    const pixCopiaECola = cobranca.pixCopiaECola;

if(pixCopiaECola){
  const imagemQrcode =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

  return res.status(200).json({
    sucesso:true,
    txid,
    valor:Number(valor).toFixed(2),
    pixCopiaECola,
    imagemQrcode,
    cobrancaCompleta:cobranca
  });
}

const locId = cobranca.loc && cobranca.loc.id;

if(!locId){
  return res.status(500).json({
    erro:"O Banco do Brasil não retornou pixCopiaECola nem loc.id.",
    txid,
    cobrancaCompleta:cobranca
  });
}

const buscarQrCode = await fetch(
      `https://api-pix.bb.com.br/pix/v2/loc/${locId}/qrcode?gw-dev-app-key=${appKey}`,
      {
        method:"GET",
        agent:httpsAgent,
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      }
    );

    const qrTexto = await buscarQrCode.text();

    let qrCode;
    try{
  cobranca = JSON.parse(cobrancaTexto);

  console.log(
    "COBRANCA BB:",
    JSON.stringify(cobranca, null, 2)
  );

}catch(e){
  cobranca = { respostaBruta:cobrancaTexto };
}

    if(!buscarQrCode.ok){
      return res.status(buscarQrCode.status).json({
        erro:"Cobrança criada, mas erro ao buscar QR Code.",
        status:buscarQrCode.status,
        cobranca,
        detalhe:qrCode
      });
    }

    return res.status(200).json({
      sucesso:true,
      txid,
      valor:Number(valor).toFixed(2),
      pixCopiaECola:qrCode.qrcode || qrCode.emv || "",
      imagemQrcode:qrCode.imagemQrcode || "",
      cobranca,
      qrCode
    });

  }catch(error){
    return res.status(500).json({
      erro:"Erro interno ao gerar Pix.",
      detalhe:String(error)
    });
  }
}