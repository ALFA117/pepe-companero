# Notas de arreglos y diseño

Registro de qué se arregló y por qué (FIX_NOTES), de las decisiones de diseño (DESIGN_NOTES) y del checklist de 2 minutos para probar en el celular.

## FIX_NOTES

Arreglos del 24 de noviembre, después de probar con conversaciones reales:

- **Pepe se salía del guion en los pasos de ayuda.** Volvía a saludar ("¿Qué onda?") a media plática, cambiaba números del andamiaje ("la parto en 4" en vez de "en 3") y confundía el ejemplo de la pizza. Ahora los pasos se mandan **tal cual están escritos en el banco** (validados y con los números correctos). El modelo solo agrega, a veces, una frase corta que reacciona a lo que dijo el alumno (sin calificar, sin preguntas, sin números, sin saludo) y pasa por el filtro. Además gasta menos de la mitad de tokens.
- **El Juez tomaba "do" como fuera de tema.** Los mensajes sin sentido y los "¿por qué?" ahora cuentan como "no sé". En el nivel 0 ya no usa "paso correcto". Tampoco confunde el resultado del reto original con un error del ejemplo paralelo. `pnpm evaluar-juez`: 29/29.
- **Stickers e imágenes** ya no se califican como respuesta.
- **Las entradas animadas del inicio podían dejar el contenido invisible** si el navegador congelaba las animaciones, porque empezaban en opacidad 0. Ahora solo deslizan: el contenido siempre se ve.

- **Pepe planteaba el reto dos veces** si llegaban dos mensajes al mismo tiempo a una sesión pendiente (doble toque o dos pestañas). Ahora el que pierde la carrera se guarda pero no responde. Hay una prueba para esto.
- **Flujo del alumno al terminar un reto.** Pepe decía "cuando quieras me escribes" y el alumno no sabía qué hacer. Ahora aparece una tarjeta de **"¡Reto terminado!"** con **Siguiente reto** y **Salir**.

- **Cifras animadas que podían mostrar un dato falso.** Un contador que sube de 0 a 34 se quedaba congelado a medias (13 %) si el navegador frenaba la animación. Ahora el número siempre es el real y solo se anima su tamaño.

- **Conversación en la ficha del alumno con poco contraste.** Las burbujas del alumno tenían fondo turquesa oscuro con texto oscuro. Ahora usan el color de texto de su burbuja.
- **Pestañas de la tabla desbordadas a 320 px** y nombres de la tabla con menos de 44 px de alto para tocarlos. Ya corregido.
- **Generar hojas mostraba el esqueleto del panel** mientras tardaba unos 20 s. Ahora tiene su propia pantalla de carga ("Pepe está armando las hojas…") y un error con **Reintentar**.

- **No se distinguía qué botón avanzaba ni qué hacía cada uno.** Ahora hay una regla en toda la app: **turquesa sólido = avanzar** (siempre con texto: "Entrar", "Enviar", "Siguiente reto"), **con borde = alternativa** ("Salir", "Cancelar") y **fichas claras = respuestas para Pepe**, con la instrucción encima ("Toca una respuesta o escribe la tuya"). El micrófono dice "Voz", y arriba del teclado hay una pista de qué hacer en cada momento. "Entrar" ya no se ve apagado: si falta el código, explica qué escribir.

- **El inicio era lento en celular** (Lighthouse móvil: rendimiento 58; el navegador se trababa 1.9 s). Three.js tardaba 3.5 s en ejecutarse. Ahora la burbuja 3D solo carga en pantallas grandes con memoria suficiente, sin modo de ahorro de datos y después de que la página ya se ve, y las ondas en celular van a 30 cuadros por segundo.
- **Contraste:** las etiquetas amarillas pequeñas y los avatares con iniciales de color sobre color no llegaban a 4.5:1. Ahora usan el color de texto normal.
- **Chat sin señal:** el encabezado dice "sin conexión" y, si un mensaje no salió por falta de internet, se reenvía solo cuando vuelve la señal.

