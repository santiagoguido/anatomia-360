import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/press-start-2p/latin-400.css';
import './styles/main.css';
import './styles/ronda.css';
import './styles/paneles.css';
import './styles/clinica.css';

import { crearApp } from './app.js';
import { api, configurado } from './api/supabase.js';
import { crearAlmacen } from './utils/almacen.js';
import { iniciarJuego } from './game/iniciarJuego.js';

crearApp({
  raiz: document.getElementById('app'),
  api,
  almacen: crearAlmacen(),
  iniciarJuego,
  configurado,
});
