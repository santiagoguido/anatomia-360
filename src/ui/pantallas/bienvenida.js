import { h } from '../../utils/dom.js';
import { crearBoton, crearFicha } from '../componentes.js';
import { crearAvatar } from '../sprites.js';

/** Para quien ya se registró antes: se le saluda y se recupera su progreso. */
export function crearBienvenida(ctx, { jugador, aviso } = {}) {
  const { estado, almacen, api } = ctx;
  if (!jugador) return { redirigir: 'registro' };

  const entrar = () => {
    almacen.guardar(jugador.matricula);
    estado.iniciarSesion(jugador);
    api.registrarAcceso(jugador.matricula);
    ctx.irA('campus');
  };
  const noSoyYo = () => {
    almacen.borrar();
    estado.limpiarRegistro();
    ctx.irA('registro');
  };

  const saludo = jugador.genero === 'femenino' ? 'Bienvenida' : 'Bienvenido';
  const el = h(
    'section',
    { class: 'pantalla bienvenida', 'aria-labelledby': 'bienvenida-titulo' },
    h('div', { class: 'bienvenida__avatar' }, crearAvatar(jugador.genero)),
    h(
      'div',
      { class: 'bienvenida__texto' },
      aviso && h('p', { class: 'aviso', role: 'status' }, aviso),
      h('h1', { id: 'bienvenida-titulo', class: 'titulo-pantalla', tabindex: '-1' }, `${saludo} de nuevo, ${jugador.nombre}`),
      h(
        'div',
        { class: 'fichas' },
        crearFicha('Matrícula', jugador.matricula_oculta),
        crearFicha('Récord total', `${jugador.record_total} pts`),
        crearFicha('Racha', `${jugador.racha_dias} ${jugador.racha_dias === 1 ? 'día' : 'días'}`),
      ),
      h(
        'div',
        { class: 'acciones' },
        crearBoton({ texto: 'Soy yo, entrar al campus', foco: true, onClick: entrar }),
        crearBoton({ texto: 'No soy yo', variante: 'secundario', onClick: noSoyYo }),
      ),
      h('p', { class: 'ayuda' }, '¿Ese no es tu nombre? Revisa que tu matrícula esté bien escrita. Si es la tuya y alguien más la usó, avisa a tu docente.'),
    ),
  );
  return { el };
}
