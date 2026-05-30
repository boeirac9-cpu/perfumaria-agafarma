export default async function handler(req, res){

  if(req.method === "GET"){
    return res.status(200).json({
      sucesso:true,
      mensagem:"Webhook Pix ativo."
    });
  }

  if(req.method === "POST"){
    console.log("WEBHOOK PIX BB:", JSON.stringify(req.body, null, 2));

    return res.status(200).json({
      sucesso:true,
      recebido:true
    });
  }

  return res.status(405).json({
    erro:"Método não permitido."
  });
}