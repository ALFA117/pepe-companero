# Genera los 8 retos nuevos (Fase 7). Se corre una vez: python3 scripts/contenido/retos_nuevos.py
import json, os
D = 'src/retos/banco'

def paso(objetivo, ejemplo, botones=None):
    p = {"objetivo": objetivo, "ejemplo": ejemplo}
    if botones: p["botones"] = botones
    return p

retos = []

# ───────────── Matemáticas ─────────────
retos.append({
  "id": "mate-fracciones-equivalentes-01", "materia": "matematicas", "grado": "6_primaria",
  "concepto": "fracciones_equivalentes", "dificultad": 1, "prerequisito": None,
  "planteamiento_pepe": [
    "¡Qué onda! Me pidieron una fracción equivalente a 2/3.",
    "Le sumé 1 arriba y 1 abajo y me salió 3/4 😎 ¿Verdad que 2/3 y 3/4 son iguales?"],
  "error_plantado": "Cree que sumar el mismo número al numerador y al denominador da una fracción equivalente.",
  "solucion_para_juez": "2/3 y 3/4 no son equivalentes (2/3 ≈ 0.67, 3/4 = 0.75). Sumar lo mismo arriba y abajo cambia el valor. Una fracción equivalente se obtiene multiplicando (o dividiendo) numerador y denominador por el mismo número: 2/3 = 4/6 = 6/9.",
  "prohibido_para_pepe": ["4/6", "6/9", "multiplicar arriba y abajo", "multiplicas arriba y abajo", "por el mismo número", "multiplicando el numerador y el denominador"],
  "rubrica": {
    "correcta": "Dice que no son iguales Y explica que hay que multiplicar (o dividir) arriba y abajo por el mismo número, o da una equivalente correcta como 4/6.",
    "parcial": "Dice que no son iguales (p. ej. 3/4 es más grande) pero no sabe cómo hacer una equivalente.",
    "incorrecta": "Acepta que 3/4 es igual a 2/3 o propone otra fracción no equivalente.",
    "evidencia_minima_cierre": "Explica que sumar lo mismo cambia el tamaño y que para conservarlo se multiplica arriba y abajo por lo mismo."},
  "niveles": {
    "1": {"objetivo": "Acotar: que juzgue la única operación que hizo Pepe.", "pasos": [
      paso("Mostrar la operación y preguntar si deja la fracción igual.", ["Va, sin presión 😅 Yo solo hice una cosa: sumé 1 arriba y 1 abajo.", "¿Eso deja la fracción del mismo tamaño?"], ["Sí", "No", "No sé"]),
      paso("Volver al reto: ¿son iguales 2/3 y 3/4 y por qué?", ["Mmm… ¿entonces 2/3 y 3/4 son iguales o no? ¿Por qué?"])]},
    "2": {"objetivo": "Sentido común con chocolate: comparar lo que sobra.", "pasos": [
      paso("Comparar sobrantes de 2/3 y 3/4 de chocolate.", ["Déjame checar con chocolate 🍫", "Parto un chocolate en 3 y me como 2. Otro igualito lo parto en 4 y me como 3. ¿En cuál me sobró MENOS?"], ["En el de 3", "En el de 4", "Igual"]),
      paso("Volver al reto: si sobró distinto, ¿son iguales?", ["😳 Si me sobró distinto, entonces no comí lo mismo…", "¿2/3 y 3/4 son iguales? ¿Qué hice mal?"])]},
    "3": {"objetivo": "Aprender juntos con 1/2 y 2/4 (ejemplo paralelo).", "pasos": [
      paso("Partir cada mitad en 2: ¿cuántos pedazos y cuántos me como?", ["Creo que los dos estamos medio perdidos, investiguemos 🕵️", "Tengo media pizza. Si parto cada mitad en 2, ¿en cuántos pedazos queda la pizza y cuántos me toca comer?"]),
      paso("Que note qué les pasó a los números: ¿sumar o multiplicar?", ["¡Ajá! 1/2 se volvió 2/4 y es la misma cantidad de pizza.", "¿Qué les pasó al de arriba y al de abajo: les sumé algo o los multipliqué?"]),
      paso("Volver al reto: ¿cómo hacer una fracción igual a 2/3?", ["🔥 ¡Eso! Ahí está mi error.", "Entonces, ¿mi 3/4 es igual a 2/3? ¿Cómo hago una que sí sea igual?"])]},
    "4": {"objetivo": "Bajar un escalón: duplicar una receta.", "pasos": [
      paso("Duplicar una receta 2 a 3.", ["Va, reto rapidito antes 💪", "Unos hotcakes llevan 2 tazas de harina por cada 3 de leche. Si quiero el doble, ¿cuánta harina y cuánta leche?"]),
      paso("Contrastar con sumar 1 a cada uno.", ["¡Sí! Y si mejor le sumo 1 a cada uno (3 de harina y 4 de leche), ¿quedan igual de espesos?"], ["Sí", "No"]),
      paso("Volver al reto original.", ["¡Exacto! Para que quede igual hay que hacerle lo mismo a los dos, pero sin sumar.", "Ahora sí: ¿2/3 es igual a 3/4? ¿Qué fracción sí es igual a 2/3?"])]}}})