- **El jurado no podía probar el chat sin un código.** Ahora el inicio tiene **"Probar sin código"**: crea un alumno visitante (`PEPE-VIS-XXXXX`, sin letras confusas) en el grupo "Visitantes (prueba)", separado de los grupos reales, y abre el chat. `pnpm reiniciar-pruebas` también borra a los visitantes.

- **Pepe no parecía ajolote** (era una cabeza redonda con antenas). Lo redibujé a partir de fotos reales de ajolote: cabeza ancha y plana como pala, ojos pequeños y muy separados, boca ancha con la "sonrisa" natural, tres pares de branquias que suben como corona, y cuerpo con patitas de cuatro dedos. En una segunda vuelta las branquias pasaron de rayitas (parecían cepillos) y de hojas con puntas (se podían confundir con otra cosa) a **frondas esponjosas de bolitas redondas**, la forma típica de las ilustraciones de ajolote. El logo es solo la cabeza, con contorno fino y fondo turquesa limpio.

## DESIGN_NOTES

- **Concepto:** Pepe es un ajolote de Xochimilco, así que la marca sale de su hábitat. Agua de canal (turquesa) para la acción principal, rosa ajolote para Pepe y amarillo trajinera para los acentos. Estilo *claymorphism* suave (relieve, esquinas grandes) por ser una app educativa para secundaria, sin caer en lo infantil.
- **Pepe** es un SVG propio (`src/components/pepe-ajolote.tsx`), no un emoji: 🦎 es una lagartija. Mece las branquias, parpadea y pone cara de "pensando" mientras escribe.
- **Sistema de diseño (UI/UX Pro Max, `--design-system`):** está en `design-system/pepe/MASTER.md`, con la adaptación anotada arriba. Del buscador salen el estilo *Claymorphism* (bordes de 2 px y sombra doble con relieve), Fredoka para títulos y la regla de repetir la acción principal al final. No se usó su paleta índigo y naranja genérica: la de Xochimilco es más propia del proyecto.
- **Tipografía:** Fredoka para títulos, Nunito para el texto y Geist Mono para los códigos de alumno y las cuentas.
- **Fondo 3D:** en el dado salió la **receta 2, terreno de ondas**, que encaja perfecto con el tema. Lo adapté como la superficie del canal en malla de ondas (canvas en perspectiva que se inclina con el puntero), con una aurora lejana y burbujas y hojas de lirio flotando cerca. Cada capa tiene su propio parallax con el puntero y con el scroll. La versión completa va en el inicio y la tranquila en el chat y el panel. En móvil lleva menos elementos, `devicePixelRatio` máximo 2, se pausa con la pestaña oculta y queda quieto con *prefers-reduced-motion*.
- **Segunda vuelta del fondo:** el dado volvió a dar la receta 2, igual a la que ya teníamos, así que en vez de cambiarla le subí el nivel. Agregué rayos de sol que entran al agua y una **trajinera** de colores que se mece en el horizonte, con su propia profundidad de parallax.
- **Flujo:**
  - El inicio recuerda el último código ("Seguir donde me quedé").
  - El chat muestra en qué reto vas y su materia.
  - Al terminar un reto se ofrece el siguiente.
  - Hay esqueletos de carga con la forma real del chat y del panel, una pantalla de error con **Reintentar** y un 404 con Pepe.
- **Motion:**
  - `MotionConfig reducedMotion="user"` en toda la app.
  - El hero entra escalonado y solo con desplazamiento, sin opacity 0, así se ve aunque no cargue JavaScript.
  - Los pasos de "¿Cómo funciona?" aparecen con `whileInView`.
  - Las pestañas de materia del panel usan un indicador con `layoutId`.
  - El teclado y la tarjeta de fin de reto se intercambian con `AnimatePresence mode="wait"`.
- **Tercera vuelta:**
  - **Fondo:** el dado dio la receta 3 (globo de puntos). Choca con el tema del canal, así que tiré otra vez y salió la 6 (malla low-poly con Three.js). La adapté como una gran **burbuja de agua low-poly** detrás de Pepe, con burbujitas alrededor. Solo carga en el inicio, sin SSR (`next/dynamic`), para no pesar en el chat ni en celulares de gama baja; si no hay WebGL, queda el canal.
  - **Componentes nuevos:**
    - **"Pruébalo tú":** un mini reto interactivo de decimales. No está en el banco, para no adelantar respuestas reales.
    - **La escalera de ayuda:** pestañas del 0 al 4 con indicador `layoutId` y crossfade.
    - **"¿Por qué importa?":** las cifras de PISA con su fuente.
    - **Toast:** para errores como el permiso del micrófono.
    - **Panel:** cifras con "pop" y la lista de atención escalonada.
