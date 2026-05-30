const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

console.log('✅ Servidor listo');

// ENDPOINT: Recibir firma - responde INMEDIATAMENTE y envía por proxy o SMTP
app.post('/api/firmar', async (req, res) => {
  try {
    const data = req.body;
    if (!data.presupuesto || !data.cliente) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    console.log('Firma:', data.presupuesto, data.cliente);
    
    // Responder AL INSTANTE
    res.json({ success: true, message: 'Firma recibida' });
    
    // Intentar enviar en segundo plano
    setImmediate(() => enviar(data));
  } catch(e) {
    console.log('Error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

async function enviar(d) {
  // Intento 1: Proxy local (HTTP)
  try {
    await fetch('http://76.13.36.216:33500/api/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
      signal: AbortSignal.timeout(10000)
    });
    console.log('Proxy OK');
    return;
  } catch(e) {
    console.log('Proxy fallo:', e.message);
  }

  // Intento 2: SMTP directo (por si acaso)
  try {
    const t = nodemailer.createTransport({
      host: 'mail.cristaleriasantosglasses.com',
      port: 465,
      secure: true,
      auth: { user: 'admin@cristaleriasantosglasses.com', pass: '1@j?@%177@G1' },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000
    });
    
    await t.sendMail({
      from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
      to: 'admin@cristaleriasantosglasses.com',
      subject: 'FIRMADO: ' + d.presupuesto + ' - ' + d.cliente,
      html: buildAdmin(d)
    });
    
    if (d.email) {
      await t.sendMail({
        from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
        to: d.email,
        subject: d.presupuesto + ' - Confirmacion de firma',
        html: buildClient(d)
      });
    }
    console.log('SMTP directo OK');
  } catch(e) {
    console.log('SMTP fallo:', e.message);
  }
}

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildAdmin(d) {
  var f = d.firmaImg ? '<div style="margin:15px 0;padding:10px;background:#f9f9f9;border:1px solid #ddd;"><p style="font-size:11px;color:#888;">FIRMA:</p><img src="'+d.firmaImg+'" style="max-width:250px;border:1px solid #ccc;"></div>' : '';
  return '<div style="font-family:Arial;max-width:600px;margin:auto;"><div style="background:#008c78;padding:15px;text-align:center;"><h2 style="color:white;margin:0;">SANTOS GLASSES</h2></div><div style="border:1px solid #ddd;padding:20px;"><h3>PRESUPUESTO ACEPTADO</h3><table style="width:100%"><tr><td style="font-weight:bold;padding:4px;">Ref:</td><td>'+esc(d.presupuesto)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Cliente:</td><td>'+esc(d.cliente)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Email:</td><td>'+esc(d.email)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Telefono:</td><td>'+esc(d.telefono)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Fecha:</td><td>'+esc(d.fecha)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Codigo:</td><td style="font-size:18px;color:#008c78;letter-spacing:2px;">'+esc(d.codigo)+'</td></tr></table>'+f+'<p><a href="https://santosglasses-cyber.github.io/presupuestos/" style="padding:10px 20px;background:#008c78;color:white;text-decoration:none;">Ver online</a></p></div></div>';
}

function buildClient(d) {
  return '<div style="font-family:Arial;max-width:600px;margin:auto;"><div style="background:#008c78;padding:15px;text-align:center;"><h2 style="color:white;margin:0;">SANTOS GLASSES</h2></div><div style="border:1px solid #ddd;padding:20px;"><h3>Presupuesto aceptado</h3><p>Gracias por confiar en Santos Glasses.</p><table style="width:100%;font-size:13px;"><tr><td style="font-weight:bold;padding:4px;">Ref:</td><td>'+esc(d.presupuesto)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Cliente:</td><td>'+esc(d.cliente)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Fecha:</td><td>'+esc(d.fecha)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Codigo:</td><td style="font-size:18px;color:#008c78;letter-spacing:2px;">'+esc(d.codigo)+'</td></tr></table><hr><p style="font-size:11px;color:#aaa;">Santos Glasses - C/ Concordia 11 posterior, 28931 Mostoles - Tlf: 646 469 788</p></div></div>';
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

var PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', function() {
  console.log('API en puerto ' + PORT);
});
