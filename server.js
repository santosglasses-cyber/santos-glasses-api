const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Config SMTP
const transporter = nodemailer.createTransport({
  host: 'mail.cristaleriasantosglasses.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@cristaleriasantosglasses.com',
    pass: '1@j?@%177@G1'
  },
  tls: { rejectUnauthorized: false }
});

// Verify SMTP on startup
transporter.verify().then(() => {
  console.log('✅ SMTP connected');
}).catch(e => {
  console.log('⚠️ SMTP error:', e.message);
});

// ENDPOINT: Recibir firma + enviar correos
app.post('/api/firmar', async (req, res) => {
  try {
    const { presupuesto, cliente, email, telefono, codigo, firmaImg, fecha } = req.body;
    
    if (!presupuesto || !cliente) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    console.log(`📝 Firma recibida: ${presupuesto} - ${cliente}`);

    // Email para el ADMIN (Antonio)
    const adminMail = {
      from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
      to: 'admin@cristaleriasantosglasses.com',
      subject: `✅ FIRMADO: ${presupuesto} - ${cliente}`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:auto;">
          <div style="background:#008c78;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
            <h2 style="color:white;margin:0;">SANTOS GLASSES</h2>
          </div>
          <div style="border:1px solid #ddd;padding:20px;">
            <h3 style="color:#1a5276;">✅ PRESUPUESTO ACEPTADO Y FIRMADO</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;font-weight:bold;">Presupuesto:</td><td>${presupuesto}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Cliente:</td><td>${cliente}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td>${email || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Teléfono:</td><td>${telefono || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Fecha firma:</td><td>${fecha || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Código:</td><td style="font-size:18px;font-weight:bold;color:#008c78;letter-spacing:2px;">${codigo || '-'}</td></tr>
            </table>
            ${firmaImg ? `<div style="margin:15px 0;padding:10px;background:#f9f9f9;border-radius:6px;border:1px solid #ddd;">
              <p style="font-size:11px;color:#888;margin:0 0 6px;">FIRMA DEL CLIENTE:</p>
              <img src="${firmaImg}" style="max-width:250px;border:1px solid #ccc;border-radius:4px;">
            </div>` : ''}
            <p style="margin-top:15px;">
              <a href="https://santosglasses-cyber.github.io/presupuestos/" 
                 style="display:inline-block;padding:10px 20px;background:#008c78;color:white;text-decoration:none;border-radius:6px;">
                📄 Ver presupuesto online
              </a>
            </p>
          </div>
        </div>
      `
    };

    // Email para el CLIENTE
    const clienteMail = {
      from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
      to: email || 'santos.glasses@hotmail.com',
      subject: `✅ ${presupuesto} - Confirmacion de firma - Santos Glasses`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:auto;">
          <div style="background:#008c78;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
            <h2 style="color:white;margin:0;">SANTOS GLASSES</h2>
          </div>
          <div style="border:1px solid #ddd;padding:20px;">
            <h3 style="color:#1a5276;">✅ Presupuesto aceptado correctamente</h3>
            <p style="font-size:14px;color:#555;line-height:1.5;">
              Gracias por confiar en <strong>Santos Glasses</strong>. 
              Su presupuesto ha sido registrado con los siguientes datos:
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px 0;font-weight:bold;">Presupuesto:</td><td>${presupuesto}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Cliente:</td><td>${cliente}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Fecha:</td><td>${fecha || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Código comprobante:</td><td style="font-size:16px;font-weight:bold;color:#008c78;letter-spacing:2px;">${codigo || '-'}</td></tr>
            </table>
            <p style="font-size:11px;color:#888;"><strong>Importante:</strong> Guarde el codigo de comprobante para cualquier consulta.</p>
            <hr style="border:none;border-top:1px solid #eee;">
            <p style="font-size:11px;color:#aaa;">Santos Glasses · C/ Concordia 11 posterior, 28931 Mostoles · Tlf: 646 469 788</p>
          </div>
        </div>
      `
    };

    // Enviar en segundo plano - no esperar
    Promise.all([
      transporter.sendMail(adminMail).catch(e => console.log('❌ Admin mail error:', e.message)),
      ...(email ? [transporter.sendMail(clienteMail).catch(e => console.log('❌ Client mail error:', e.message))] : [])
    ]).then(() => {
      console.log(`✅ Correos enviados para ${presupuesto}`);
    });
  } catch(e) {
    console.log('⚠️ Error preparando emails:', e.message);
  }
}

async function enviarEmailsBackground(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha) {
  try {
    // Email para el ADMIN (Antonio)
    const adminMail = {
      from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
      to: 'admin@cristaleriasantosglasses.com',
      subject: `✅ FIRMADO: ${presupuesto} - ${cliente}`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:auto;">
          <div style="background:#008c78;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
            <h2 style="color:white;margin:0;">SANTOS GLASSES</h2>
          </div>
          <div style="border:1px solid #ddd;padding:20px;">
            <h3 style="color:#1a5276;">✅ PRESUPUESTO ACEPTADO Y FIRMADO</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;font-weight:bold;">Presupuesto:</td><td>${presupuesto}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Cliente:</td><td>${cliente}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td>${email || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Teléfono:</td><td>${telefono || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Fecha firma:</td><td>${fecha || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Código:</td><td style="font-size:18px;font-weight:bold;color:#008c78;letter-spacing:2px;">${codigo || '-'}</td></tr>
            </table>
            ${firmaImg ? `<div style="margin:15px 0;padding:10px;background:#f9f9f9;border-radius:6px;border:1px solid #ddd;">
              <p style="font-size:11px;color:#888;margin:0 0 6px;">FIRMA DEL CLIENTE:</p>
              <img src="${firmaImg}" style="max-width:250px;border:1px solid #ccc;border-radius:4px;">
            </div>` : ''}
            <p style="margin-top:15px;">
              <a href="https://santosglasses-cyber.github.io/presupuestos/" 
                 style="display:inline-block;padding:10px 20px;background:#008c78;color:white;text-decoration:none;border-radius:6px;">
                📄 Ver presupuesto online
              </a>
            </p>
          </div>
        </div>
      `
    };

    // Email para el CLIENTE
    const clienteMail = {
      from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
      to: email || 'santos.glasses@hotmail.com',
      subject: `✅ ${presupuesto} - Confirmacion de firma - Santos Glasses`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:auto;">
          <div style="background:#008c78;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
            <h2 style="color:white;margin:0;">SANTOS GLASSES</h2>
          </div>
          <div style="border:1px solid #ddd;padding:20px;">
            <h3 style="color:#1a5276;">✅ Presupuesto aceptado correctamente</h3>
            <p style="font-size:14px;color:#555;line-height:1.5;">
              Gracias por confiar en <strong>Santos Glasses</strong>. 
              Su presupuesto ha sido registrado con los siguientes datos:
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px 0;font-weight:bold;">Presupuesto:</td><td>${presupuesto}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Cliente:</td><td>${cliente}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Fecha:</td><td>${fecha || '-'}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Código comprobante:</td><td style="font-size:16px;font-weight:bold;color:#008c78;letter-spacing:2px;">${codigo || '-'}</td></tr>
            </table>
            <p style="font-size:11px;color:#888;"><strong>Importante:</strong> Guarde el codigo de comprobante para cualquier consulta.</p>
            <hr style="border:none;border-top:1px solid #eee;">
            <p style="font-size:11px;color:#aaa;">Santos Glasses · C/ Concordia 11 posterior, 28931 Mostoles · Tlf: 646 469 788</p>
          </div>
        </div>
      `
    };

    await Promise.all([
      transporter.sendMail(adminMail),
      ...(email ? [transporter.sendMail(clienteMail)] : [])
    ]);
    console.log(`✅ Correos enviados para ${presupuesto}`);
  } catch(e) {
    console.log('❌ Error enviando correos:', e.message);
  }
}

// ENDPOINT: Recibir firma - responde INMEDIATAMENTE
app.post('/api/firmar', async (req, res) => {
  const { presupuesto, cliente, email, telefono, codigo, firmaImg, fecha } = req.body;
  
  if (!presupuesto || !cliente) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  console.log(`📝 Firma recibida: ${presupuesto} - ${cliente}`);
  
  // Responder AL INSTANTE
  res.json({ success: true, message: 'Firma recibida, enviando correos...' });
  
  // Enviar emails en segundo plano (después de responder)
  enviarEmailsBackground(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Santos Glasses API corriendo en puerto ${PORT}`);
});