retos.append({
  "id": "mate-ecuaciones-primer-grado-01", "materia": "matematicas", "grado": "1_secundaria",
  "concepto": "ecuaciones_primer_grado", "dificultad": 2, "prerequisito": "jerarquia_operaciones",
  "planteamiento_pepe": [
    "¡Qué onda! Tengo que resolver 3x + 5 = 20.",
    "Pasé el 5 al otro lado sumando: 3x = 25, y luego x = 25/3 😎 ¿Está bien?"],
  "error_plantado": "Al pasar el 5 al otro lado conserva la suma en vez de usar la operación inversa (restar).",
  "solucion_para_juez": "Para despejar se resta 5 en ambos lados: 3x = 15, y se divide entre 3: x = 5. Comprobación: 3·5 + 5 = 20. Con x = 25/3, 3x + 5 = 30, no 20.",
  "prohibido_para_pepe": ["x = 5", "x=5", "3x = 15", "3x=15", "restar 5", "restarle 5", "resta 5", "restando 5", "x vale 5"],
  "rubrica": {
    "correcta": "Dice que el 5 pasa restando (operación inversa) Y llega a x = 5, o comprueba y corrige.",
    "parcial": "Detecta que está mal (p. ej. al comprobar no da 20) pero no sabe corregirlo.",
    "incorrecta": "Acepta x = 25/3 o da otro valor erróneo.",
    "evidencia_minima_cierre": "Explica que para quitar el 5 hay que hacer la operación contraria en los dos lados (o comprobar sustituyendo)."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿en qué paso está el error?", "pasos": [
      paso("Mostrar los dos pasos y pedir el que está mal.", ["Va, sin presión 😅 Hice dos pasos:", "A) Pasé el 5 sumando: 3x = 25\nB) Dividí entre 3: x = 25/3\n¿Cuál te late que está chueco?"], ["A", "B", "Los dos bien"]),
      paso("Volver al reto: ¿qué debí hacer con el 5?", ["¡Uy, puede ser! ¿Y qué debí hacer con el 5? ¿Cuánto vale x?"])]},
    "2": {"objetivo": "Sentido común: comprobar sustituyendo.", "pasos": [
      paso("Sustituir 25/3 y ver si da 20.", ["Déjame comprobar 🧐", "Si x es 25/3, entonces 3 por x da 25. Y 25 + 5… ¿da 20?"], ["Sí", "No"]),
      paso("Confrontar y volver a preguntar.", ["😳 Da 30, no 20. Algo hice mal.", "¿Qué estuvo mal y cuánto vale x de verdad?"])]},
    "3": {"objetivo": "Aprender juntos con una balanza (ejemplo paralelo).", "pasos": [
      paso("Balanza x + 4 = 10: qué hacer del otro lado.", ["Creo que los dos estamos medio perdidos, investiguemos 🕵️", "Imagina una balanza: de un lado x + 4 y del otro 10. Si quito las 4 pesas de un lado, ¿qué hago del otro para que no se ladee?"]),
      paso("Que encuentre x en la balanza.", ["¡Ajá! Lo que le haces a un lado se lo haces al otro.", "Entonces, en x + 4 = 10, ¿cuánto vale x?"]),
      paso("Volver al reto con la balanza.", ["🔥 ¡Eso! Ahora usa la balanza en la mía: 3x + 5 = 20.", "¿Qué haces con el 5 y cuánto vale x?"])]},
    "4": {"objetivo": "Bajar un escalón: operaciones inversas con adivinanzas.", "pasos": [
      paso("Adivinanza con suma.", ["Va, reto rapidito antes 💪", "Pensé un número, le sumé 5 y me dio 12. ¿Qué número pensé?"]),
      paso("Nombrar la operación inversa.", ["¡Sí! ¿Qué hiciste para regresar al número: sumar o lo contrario?"]),
      paso("Adivinanza con multiplicación.", ["Ahora: pensé otro número, lo multipliqué por 3 y me dio 12. ¿Cuál era?"]),
      paso("Volver al reto original.", ["¡Exacto! Para regresar se hace lo contrario.", "Ahora sí, mi tarea: 3x + 5 = 20. ¿Cuánto vale x?"])]}}})

