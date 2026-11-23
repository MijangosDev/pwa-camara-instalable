let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function actualizarMensajeEstado(texto) {
  document.getElementById('mensaje-estado').textContent = texto;
}

/* ---------- Instalación ---------- */

window.addEventListener('beforeinstallprompt', (event) => {
  // evita el mini-banner automático y guarda el evento para usarlo con nuestro botón
  event.preventDefault();
  eventoInstalacionDiferido = event;

  const btnInstalar = document.getElementById('btn-instalar');
  btnInstalar.hidden = false;
});

document.getElementById('btn-instalar').addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        document.getElementById('btn-instalar').hidden = true;
      }
    })
    .finally(() => {
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  document.getElementById('btn-instalar').hidden = true;
});

// iOS: Safari no dispara beforeinstallprompt, así que se muestran los pasos manuales
function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

if (esIOS() && !window.navigator.standalone) {
  document.getElementById('aviso-ios').hidden = false;
}

/* ---------- Cámara ---------- */

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

function iniciarCamara(modo) {
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Este navegador no permite acceder a la cámara (se necesita HTTPS).');
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  document.getElementById('btn-alternar-camara').disabled = true;

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      const visorVideo = document.getElementById('visor-camara');
      visorVideo.srcObject = stream;
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    })
    .finally(() => {
      document.getElementById('btn-alternar-camara').disabled = false;
    });
}

/* ---------- Pre-permiso (consentimiento antes del diálogo nativo) ---------- */

// Paso 1: solo se muestra el aviso explicativo
document.getElementById('btn-preparar-camara').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = false;
});

// Paso 2: el usuario acepta y recién entonces se pide la cámara
document.getElementById('btn-confirmar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  iniciarCamara(modoCamaraActual);
});

document.getElementById('btn-cancelar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  actualizarMensajeEstado('La cámara sigue apagada.');
});

/* ---------- Cambiar de lente y apagar ---------- */

document.getElementById('btn-alternar-camara').addEventListener('click', () => {
  if (!streamActual) {
    actualizarMensajeEstado('Primero enciende la cámara con el botón de solicitar acceso.');
    return;
  }

  const modoAnterior = modoCamaraActual;
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';

  iniciarCamara(modoCamaraActual).then(() => {
    // si el cambio falló (por ejemplo, no hay ese lente), se conserva el modo anterior
    if (!streamActual) {
      modoCamaraActual = modoAnterior;
    }
  });
});

document.getElementById('btn-apagar-camara').addEventListener('click', () => {
  detenerCamaraActiva();
  document.getElementById('visor-camara').srcObject = null;
  actualizarMensajeEstado('La cámara está apagada.');
});

/* ---------- Service Worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('[SW] Registrado, scope:', registro.scope);
      })
      .catch((error) => {
        console.error('[SW] Error al registrar:', error);
      });
  });
}