- **Cuarta vuelta (panel del maestro):** el dado dio la receta 4 (túnel de anillos). Como el fondo ya estaba completo, la usé para subirle el nivel: **anillos de agua** que se expanden en las pantallas de trabajo, como gotas que caen al canal.
  - **Panel:** encabezado con resumen de la semana y a quién atender primero, y la **escalera del grupo** (cuántos alumnos resolvieron en cada escalón de ayuda).
  - **Atención:** tarjetas compactas con iniciales y motivos con íconos; muestra 6 y tiene un botón "Ver los 12".
  - **Tabla:** búsqueda por nombre o código, con su estado vacío.
  - **Indicador de ayuda:** pasó de puntos a una **mini escalera** en todo el panel.
  - **Ficha del alumno:** encabezado con avatar, lectura en recuadros con íconos y conversación como chat.
  - **Hojas:** barras por brecha y vista previa de las tres hojas.
  - **Entrada del maestro:** dos columnas ("qué vas a ver") y PIN con mostrar u ocultar.
- **Logo e íconos:** la cabeza de ajolote sobre un círculo turquesa. Se generan desde el mismo componente de la app con `pnpm logo` (`scripts/generar-logo.tsx`) en `src/app/icon.svg` (pestaña) y `docs/logo/`. Los PNG son: `apple-icon.png` (180), `public/icon-192.png`, `public/icon-512.png` e `opengraph-image.png` / `twitter-image.png` (1200×630, la vista previa al compartir en WhatsApp y X). Usé FLUX.2 Klein (local, con mflux) solo como referencia de estilo de ícono (contorno marcado, ojos brillantes, círculo de fondo). Su anatomía estaba mal (orejas de gato), así que el logo final es vectorial y está dibujado a mano.
- **Modo oscuro:** sigue al sistema (`prefers-color-scheme`), con sus propios tokens y sin una inversión automática.
- **Detalles propios del proyecto:** la tarea de Pepe con "1/2 + 1/3 = 2/5" encerrado en rojo en el inicio, el aviso "Pepe nunca te va a dar la respuesta" al empezar el chat y la onda de la nota de voz.
- **Animación (Motion):** las burbujas entran con spring, el estado ("escribiendo…") cambia con crossfade, las respuestas rápidas tienen press con spring y el botón de micrófono/enviar se intercambia con animación.

### Checklist de 2 minutos en el celular

1. Abre el inicio: Pepe se mueve, el agua ondula y no hay scroll horizontal.
2. Escribe un código mal (`hola`): sale el error debajo del campo, en rojo.
3. Entra con `PEPE-1B-01`: Pepe saluda y aparece "escribiendo…" con sus puntos rosas.
4. Contesta `sí, está bien`: salen los botones A / B. Toca uno y revisa que responda.
5. Mantén el micrófono: graba unos segundos, envía y revisa que Pepe conteste.
6. Activa el modo oscuro del celular y recarga: todo se lee bien.
7. Entra a `/docente` con el PIN: indicadores con íconos, gráfica y tabla. Cambia entre Todos / Matemáticas / Lectura: el indicador se desliza.
8. Termina un reto: aparece "¡Reto terminado!". Toca **Siguiente reto** y revisa que arriba cambie el nombre del reto.
9. Regresa al inicio: aparece "Seguir donde me quedé" con tu código.
10. En "Pruébalo tú", toca una respuesta equivocada (Pepe da una pista) y luego la correcta.
11. En "La escalera de ayuda", toca los niveles 0 a 4: el indicador se desliza y cambia el ejemplo.
12. En el panel, busca "cruz" en la tabla y toca "Ver los 12" en "Necesitan atención hoy".