retos.append({
  "id": "mate-porcentajes-01", "materia": "matematicas", "grado": "1_secundaria",
  "concepto": "porcentajes", "dificultad": 1, "prerequisito": "fracciones_equivalentes",
  "planteamiento_pepe": [
    "¡Qué onda! Unos tenis cuestan $800 y tienen 25% de descuento 👟",
    "Le quité 25 pesos, así que voy a pagar $775 😎 ¿Me alcanza con $780?"],
  "error_plantado": "Confunde el porcentaje con una cantidad fija de pesos.",
  "solucion_para_juez": "25% significa 25 de cada 100, o sea la cuarta parte del precio: 800 ÷ 4 = 200 de descuento. Se pagan 800 − 200 = 600 pesos. Restar 25 pesos solo sería correcto si el precio fuera 100.",
  "prohibido_para_pepe": ["600", "$200", "200 pesos", "la cuarta parte", "un cuarto del precio", "25 de cada 100"],
  "rubrica": {
    "correcta": "Dice que 25% no son 25 pesos Y calcula el descuento (200) o el precio final (600), o explica que es la cuarta parte.",
    "parcial": "Detecta que el descuento debe ser mayor que 25 pesos pero no lo calcula.",
    "incorrecta": "Acepta $775 o da otro resultado erróneo.",
    "evidencia_minima_cierre": "Explica que el porcentaje es una parte del precio (de cada 100) y no una cantidad fija de pesos."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿25% son 25 pesos?", "pasos": [
      paso("Preguntar si 25% equivale a 25 pesos.", ["Va, sin presión 😅 Yo pensé que 25% de descuento es lo mismo que quitar 25 pesos.", "¿Eso está bien?"], ["Sí", "No", "No sé"]),
      paso("Volver al reto: ¿cuánto pago entonces?", ["Mmm… ¿entonces qué significa 25%? ¿Cuánto pago por los tenis?"])]},
    "2": {"objetivo": "Sentido común con un precio de $100.", "pasos": [
      paso("Descuento de 25% en $100.", ["Déjame checar con algo más fácil 🧐", "Si los tenis costaran $100 con 25% de descuento, ¿cuántos pesos me descuentan?"]),
      paso("Comparar con $800: ¿más o menos descuento?", ["Eso pensé. Pero los míos cuestan $800, que es 8 veces más.", "¿El descuento debería ser más o menos que 25 pesos?"], ["Más", "Menos"]),
      paso("Volver al reto.", ["😳 Entonces quitar solo 25 pesos no cuadra.", "¿Cuánto me descuentan de verdad y cuánto pago?"])]},
    "3": {"objetivo": "Aprender juntos con 50% (ejemplo paralelo).", "pasos": [
      paso("50% de una mochila de $300.", ["Creo que los dos estamos medio perdidos, investiguemos 🕵️", "Una mochila de $300 tiene 50% de descuento. ¿Cuánto me descuentan?"]),
      paso("Qué parte del precio es el 50%.", ["¡Ajá! ¿Y qué parte del precio es el 50%?"]),
      paso("Volver al reto: qué parte es el 25%.", ["🔥 ¡Eso! Entonces el 25% también es una parte del precio, no una cantidad fija.", "¿Qué parte es el 25%? Con eso, ¿cuánto pago por mis tenis?"])]},
    "4": {"objetivo": "Bajar un escalón: fracciones de 100.", "pasos": [
      paso("Cuánto es 1/4 de 100.", ["Va, reto rapidito antes 💪", "Si reparto $100 entre 4 amigos en partes iguales, ¿cuánto le toca a cada uno?"]),
      paso("Escalar a 800 (8 veces 100).", ["¡Sí! Y si reparto $800 entre 4, ¿cuánto le toca a cada uno? Piénsalo como 8 billetes de $100."]),
      paso("Volver al reto original.", ["¡Exacto! 25% es lo mismo que repartir entre 4.", "Ahora sí: ¿cuánto me descuentan y cuánto pago por los tenis?"])]}}})

