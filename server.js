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

// ENDPOINT: Recibir actualización de datos del cliente
app.post('/api/actualizar-cliente', async (req, res) => {
  try {
    const data = req.body;
    if (!data.presupuesto || !data.nombre) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    console.log('Actualizar cliente:', data.presupuesto, data.nombre);
    res.json({ success: true, message: 'Datos recibidos', data: data });
    // Notificar a Paco via Telegram
    setImmediate(() => {
      const TELEGRAM_TOKEN = '8027730556:AAGLC1ARyfqMogbDYp6n5IT_Tq-YaHq3oDk';
      const CHAT_ID = '1291982313';
      const https = require('https');
      const msg = '✏️ DATOS CLIENTE ACTUALIZADOS\nPresupuesto: ' + (data.presupuesto||'-') + '\nNombre: ' + (data.nombre||'-') + '\nDirección: ' + (data.direccion||'-') + '\nLocalidad: ' + (data.localidad||'-') + '\nCP: ' + (data.cp||'-') + '\nProvincia: ' + (data.provincia||'-') + '\nTeléfono: ' + (data.telefono||'-') + '\nEmail: ' + (data.email||'-');
      try {
        const postData = JSON.stringify({ chat_id: CHAT_ID, text: msg });
        const opt = {
          hostname: 'api.telegram.org',
          path: '/bot' + TELEGRAM_TOKEN + '/sendMessage',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        const r = https.request(opt);
        r.write(postData);
        r.end();
      } catch(e) { console.log('Telegram notify error:', e.message); }
    });
    // Enviar email a admin con los cambios (3 estrategias)
    setImmediate(async () => {
      var html = '<div style="font-family:Arial;max-width:600px;margin:auto;"><div style="background:#008c78;padding:15px;text-align:center;"><h2 style="color:white;margin:0;">SANTOS GLASSES</h2></div><div style="border:1px solid #ddd;padding:20px;"><h3 style="color:#cc6600;">✏️ DATOS DE CLIENTE ACTUALIZADOS</h3>';
      html += '<table style="width:100%;font-size:13px;"><tr><td style="font-weight:bold;padding:4px;">Presupuesto:</td><td>'+esc(data.presupuesto)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Nombre:</td><td>'+esc(data.nombre)+'</td></tr><tr><td style="font-weight:bold;padding:4px;">CIF/NIF:</td><td>'+esc(data.cif||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Dirección:</td><td>'+esc(data.direccion||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Localidad:</td><td>'+esc(data.localidad||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">C.P.:</td><td>'+esc(data.cp||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Provincia:</td><td>'+esc(data.provincia||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Teléfono:</td><td>'+esc(data.telefono||'-')+'</td></tr><tr><td style="font-weight:bold;padding:4px;">Email:</td><td>'+esc(data.email||'-')+'</td></tr></table>';
      html += '<p><a href="https://santosglasses-cyber.github.io/presupuestos/'+esc(data.presupuesto)+'.html" style="padding:10px 20px;background:#008c78;color:white;text-decoration:none;">Ver presupuesto</a></p></div></div>';
      var subject = '✏️ ACTUALIZAR CLIENTE: ' + data.presupuesto + ' - ' + data.nombre;
      var mailOpts = { from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>', to: 'admin@cristaleriasantosglasses.com', subject: subject, html: html };
      var configs = [
        { host: 'mail.cristaleriasantosglasses.com', port: 465, secure: true },
        { host: 'mail.cristaleriasantosglasses.com', port: 587, secure: false }
      ];
      for (var i = 0; i < configs.length; i++) {
        try {
          var t = nodemailer.createTransport({
            host: configs[i].host,
            port: configs[i].port,
            secure: configs[i].secure,
            auth: { user: 'admin@cristaleriasantosglasses.com', pass: '1@j?@%177@G1' },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000
          });
          await t.sendMail(mailOpts);
          console.log('Email actualización enviado (puerto ' + configs[i].port + ')');
          return;
        } catch(e) { console.log('Email falló puerto ' + configs[i].port + ': ' + e.message); }
      }
      console.log('Todos los intentos de email fallaron');
    });
  } catch(e) {
    console.log('Error actualizar cliente:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

var PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', function() {
  console.log('API en puerto ' + PORT);
});
