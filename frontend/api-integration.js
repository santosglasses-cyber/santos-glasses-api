// API Integration for Santos Glasses
// Call this when firma is accepted

async function enviarFirmaAPI(presupuesto, cliente, email, telefono, codigo, firmaImg, fecha) {
  // Intentar enviar a nuestra API (Render)
  const API_URL = 'https://santos-glasses-api.onrender.com/api/firmar';
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presupuesto: presupuesto,
        cliente: cliente,
        email: email,
        telefono: telefono,
        codigo: codigo,
        firmaImg: firmaImg,
        fecha: fecha
      })
    });
    
    if (response.ok) {
      console.log('✅ Correos enviados via API');
      return true;
    } else {
      console.log('⚠️ API respondio con error, usando fallback email');
      return false;
    }
  } catch (e) {
    console.log('⚠️ API no disponible, usando fallback email');
    return false;
  }
}