retos.append({
  "id": "mate-jerarquia-operaciones-01", "materia": "matematicas", "grado": "6_primaria",
  "concepto": "jerarquia_operaciones", "dificultad": 1, "prerequisito": None,
  "planteamiento_pepe": [
    "¡Qué onda! Me tocó esta: 3 + 4 × 2",
    "Lo hice en orden: 3 + 4 = 7 y 7 × 2 = 14 😎 ¿Me sacaré 10?"],
  "error_plantado": "Resuelve de izquierda a derecha sin respetar que la multiplicación va antes que la suma.",
  "solucion_para_juez": "Por jerarquía de operaciones, primero se multiplica: 4 × 2 = 8, luego se suma: 3 + 8 = 11. Resolver de izquierda a derecha (14) es incorrecto.",
  "prohibido_para_pepe": ["11", "primero se multiplica", "primero multiplica", "primero multiplicas", "la multiplicación va primero", "la multiplicación va antes"],
  "rubrica": {
    "correcta": "Dice que primero se multiplica Y da 11, o explica la jerarquía de operaciones.",
    "parcial": "Detecta que 14 está mal o que el orden importa, pero no sabe cuál va primero o no llega a 11.",
    "incorrecta": "Acepta 14 o da otro resultado erróneo.",
    "evidencia_minima_cierre": "Explica con sus palabras que la multiplicación se hace antes que la suma (y por qué, p. ej. son grupos)."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿qué paso está mal?", "pasos": [
      paso("Mostrar los dos pasos y pedir el chueco.", ["Va, sin presión 😅 Hice dos pasos:", "A) 3 + 4 = 7\nB) 7 × 2 = 14\n¿Cuál te late que está chueco?"], ["A", "B", "Ninguno"]),
      paso("Volver al reto: ¿por dónde se empieza?", ["¡Uy, puede ser! ¿Y por dónde debí empezar? ¿Cuánto da?"])]},
    "2": {"objetivo": "Sentido común con chicles.", "pasos": [
      paso("Contar chicles: 3 sueltos y 4 paquetes de 2.", ["Déjame checar con chicles 🍬", "Tengo 3 chicles sueltos y 4 paquetes de 2 chicles cada uno. ¿Cuántos chicles traen los paquetes?"]),
      paso("Total de chicles: ¿da 14?", ["Eso pensé. Ahora súmale los 3 sueltos: ¿me da 14 chicles?"], ["Sí", "No"]),
      paso("Confrontar y volver al reto.", ["😳 No me da 14… pero 3 + 4 × 2 es justo eso.", "¿Qué hice mal en mi cuenta y cuánto da?"])]},
    "3": {"objetivo": "Aprender juntos con la calculadora científica (ejemplo paralelo).", "pasos": [
      paso("2 + 5 × 3 da 17 en la calculadora.", ["Creo que los dos estamos medio perdidos, investiguemos 🕵️", "Puse 2 + 5 × 3 en una calculadora científica y me dio 17, no 21.", "¿Qué operación hizo primero la calculadora?"]),
      paso("Por qué esa operación va antes.", ["¡Ajá! ¿Y por qué crees que esa va antes? Piensa en los paquetes de chicles."]),
      paso("Volver al reto.", ["🔥 ¡Eso! Con esa regla, regresemos a la mía.", "¿Cuánto da 3 + 4 × 2?"])]},
    "4": {"objetivo": "Bajar un escalón: la multiplicación como suma repetida.", "pasos": [
      paso("4 × 2 como suma repetida.", ["Va, reto rapidito antes 💪", "¿4 × 2 es lo mismo que 2 + 2 + 2 + 2?"], ["Sí", "No"]),
      paso("Reescribir la operación.", ["¡Sí! Entonces 3 + 4 × 2 es lo mismo que 3 + 2 + 2 + 2 + 2. ¿Cuánto da eso?"]),
      paso("Volver al reto original.", ["¡Exacto! Los 4 grupos de 2 van juntos.", "Ahora sí: ¿mi 14 estaba bien? ¿Cuánto da 3 + 4 × 2?"])]}}})

