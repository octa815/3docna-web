# 3DOCNA · Impresión 3D en Elda

Web de 3DOCNA (Octavio y Natalia). Sitio estático: HTML, CSS y JavaScript, publicado en Netlify.

## Qué tiene

- Portada donde la mascota se imprime en 3D capa a capa con el scroll (Three.js). Al terminar, la pantalla se lamina en capas que se deslizan.
- Una boquilla 3D dibuja una línea de filamento entre secciones.
- Catálogo que se genera desde `data/productos.json`, con filtros, carrusel de fotos y cesta.
- Configurador del farol con precio en vivo, cesta y WhatsApp.
- Formulario de pedido (FormSubmit) con el resumen de la cesta.
- Modo claro y oscuro, tamaño de texto y opción de quitar animaciones.
- Aviso legal, condiciones de venta, privacidad, cookies y página 404.
- Sin cookies ni llamadas a terceros al cargar: fuentes y librerías alojadas aquí.

## Añadir o cambiar productos

Solo se edita `data/productos.json`. Las instrucciones están en `img/README.md`.

## Cambiar textos de una página

El contenido de cada página está en `tools/pages/`. La cabecera, la cesta y el pie son comunes y están en `tools/build.py`.
Después de editar, genera las páginas:

```bash
python3 tools/build.py
```

Los `.html` de la raíz son el resultado: no los edites a mano, se sobrescriben.

## Ver en local

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

Usa rutas absolutas (`/css/…`), así que hay que abrirla con un servidor, no con doble clic.

## Pruebas

Usan el Chrome del sistema.

```bash
npm install
npm test
```

## Estructura

```
tools/pages/        Contenido de cada página
tools/build.py      Generador (cabecera, cesta y pie comunes)
css/site.css        Estilos
js/app.js           Común: ajustes, menú, cesta, scroll suave, apariciones
js/home.js          Portada: impresión 3D, laminado, cuenta atrás
js/printer.js       Impresora y mascota en 3D
js/catalog.js       Catálogo
js/configurador.js  Configurador del farol
js/pedido.js        Formulario de pedido
data/productos.json Catálogo
img/                Fotos de productos y logo
fonts/, vendor/     Fuentes y librerías (GSAP, Lenis, Three.js)
```

## Pendiente antes de publicar

En `tools/pages/aviso-legal.html`, `condiciones.html` y `privacidad.html` hay datos marcados en amarillo que exige la ley: titular, NIF, dirección y formas de pago. Búscalos por `class="todo"`, complétalos y vuelve a generar las páginas.
