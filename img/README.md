# Cómo añadir fotos y productos (sin tocar el HTML)

Todo el catálogo sale de **`data/productos.json`**. El HTML ya no lleva productos escritos a mano.

## Añadir una foto a un producto que ya existe

1. Sube la foto a `img/productos/`. Nombres sin espacios ni tildes: `litofania-1.webp`.
2. Abre `data/productos.json`, busca el producto y mete la ruta en `"imgs"`:

```json
"imgs": ["img/productos/litofania-1.webp", "img/productos/litofania-2.webp"]
```

3. `git add . && git commit -m "Fotos de la litofanía" && git push`. Netlify lo despliega solo.

Si `"imgs"` está vacío (`[]`), la web dibuja sola un icono de relleno. **No se rompe nada por dejarlo vacío**, así que puedes publicar el producto antes de tener la foto.

Con dos o más fotos aparecen automáticamente las flechas y los puntos del carrusel.

## Añadir un producto nuevo

Copia un bloque entero de `"productos"` y cámbialo. Campos:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Identificador único, en minúsculas y con guiones |
| `nombre` | sí | El que se ve en la tarjeta |
| `categoria` | sí | Uno de los `id` de `"categorias"` (arriba del archivo) |
| `catLabel` | no | La línea pequeña sobre el nombre |
| `precio` | sí | Número, con punto decimal: `20.00`. Pon `null` si es "a presupuesto" |
| `precioTexto` | no | Texto que sustituye al precio: `"desde 20,00€"` |
| `unidad` | no | `"/ unidad"`, `"/ lote"`… |
| `desc` | sí | Dos o tres frases. Di qué problema resuelve, no de qué material es |
| `badge` | no | Etiqueta de la esquina: `"Nuevo"`, `"Halloween"`… |
| `badgeColor` | no | `"purple"` para la variante morada |
| `wide` | no | `true` para que la tarjeta ocupe doble ancho |
| `destacado` | no | `true` para que salga también en la portada |
| `icono` | no | Dibujo de relleno mientras no hay foto (ver lista abajo) |
| `imgs` | sí | Array de rutas. Vacío `[]` si aún no hay fotos |

**Iconos disponibles:** `litofania` y `generico`.

## Categorías

Se editan en `"categorias"`, al principio del JSON. Los botones de filtro del catálogo se generan solos a partir de esa lista: no hay que tocar `catalogo.html`.

## Consejos para las fotos

- **Horizontal**, la pieza colocada donde se usa (el fantasma en la ventana, el esqueleto en la maceta). Vale mil veces más que la pieza sobre la mesa.
- Las tarjetas son **4:3** (1200 × 900 va perfecto). Si la foto es vertical, se recorta por arriba y por abajo: deja la pieza en el centro.
- Fondo liso y luz de ventana. Nada de flash.
- Redúcelas antes de subir: **máximo 1600 px de ancho y menos de 300 KB**. Si no, la web va lenta en el móvil. Con `squoosh.app` se hace en un minuto.
- Una foto por producto ya sirve. Dos o tres, mejor.

## Antes de dar por bueno un cambio

Un JSON con una coma de más no carga y el catálogo sale vacío. Pega el archivo en `jsonlint.com` antes de hacer push, o mira la consola del navegador (F12) si el catálogo no aparece.