# ───────────── Lectura ─────────────
retos.append({
  "id": "lectura-localizar-informacion-01", "materia": "lectura", "grado": "6_primaria",
  "concepto": "localizar_informacion_literal", "dificultad": 1, "prerequisito": None,
  "requiere_lectura_voz": True,
  "texto": {"titulo": "El viaje de la mariposa monarca", "parrafos": [
    "Cada otoño, millones de mariposas monarca viajan desde Canadá y Estados Unidos hasta los bosques de Michoacán y del Estado de México. Recorren más de cuatro mil kilómetros y llegan a finales de octubre, muy cerca del Día de Muertos.",
    "En los bosques de oyamel se juntan en racimos sobre los árboles para protegerse del frío. Ahí pasan el invierno descansando. En marzo, cuando sube la temperatura, emprenden el regreso hacia el norte para tener a sus crías."]},
  "planteamiento_pepe": [
    "¡Gracias, ya lo entendí mejor! 🦋",
    "Las monarcas llegan a México en marzo, cuando ya hace calorcito. ¿Verdad que sí?"],
  "error_plantado": "Confunde el dato de la llegada con el de la partida (marzo es cuando se van).",
  "solucion_para_juez": "El párrafo 1 dice que llegan a finales de octubre, cerca del Día de Muertos. En marzo emprenden el regreso hacia el norte (se van), según el párrafo 2.",
  "prohibido_para_pepe": ["llegan a finales de octubre", "llegan en octubre", "en marzo se van", "en marzo regresan", "en marzo se regresan"],
  "rubrica": {
    "correcta": "Dice que no llegan en marzo Y que llegan a finales de octubre (o cerca de Día de Muertos), idealmente con la frase del texto.",
    "parcial": "Dice que marzo es cuando se van, pero no encuentra cuándo llegan (o al revés).",
    "incorrecta": "Acepta que llegan en marzo o da otra fecha.",
    "evidencia_minima_cierre": "Da el dato correcto de la llegada y dice en qué parte del texto lo encontró."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿en qué párrafo dice cuándo llegan?", "pasos": [
      paso("Pedir el párrafo con botones.", ["Mmm, ahora que lo pienso, no sé si lo leí o me lo imaginé 😅", "¿En qué párrafo dice cuándo llegan?"], ["Párrafo 1", "Párrafo 2", "No lo dice"]),
      paso("Volver al reto: ¿qué dice ese párrafo?", ["¿Y qué dice ahí? ¿Cuándo llegan?"])]},
    "2": {"objetivo": "Confrontar con la frase exacta.", "pasos": [
      paso("Citar la frase de marzo y preguntar si habla de llegar o irse.", ["Busqué y encontré esta frase:", "«En marzo, cuando sube la temperatura, emprenden el regreso hacia el norte.»", "¿Aquí dice que llegan o que se van?"], ["Llegan", "Se van"]),
      paso("Volver al reto.", ["😳 Uy, entonces confundí los datos.", "¿Cuándo llegan de verdad?"])]},
    "3": {"objetivo": "Aprender juntos: buscar la palabra clave de la pregunta.", "pasos": [
      paso("Modelar con un texto corto.", ["¡Vas bien! Te enseño un truco que uso 🕵️", "Busco en el texto la palabra de la pregunta. Mira: «Los niños llegan a la escuela a las 7 y salen a la 1.»", "¿A qué hora llegan?"]),
      paso("Volver al reto con el truco.", ["🔥 ¡Eso! Ahora busca «llegan» en el texto de las monarcas. ¿Cuándo llegan?"])]},
    "4": {"objetivo": "Bajar un escalón: pistas y vocabulario.", "pasos": [
      paso("Qué significa «emprenden el regreso».", ["¡Buenísima pregunta! A ver si el mismo texto nos da una pista 🔍", "Cuando dice «emprenden el regreso hacia el norte», ¿están llegando o se están yendo?"]),
      paso("Fiesta mexicana cercana a la llegada.", ["¡Sí! Y en el párrafo 1, ¿qué fiesta mexicana dice que está cerca de cuando llegan?"]),
      paso("Volver al reto.", ["¡Exacto! 🤯", "Entonces, ¿en qué mes llegan las monarcas a México?"])]}}})

