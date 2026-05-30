const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const SMTP_OPTS = [
  // Estrategia 1: Puerto 465 directo
  {
    host: 'mail.cristaleriasantosglasses.com',
    port: 465,
    secure: true,
    auth: { user: 'admin@cristaleriasantosglasses.com', pass: '1@j?@%177@G1' },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000
  },
  // Estrategia 2: Puerto 587 STARTTLS
  {
    host: 'mail.cristaleriasantosglasses.com',
    port: 587,
    secure: false,
    auth: { user: 'admin@cristaleriasantosglasses.com', pass: '1@j?@%177@G1' },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000
  },
  // Estrategia 3: IP directa puerto 465
  {
    host: '34.175.37.245',
    port: 465,
    secure: true,
    auth: { user: 'admin@cristaleriasantosglasses.com', pass: '1@j?@%177@G1' },
    tls: { rejectUnauthorized: false, servername: 'mail.cristaleriasantosglasses.com' },
    connectionTimeout: 15000
  }
];

let transportIndex = 0;

function getTransporter() {
  // Rotamos entre estrategias para tolerancia a fallos
  const opts = SMTP_OPTS[transportIndex % SMTP_OPTS.length];
  transportIndex++;
  console.log(`📧 Intentando SMTP [${opts.host}:${opts.port}]...`);
  return nodemailer.createTransport(opts);
}

console.log('✅ Servidor listo');

app.post('/api/firmar', async (req, res) => {
  try {
    const { presupuesto, cliente, email, telefono, codigo, firmaImg, fecha } = req.body;
    
    if (!presupuesto || !cliente) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    console.log(`📝 Firma: ${presupuesto} - ${cliente}`);
    
    // Responder AL INSTANTE
    res.json({ success: true, message: 'Firma recibida' });
    
    // Enviar emails en segundo plano
    setImmediate(() => enviarEmails(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha));
  } catch(e) {
    console.log('❌ Error en /firmar:', e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno' });
    }
  }
});

async function enviarEmails(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha) {
  // Intentar hasta 3 estrategias SMTP diferentes
  for (let intento = 0; intento < 3; intento++) {
    try {
      const mailer = getTransporter();
      
      const adminMail = {
        from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
        to: 'admin@cristaleriasantosglasses.com',
        subject: `✅ FIRMADO: ${presupuesto} - ${cliente}`,
        html: buildAdminHtml(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha)
      };

      const tasks = [mailer.sendMail(adminMail)];
      if (email) {
        const clienteMail = {
          from: '"Santos Glasses" <admin@cristaleriasantosglasses.com>',
          to: email,
          subject: `✅ ${presupuesto} - Confirmacion de firma - Santos Glasses`,
          html: buildClienteHtml(presupuesto, cliente, codigo, fecha)
        };
        tasks.push(mailer.sendMail(clienteMail));
      }

      await Promise.all(tasks);
      console.log(`✅ Correos enviados: ${presupuesto} [intento ${intento + 1}]`);
      return; // Éxito, salimos
    } catch(e) {
      console.log(`⚠️ Intento ${intento + 1} falló: ${e.message}`);
      if (intento === 2) {
        console.log(`❌ Todos los intentos SMTP fallaron para ${presupuesto}`);
      }
    }
  }
}

function buildAdminHtml(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha) {
  return `
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
          <a href="https://santosglasses-cyber.github.io/presupuestos/" style="display:inline-block;padding:10px 20px;background:#008c78;color:white;text-decoration:none;border-radius:6px;">📄 Ver presupuesto online</a>
        </p>
      </div>
    </div>
  `;
}

function buildClienteHtml(presupuesto, cliente, codigo, fecha) {
  return `
    <div style="font-family:Arial;max-width:600px;margin:auto;">
      <div style="background:#008c78;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="color:white;margin:0;">SANTOS GLASSES</h2>
      </div>
      <div style="border:1px solid #ddd;padding:20px;">
        <h3 style="color:#1a5276;">✅ Presupuesto aceptado correctamente</h3>
        <p style="font-size:14px;color:#555;line-height:1.5;">
          Gracias por confiar en <strong>Santos Glasses</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;font-weight:bold;">Presupuesto:</td><td>${presupuesto}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Cliente:</td><td>${cliente}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Fecha:</td><td>${fecha || '-'}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Código:</td><td style="font-size:18px;font-weight:bold;color:#008c78;letter-spacing:2px;">${codigo || '-'}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;">
        <p style="font-size:11px;color:#aaa;">Santos Glasses · C/ Concordia 11 posterior, 28931 Mostoles · Tlf: 646 469 788</p>
      </div>
    </div>
  `;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Santos Glasses API en puerto ${PORT}`);
});