retos.append({
  "id": "lectura-idea-principal-01", "materia": "lectura", "grado": "1_secundaria",
  "concepto": "idea_principal", "dificultad": 1, "prerequisito": "localizar_informacion_literal",
  "requiere_lectura_voz": True,
  "texto": {"titulo": "El maíz de colores", "parrafos": [
    "En México el maíz se cultiva desde hace miles de años. Con él se preparan tortillas, tamales, pozole y atole, y está presente en casi todas las comidas del día, desde el desayuno hasta la cena.",
    "Además, existen decenas de variedades de maíz: blanco, amarillo, azul y hasta rojo. Muchas familias campesinas guardan cada año sus mejores semillas para volver a sembrarlas. Así cuidan esa diversidad y la heredan a sus hijos y nietos."]},
  "planteamiento_pepe": [
    "¡Gracias, ya lo entendí mejor! 🌽",
    "Según yo, la idea principal es que existe el maíz azul y el maíz rojo. ¿Le atiné?"],
  "error_plantado": "Toma un detalle (los colores del maíz) como si fuera la idea principal.",
  "solucion_para_juez": "La idea principal es que el maíz es muy importante en México: se come en casi todas las comidas (párrafo 1) y hay muchas variedades que las familias cuidan y heredan (párrafo 2). Los colores son un detalle del párrafo 2.",
  "prohibido_para_pepe": ["el maíz es muy importante", "la idea principal es que el maíz", "es solo un detalle", "es un detalle"],
  "rubrica": {
    "correcta": "Dice que los colores son solo un detalle Y da una idea principal que abarca todo el texto (importancia del maíz en la comida y su diversidad).",
    "parcial": "Corrige a Pepe pero propone otra idea que solo cubre un párrafo.",
    "incorrecta": "Acepta la idea de Pepe o propone otro detalle.",
    "evidencia_minima_cierre": "Distingue idea principal de detalle y da una idea que cubre los dos párrafos."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿de qué habla todo el texto?", "pasos": [
      paso("Preguntar el tema de todo el texto con botones.", ["Mmm, ahora que lo pienso, no sé si me fijé en todo 😅", "¿De qué habla TODO el texto, no solo una parte?"], ["Del maíz", "De colores", "De familias"]),
      paso("Volver al reto: ¿cuál es la idea principal?", ["¿Y qué dice del maíz en general? ¿Cuál sería la idea principal?"])]},
    "2": {"objetivo": "Confrontar: los colores solo aparecen en una frase.", "pasos": [
      paso("Preguntar si el párrafo 1 habla de colores.", ["Revisé y lo de los colores está en una sola frase del párrafo 2.", "Pregunta fácil: ¿el párrafo 1 habla de colores?"], ["Sí", "No"]),
      paso("Volver al reto.", ["😳 Entonces mi idea deja fuera medio texto.", "¿Cuál sería una mejor idea principal?"])]},
    "3": {"objetivo": "Aprender juntos: la idea principal contesta «¿de qué trata todo?».", "pasos": [
      paso("Modelar con un texto de perros.", ["¡Vas bien! Te enseño un truco que uso 🕵️", "«Los perros ayudan a las personas. Algunos guían a personas ciegas y otros rescatan gente en los sismos.»", "¿Cuál es la idea de todo: que rescatan gente o que ayudan a las personas?"]),
      paso("Volver al reto con el truco.", ["🔥 ¡Eso! Ahora usa el truco con el texto del maíz. ¿Cuál es la idea principal?"])]},
    "4": {"objetivo": "Bajar un escalón: un título por párrafo.", "pasos": [
      paso("Título del párrafo 1.", ["¡Buenísima pregunta! Vamos por partes 🔍", "Ponle un título cortito (de 3 a 5 palabras) al párrafo 1."]),
      paso("Título del párrafo 2.", ["¡Me late! Ahora ponle uno al párrafo 2."]),
      paso("Volver al reto juntando los títulos.", ["🤯 Ya casi.", "Junta tus dos títulos en una oración: ¿cuál es la idea principal de todo el texto?"])]}}})

retos.append({
  "id": "lectura-vocabulario-contexto-01", "materia": "lectura", "grado": "1_secundaria",
  "concepto": "vocabulario_en_contexto", "dificultad": 2, "prerequisito": "localizar_informacion_literal",
  "requiere_lectura_voz": True,
  "texto": {"titulo": "Los cenotes de Yucatán", "parrafos": [
    "En la península de Yucatán hay miles de cenotes: pozos naturales de agua dulce que se forman cuando el suelo de piedra caliza se hunde. Para los antiguos mayas eran lugares sagrados.",
    "Hoy muchos cenotes están en peligro. La basura y los químicos que se tiran en la superficie se filtran por la roca porosa y ensucian el agua que bebe la población. Por eso algunas comunidades organizan limpiezas y piden a los turistas que no usen bloqueador al nadar."]},
  "planteamiento_pepe": [
    "¡Gracias, ya lo entendí mejor! 🏊",
    "Nada más no entendí una palabra, pero ya la adiviné: «porosa» quiere decir que la roca es súper dura y no deja pasar nada. ¿Verdad?"],
  "error_plantado": "Adivina el significado de una palabra sin usar las pistas del contexto (dice lo contrario).",
  "solucion_para_juez": "Porosa significa que tiene poros o agujeritos por donde pasan los líquidos. La pista está en la misma oración: los químicos «se filtran por la roca porosa» y llegan al agua; si no dejara pasar nada, no ensuciarían el cenote.",
  "prohibido_para_pepe": ["tiene agujeritos", "tiene poros", "con poros", "con agujeritos", "deja pasar el agua", "deja pasar los líquidos", "agujeros por donde"],
  "rubrica": {
    "correcta": "Dice que porosa no significa que no deja pasar nada Y explica que tiene huecos/poros por donde pasan los líquidos, usando la pista del texto (se filtran).",
    "parcial": "Dice que Pepe está mal o da un significado aproximado, pero no usa la pista del texto o no lo explica.",
    "incorrecta": "Acepta que porosa es dura e impermeable o da otro significado erróneo.",
    "evidencia_minima_cierre": "Da el significado de porosa y dice qué parte de la oración le dio la pista."},
  "niveles": {
    "1": {"objetivo": "Acotar: ubicar la palabra.", "pasos": [
      paso("Pedir el párrafo donde aparece.", ["Mmm, ahora que lo pienso, la adiviné sin buscarla 😅", "¿En qué párrafo aparece «porosa»?"], ["Párrafo 1", "Párrafo 2"]),
      paso("Volver al reto usando la oración.", ["¿Y qué les pasa a la basura y a los químicos en esa oración? Con eso, ¿qué crees que significa porosa?"])]},
    "2": {"objetivo": "Confrontar con la oración exacta.", "pasos": [
      paso("Citar «se filtran por la roca porosa» y preguntar.", ["Encontré esta frase:", "«La basura y los químicos que se tiran en la superficie se filtran por la roca porosa y ensucian el agua.»", "Si la roca no dejara pasar nada, ¿los químicos llegarían al agua?"], ["Sí", "No"]),
      paso("Volver al reto.", ["😳 Uy, entonces lo que adiviné no cuadra.", "¿Qué significa porosa?"])]},
    "3": {"objetivo": "Aprender juntos: buscar pistas alrededor de la palabra.", "pasos": [
      paso("Modelar con «absorbente».", ["¡Vas bien! Te enseño un truco que uso 🕵️", "Busco pistas alrededor de la palabra. Mira: «La esponja es absorbente: se traga el agua derramada en segundos.»", "¿Qué significa absorbente?"]),
      paso("Volver al reto con el truco.", ["🔥 ¡Eso! Ahora busca las pistas alrededor de «porosa». ¿Qué significa?"])]},
    "4": {"objetivo": "Bajar un escalón: la esponja.", "pasos": [
      paso("Qué hace una esponja en el agua.", ["¡Buenísima pregunta! Pensemos en algo de la casa 🔍", "¿Qué le pasa a una esponja cuando la metes al agua?"]),
      paso("Por qué la esponja se llena.", ["¡Sí! ¿Y cómo es la superficie de una esponja para que le pueda entrar el agua?"]),
      paso("Volver al reto.", ["🤯 Ahí está la pista.", "Si la roca de los cenotes se parece a una esponja, ¿qué significa porosa?"])]}}})

retos.append({
  "id": "lectura-secuencia-hechos-01", "materia": "lectura", "grado": "6_primaria",
  "concepto": "secuencia_de_hechos", "dificultad": 1, "prerequisito": "localizar_informacion_literal",
  "requiere_lectura_voz": True,
  "texto": {"titulo": "Tamales para la posada", "parrafos": [
    "Para preparar tamales, primero se remojan las hojas de maíz en agua tibia para que se ablanden. Mientras tanto, se bate la masa con manteca y caldo hasta que quede esponjosa. Una prueba es poner una bolita de masa en un vaso con agua: si flota, ya está lista.",
    "Después se unta la masa sobre cada hoja, se agrega el relleno y se dobla. Al final, los tamales se acomodan parados en la vaporera y se cuecen durante una hora y media."]},
  "planteamiento_pepe": [
    "¡Gracias, ya lo entendí mejor! 🫔",
    "Según yo, el orden es: rellenar las hojas, luego batir la masa y al final cocerlos. ¿Así va?"],
  "error_plantado": "Altera la secuencia: pone el relleno antes de preparar la masa y se salta el remojo de las hojas.",
  "solucion_para_juez": "Orden del texto: 1) remojar las hojas, 2) mientras tanto batir la masa (prueba del vaso), 3) después untar la masa, rellenar y doblar, 4) al final cocer en la vaporera. No se puede rellenar antes de tener la masa; además Pepe omite remojar las hojas.",
  "prohibido_para_pepe": ["primero se remojan", "primero remojar", "primero hay que remojar", "la masa va antes", "batir antes de rellenar", "el orden correcto es"],
  "rubrica": {
    "correcta": "Dice que el orden de Pepe está mal Y da la secuencia correcta (remojar, batir, untar/rellenar, cocer) o al menos explica que la masa se bate antes de rellenar y menciona el remojo.",
    "parcial": "Detecta un problema en el orden pero no da la secuencia completa (p. ej. olvida el remojo).",
    "incorrecta": "Acepta el orden de Pepe o propone otro orden equivocado.",
    "evidencia_minima_cierre": "Da la secuencia correcta y menciona las palabras del texto que indican el orden (primero, mientras, después, al final)."},
  "niveles": {
    "1": {"objetivo": "Acotar: ¿qué se hace primero?", "pasos": [
      paso("Pedir el primer paso con botones.", ["Mmm, ahora que lo pienso, lo leí bien rápido 😅", "Según el texto, ¿qué se hace PRIMERO?"], ["Rellenar", "Remojar hojas", "Batir la masa"]),
      paso("Volver al reto: el orden completo.", ["¿Y entonces mi orden está bien? ¿Cómo va?"])]},
    "2": {"objetivo": "Confrontar con la frase de «después».", "pasos": [
      paso("Citar la frase y preguntar si se puede untar sin masa.", ["Busqué en el párrafo 2 y encontré esto:", "«Después se unta la masa sobre cada hoja, se agrega el relleno y se dobla.»", "¿Se puede untar la masa si todavía no está batida?"], ["Sí", "No"]),
      paso("Volver al reto.", ["😳 Uy, entonces me salté pasos.", "¿En qué orden se hacen los tamales?"])]},
    "3": {"objetivo": "Aprender juntos: palabras que marcan el orden.", "pasos": [
      paso("Modelar con la rutina de la noche.", ["¡Vas bien! Te enseño un truco que uso 🕵️", "Busco palabras de orden como «primero», «después» y «al final». Mira: «Primero me lavo los dientes, después me pongo la pijama y al final apago la luz.»", "¿Qué hago en segundo lugar?"]),
      paso("Volver al reto con el truco.", ["🔥 ¡Eso! Ahora busca esas palabras en el texto de los tamales. ¿Cuál es el orden?"])]},
    "4": {"objetivo": "Bajar un escalón: una pista a la vez.", "pasos": [
      paso("Palabra de orden en el párrafo 2.", ["¡Buenísima pregunta! A ver si el texto nos da pistas 🔍", "¿Con qué palabra empieza el párrafo 2?"]),
      paso("Qué se hace justo antes de cocer.", ["¡Sí! ¿Y qué se hace justo antes de cocerlos en la vaporera?"]),
      paso("Volver al reto.", ["🤯 Ya casi lo tenemos.", "Ahora sí: ¿en qué orden se hacen los tamales, del primer paso al último?"])]}}})

for r in retos:
    with open(os.path.join(D, r['id'] + '.json'), 'w') as f:
        f.write(json.dumps(r, ensure_ascii=False, indent=2) + '\n')
print('\n'.join(r['id'] for r in retos))
