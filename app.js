/* REGISTRO DE USO DE IA:
   (Reemplazá esta línea por el texto exacto de tu comentario de registro) */

/* ==========================================================
   1. DATOS
   ========================================================== */

// Clave con la que guardamos todo junto en localStorage
const CLAVE_ALMACEN = "aula-datos";

// Los cuatro arrays (campos asumidos, cambialos según tu tabla):
// cursos:     { id, codigo, nombre, docente, color, descripcion }
// materiales: { id, cursoId, tipo, titulo, contenido, fecha }
//              tipo: "texto" | "enlace" | "archivo"
//              contenido: el texto, el enlace o el NOMBRE del archivo
//              fecha: número de Date.now() (sirve para ordenar)
// tareas:     { id, cursoId, titulo, consigna, fechaLimite, puntajeMaximo, fecha }
//              fechaLimite y fecha: números de Date.now() / getTime()
// entregas:   { id, tareaId, alumno, texto, enlace, fecha, estado, fechaEdicion,
//               correccion, nota, devolucion, fechaCorreccion }
//              estado: "a tiempo" | "tarde" (si llegó a tiempo o no)
//              correccion: "pendiente" | "corregida"
//              nota: null mientras no esté corregida
let cursos = [];
let materiales = [];
let tareas = [];
let entregas = [];

// Modo actual: "docente" o "alumno"
let modo = "docente";

// Nombre (ficticio) del alumno: se pide una sola vez y se guarda
let nombreDelAlumno = "";

/* ==========================================================
   2. GUARDAR Y CARGAR (localStorage)
   ========================================================== */

// Guarda los cuatro arrays y el modo juntos, en un solo objeto
function guardarDatos() {
  const datos = { cursos, materiales, tareas, entregas, modo, nombreDelAlumno };
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
  } catch (error) {
    console.error("No se pudo guardar en localStorage:", error);
  }
}

// Lee el objeto guardado (si existe) y rellena las variables
function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACEN);
    if (!texto) return; // todavía no hay nada guardado

    const datos = JSON.parse(texto);
    cursos = Array.isArray(datos.cursos) ? datos.cursos : [];
    materiales = Array.isArray(datos.materiales) ? datos.materiales : [];
    tareas = Array.isArray(datos.tareas) ? datos.tareas : [];
    entregas = Array.isArray(datos.entregas) ? datos.entregas : [];
    modo = datos.modo === "alumno" ? "alumno" : "docente";
    nombreDelAlumno = typeof datos.nombreDelAlumno === "string" ? datos.nombreDelAlumno : "";
  } catch (error) {
    console.error("Los datos guardados están dañados:", error);
  }
}

/* ==========================================================
   3. MODO DOCENTE / ALUMNO
   ========================================================== */

const selectorRol = document.getElementById("selectorRol");

// Muestra el modo actual en el select y en el <body>
// (el CSS usa el atributo data-modo para ocultar lo que es solo del docente)
function aplicarModo() {
  selectorRol.value = modo;
  document.body.dataset.modo = modo;
}

// Cuando cambia el select, actualizamos el modo y lo guardamos
selectorRol.addEventListener("change", function () {
  modo = selectorRol.value;
  aplicarModo();
  guardarDatos();
});

// Marcamos con "solo-docente" lo que tiene data-rol="docente"
// y con "solo-alumno" lo que tiene data-rol="alumno"
// (así no hace falta tocar el index.html)
function marcarElementosPorRol() {
  document.querySelectorAll('[data-rol="docente"]').forEach(function (elemento) {
    elemento.classList.add("solo-docente");
  });
  document.querySelectorAll('[data-rol="alumno"]').forEach(function (elemento) {
    elemento.classList.add("solo-alumno");
  });
}

/* ==========================================================
   4. VISTAS
   ========================================================== */

// Relaciona el nombre de cada vista con su <section>
const vistas = {
  cursos: document.getElementById("vistaCursos"),
  curso: document.getElementById("vistaCurso"),
  tarea: document.getElementById("vistaTarea")
};

// Muestra la vista pedida ("cursos", "curso" o "tarea") y oculta las otras
function mostrarVista(nombre) {
  for (const clave in vistas) {
    vistas[clave].hidden = clave !== nombre;
  }
}

/* ==========================================================
   5. CURSOS: ALTA, EDICIÓN Y BAJA
   ========================================================== */

// Elementos del formulario y de la grilla
const formularioCurso = document.getElementById("formularioCurso");
const campoNombre = document.getElementById("nombreCurso");
const campoCodigo = document.getElementById("codigoCurso");
const campoDocente = document.getElementById("docenteCurso");
const campoColor = document.getElementById("colorCurso");
const campoDescripcion = document.getElementById("descripcionCurso");
const mensajeErrorCurso = document.getElementById("errorCurso");
const tituloFormularioCurso = document.getElementById("tituloFormularioCurso");
const botonGuardarCurso = document.getElementById("botonGuardarCurso");
const botonCancelarCurso = document.getElementById("botonCancelarCurso");
const grillaCursos = document.getElementById("grillaCursos");

// id del curso que se está editando (null = estamos creando uno nuevo)
let idCursoEnEdicion = null;

// id del curso cuyo muro está abierto (null = ninguno)
let idCursoActual = null;

// Crea un id único. Los demás arrays lo usan para referirse al curso
// (por eso el código se puede cambiar sin romper nada)
function crearId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- VALIDACIÓN ----------

// Devuelve { mensaje, campo } con el primer error, o null si todo está bien
function validarCurso(nombre, codigo) {
  // 1) El nombre no puede estar vacío
  if (nombre === "") {
    return { mensaje: "El nombre del curso no puede estar vacío.", campo: campoNombre };
  }

  // 2) El código: de 3 a 8 caracteres, solo letras (sin tildes ni ñ) o números
  if (!/^[A-Za-z0-9]{3,8}$/.test(codigo)) {
    return {
      mensaje: "El código debe tener de 3 a 8 letras o números, sin espacios ni símbolos.",
      campo: campoCodigo
    };
  }

  // 3) El código no puede repetirse (sin mirar mayúsculas/minúsculas).
  // Al editar, ignoramos el propio curso para que pueda conservar su código.
  const repetido = cursos.some(function (curso) {
    return curso.id !== idCursoEnEdicion &&
           curso.codigo.toUpperCase() === codigo.toUpperCase();
  });
  if (repetido) {
    return {
      mensaje: "Ya existe un curso con el código " + codigo.toUpperCase() + ". Elegí otro.",
      campo: campoCodigo
    };
  }

  return null; // sin errores
}

// ---------- ALTA Y EDICIÓN ----------

formularioCurso.addEventListener("submit", function (evento) {
  evento.preventDefault(); // evita que la página se recargue

  const nombre = campoNombre.value.trim();
  const codigo = campoCodigo.value.trim();

  const error = validarCurso(nombre, codigo);
  if (error) {
    mensajeErrorCurso.textContent = error.mensaje;
    error.campo.focus();
    return; // no guardamos nada
  }

  // Datos del curso (el código se guarda siempre en mayúsculas)
  const datosCurso = {
    codigo: codigo.toUpperCase(),
    nombre: nombre,
    docente: campoDocente.value.trim(),
    color: campoColor.value,
    descripcion: campoDescripcion.value.trim()
  };

  if (idCursoEnEdicion === null) {
    // Alta: curso nuevo con id propio
    datosCurso.id = crearId();
    cursos.push(datosCurso);
  } else {
    // Edición: copiamos los datos nuevos sobre el curso existente
    const curso = cursos.find(function (c) { return c.id === idCursoEnEdicion; });
    Object.assign(curso, datosCurso);
  }

  guardarDatos();
  salirDeEdicion();
  dibujarCursos();
});

// Cuando la persona vuelve a escribir, borramos el mensaje de error
formularioCurso.addEventListener("input", function () {
  mensajeErrorCurso.textContent = "";
});

// Carga los datos del curso en el formulario para editarlo
function empezarEdicion(id) {
  const curso = cursos.find(function (c) { return c.id === id; });
  if (!curso) return;

  idCursoEnEdicion = id;
  campoNombre.value = curso.nombre;
  campoCodigo.value = curso.codigo;
  campoDocente.value = curso.docente;
  campoColor.value = curso.color;
  campoDescripcion.value = curso.descripcion;

  mensajeErrorCurso.textContent = "";
  tituloFormularioCurso.textContent = "Editar curso";
  botonGuardarCurso.textContent = "Guardar cambios";
  botonCancelarCurso.hidden = false;

  formularioCurso.scrollIntoView(); // lleva la pantalla hasta el formulario
  campoNombre.focus();
}

// Vuelve el formulario al modo "crear curso"
function salirDeEdicion() {
  idCursoEnEdicion = null;
  formularioCurso.reset(); // vacía los campos y deja el color por defecto
  mensajeErrorCurso.textContent = "";
  tituloFormularioCurso.textContent = "Crear curso";
  botonGuardarCurso.textContent = "Crear curso";
  botonCancelarCurso.hidden = true;
}

botonCancelarCurso.addEventListener("click", salirDeEdicion);

// ---------- BAJA (con confirmación) ----------

function borrarCurso(id) {
  const curso = cursos.find(function (c) { return c.id === id; });
  if (!curso) return;

  // Buscamos lo que depende de este curso
  const tareasDelCurso = tareas.filter(function (t) { return t.cursoId === id; });
  const idsDeTareas = tareasDelCurso.map(function (t) { return t.id; });
  const entregasDelCurso = entregas.filter(function (e) {
    return idsDeTareas.includes(e.tareaId);
  });

  // Tareas que tienen al menos una entrega
  const tareasConEntregas = tareasDelCurso.filter(function (tarea) {
    return entregasDelCurso.some(function (e) { return e.tareaId === tarea.id; });
  });

  // Mensaje de confirmación: más fuerte si hay entregas
  let mensaje;
  if (tareasConEntregas.length > 0) {
    mensaje = "⚠️ Atención: el curso \"" + curso.nombre + "\" tiene " +
      tareasConEntregas.length + " tarea(s) con entregas (" +
      entregasDelCurso.length + " entrega(s) en total).\n\n" +
      "Si lo borrás, también se borran sus tareas, materiales y entregas. " +
      "No se puede deshacer.\n\n¿Querés borrarlo igual?";
  } else {
    mensaje = "¿Seguro que querés borrar el curso \"" + curso.nombre + "\"? " +
      "No se puede deshacer.";
  }

  if (!confirm(mensaje)) return; // la persona canceló

  // Borramos el curso y todo lo que colgaba de él
  cursos = cursos.filter(function (c) { return c.id !== id; });
  materiales = materiales.filter(function (m) { return m.cursoId !== id; });
  tareas = tareas.filter(function (t) { return t.cursoId !== id; });
  entregas = entregas.filter(function (e) { return !idsDeTareas.includes(e.tareaId); });

  if (idCursoEnEdicion === id) salirDeEdicion();

  guardarDatos();
  dibujarCursos();
}

// ---------- TARJETAS ----------

// Crea un botón chico para una tarjeta (Editar o Borrar)
function crearBotonAccion(texto, accion, clase) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.dataset.accion = accion;
  boton.className = clase;
  return boton;
}

// Dibuja una tarjeta por cada curso
function dibujarCursos() {
  grillaCursos.innerHTML = ""; // vaciamos la grilla antes de dibujar

  if (cursos.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "mensaje-vacio";
    vacio.textContent = "Todavía no hay cursos. El docente puede crear el primero con el formulario.";
    grillaCursos.appendChild(vacio);
    return;
  }

  cursos.forEach(function (curso) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-curso";
    tarjeta.dataset.id = curso.id;
    // El CSS usa esta variable para pintar la franja de arriba
    tarjeta.style.setProperty("--color-curso", curso.color);

    // Nombre: es un botón dentro del título para poder abrirlo con teclado
    const titulo = document.createElement("h3");
    const botonAbrir = document.createElement("button");
    botonAbrir.type = "button";
    botonAbrir.className = "enlace-curso";
    botonAbrir.textContent = curso.nombre;
    titulo.appendChild(botonAbrir);

    const codigo = document.createElement("p");
    codigo.className = "codigo-curso";
    codigo.textContent = curso.codigo;

    const docente = document.createElement("p");
    docente.textContent = "👤 " + (curso.docente || "Sin docente asignado");

    // Botones de editar y borrar: solo los ve el docente
    const acciones = document.createElement("div");
    acciones.className = "acciones-curso solo-docente";
    acciones.appendChild(crearBotonAccion("Editar", "editar", "boton-secundario"));
    acciones.appendChild(crearBotonAccion("Borrar", "borrar", "boton-peligro"));

    tarjeta.append(titulo, codigo, docente, acciones);
    grillaCursos.appendChild(tarjeta);
  });
}

// Un solo "oyente" para toda la grilla: mira dónde se hizo clic
grillaCursos.addEventListener("click", function (evento) {
  const tarjeta = evento.target.closest(".tarjeta-curso");
  if (!tarjeta) return;

  const id = tarjeta.dataset.id;
  const boton = evento.target.closest("button[data-accion]");

  if (boton) {
    // Se tocó Editar o Borrar
    if (boton.dataset.accion === "editar") empezarEdicion(id);
    if (boton.dataset.accion === "borrar") borrarCurso(id);
    return;
  }

  // Se tocó cualquier otra parte de la tarjeta: abrimos el curso
  abrirCurso(id);
});

// ---------- ABRIR EL MURO DE UN CURSO ----------

function abrirCurso(id) {
  const curso = cursos.find(function (c) { return c.id === id; });
  if (!curso) return;

  idCursoActual = id;
  document.getElementById("tituloCurso").textContent = curso.nombre;
  document.getElementById("descripcionDelCurso").textContent = curso.descripcion;

  salirDeEdicionPublicacion(); // por si había una edición a medias en otro curso
  dibujarMuro();
  mostrarVista("curso");
  window.scrollTo(0, 0);
}

// Botón "Volver a Mis cursos"
document.getElementById("botonVolverCursos").addEventListener("click", function () {
  idCursoActual = null;
  mostrarVista("cursos");
});

/* ==========================================================
   6. MURO: MATERIALES Y TAREAS
   ========================================================== */

// Elementos del formulario de publicación y de la lista del muro
const formularioPublicacion = document.getElementById("formularioPublicacion");
const campoTipo = document.getElementById("tipoPublicacion");
const campoTitulo = document.getElementById("tituloPublicacion");
const campoTexto = document.getElementById("textoPublicacion");
const campoEnlace = document.getElementById("enlacePublicacion");
const campoArchivo = document.getElementById("archivoPublicacion");
const campoConsigna = document.getElementById("consignaPublicacion");
const campoFechaLimite = document.getElementById("fechaLimitePublicacion");
const campoPuntaje = document.getElementById("puntajePublicacion");
const grupoTexto = document.getElementById("grupoTexto");
const grupoEnlace = document.getElementById("grupoEnlace");
const grupoArchivo = document.getElementById("grupoArchivo");
const grupoTarea = document.getElementById("grupoTarea");
const notaArchivoActual = document.getElementById("archivoActual");
const mensajeErrorPublicacion = document.getElementById("errorPublicacion");
const tituloFormularioPublicacion = document.getElementById("tituloFormularioPublicacion");
const botonGuardarPublicacion = document.getElementById("botonGuardarPublicacion");
const botonCancelarPublicacion = document.getElementById("botonCancelarPublicacion");
const listaMuro = document.getElementById("listaMuro");

// Qué se está editando (solo una de las dos puede tener valor a la vez)
let idMaterialEnEdicion = null;
let idTareaEnEdicion = null;

// Al editar un material de tipo archivo: el nombre que ya tenía guardado
let nombreArchivoGuardado = "";

// ---------- FECHAS ----------

// Convierte un número de fecha en texto legible, ej.: "5/11/26, 18:00"
function formatearFechaHora(milisegundos) {
  return new Date(milisegundos).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// El campo datetime-local necesita este formato exacto: "2026-11-05T18:00"
function aValorDatetimeLocal(milisegundos) {
  const fecha = new Date(milisegundos);
  function dosDigitos(numero) {
    return String(numero).padStart(2, "0");
  }
  return fecha.getFullYear() + "-" + dosDigitos(fecha.getMonth() + 1) + "-" +
         dosDigitos(fecha.getDate()) + "T" +
         dosDigitos(fecha.getHours()) + ":" + dosDigitos(fecha.getMinutes());
}

// ---------- CAMPOS SEGÚN EL TIPO ----------

// Muestra solo el grupo de campos que corresponde al tipo elegido
function mostrarCamposSegunTipo() {
  const tipo = campoTipo.value;
  grupoTexto.hidden = tipo !== "texto";
  grupoEnlace.hidden = tipo !== "enlace";
  grupoArchivo.hidden = tipo !== "archivo";
  grupoTarea.hidden = tipo !== "tarea";
}

// Muestra (u oculta) el aviso con el nombre del archivo que ya estaba guardado
function mostrarArchivoActual() {
  if (nombreArchivoGuardado !== "") {
    notaArchivoActual.textContent =
      "Archivo actual: " + nombreArchivoGuardado + " (si no elegís otro, se mantiene)";
    notaArchivoActual.hidden = false;
  } else {
    notaArchivoActual.textContent = "";
    notaArchivoActual.hidden = true;
  }
}

campoTipo.addEventListener("change", function () {
  mostrarCamposSegunTipo();
  mensajeErrorPublicacion.textContent = "";
});

// ---------- VALIDACIÓN ----------

// Un enlace es válido si empieza con https:// y es una dirección bien armada
// (así también evitamos enlaces raros como "javascript:...")
function esEnlaceSeguro(texto) {
  if (!texto.toLowerCase().startsWith("https://")) return false;
  try {
    const direccion = new URL(texto); // si está mal escrita, da error
    return direccion.protocol === "https:" && direccion.hostname !== "";
  } catch (error) {
    return false;
  }
}

// Muestra un error en el formulario y pone el foco en el campo con problema
function mostrarErrorPublicacion(mensaje, campo) {
  mensajeErrorPublicacion.textContent = mensaje;
  campo.focus();
}

// Lee el contenido de un material según su tipo
function leerContenido(tipo) {
  if (tipo === "texto") return campoTexto.value.trim();
  if (tipo === "enlace") return campoEnlace.value.trim();

  // Archivo: guardamos solo el NOMBRE del archivo elegido, no el archivo en sí
  if (campoArchivo.files.length > 0) return campoArchivo.files[0].name;
  return nombreArchivoGuardado; // si no eligió otro, se mantiene el anterior
}

// ---------- ALTA Y EDICIÓN ----------

// Guarda un material nuevo o los cambios de uno existente.
// Devuelve true si se pudo guardar, false si hubo un error (ya mostrado).
function guardarMaterial(titulo, tipo) {
  const contenido = leerContenido(tipo);

  if (tipo === "enlace" && !esEnlaceSeguro(contenido)) {
    mostrarErrorPublicacion(
      "El enlace tiene que empezar con https:// y ser una dirección válida.", campoEnlace);
    return false;
  }
  if (tipo === "archivo" && contenido === "") {
    mostrarErrorPublicacion("Elegí un archivo para publicar.", campoArchivo);
    return false;
  }

  if (idMaterialEnEdicion === null) {
    // Alta: material nuevo, con la fecha de ahora
    materiales.push({
      id: crearId(),
      cursoId: idCursoActual,
      tipo: tipo,
      titulo: titulo,
      contenido: contenido,
      fecha: Date.now()
    });
  } else {
    // Edición: cambiamos los datos pero conservamos la fecha original
    const material = materiales.find(function (m) { return m.id === idMaterialEnEdicion; });
    if (material) {
      material.tipo = tipo;
      material.titulo = titulo;
      material.contenido = contenido;
    }
  }
  return true;
}

// Guarda una tarea nueva o los cambios de una existente.
// Devuelve true si se pudo guardar, false si hubo un error (ya mostrado).
function guardarTarea(titulo) {
  // Una publicación que ya existe como material no se convierte en tarea
  if (idMaterialEnEdicion !== null) {
    mostrarErrorPublicacion(
      "Un material no se puede convertir en tarea. Cancelá la edición y creá una tarea nueva.",
      campoTipo);
    return false;
  }

  const consigna = campoConsigna.value.trim();
  const fechaLimite = new Date(campoFechaLimite.value).getTime(); // número, o NaN si está vacía
  const puntaje = Number(campoPuntaje.value);

  if (consigna === "") {
    mostrarErrorPublicacion("La consigna es obligatoria.", campoConsigna);
    return false;
  }
  if (campoFechaLimite.value === "" || isNaN(fechaLimite)) {
    mostrarErrorPublicacion("Elegí la fecha límite.", campoFechaLimite);
    return false;
  }
  if (!Number.isInteger(puntaje) || puntaje < 1) {
    mostrarErrorPublicacion(
      "El puntaje máximo tiene que ser un número entero mayor que 0.", campoPuntaje);
    return false;
  }

  if (idTareaEnEdicion === null) {
    // Alta: tarea nueva
    tareas.push({
      id: crearId(),
      cursoId: idCursoActual,
      titulo: titulo,
      consigna: consigna,
      fechaLimite: fechaLimite,
      puntajeMaximo: puntaje,
      fecha: Date.now()
    });
  } else {
    // Edición: cambiamos los datos y conservamos la fecha de publicación
    const tarea = tareas.find(function (t) { return t.id === idTareaEnEdicion; });
    if (tarea) {
      // No se puede bajar el puntaje por debajo de una nota que ya se puso
      const hayNotaMayor = entregas.some(function (e) {
        return e.tareaId === tarea.id && estaCorregida(e) && e.nota > puntaje;
      });
      if (hayNotaMayor) {
        mostrarErrorPublicacion(
          "Ya hay entregas corregidas con una nota mayor a ese puntaje máximo.", campoPuntaje);
        return false;
      }

      tarea.titulo = titulo;
      tarea.consigna = consigna;
      tarea.fechaLimite = fechaLimite;
      tarea.puntajeMaximo = puntaje;

      // Si cambió la fecha límite, recalculamos "a tiempo" o "tarde" de sus entregas
      entregas.forEach(function (entrega) {
        if (entrega.tareaId === tarea.id) {
          entrega.estado = calcularEstado(entrega.fecha, fechaLimite);
        }
      });
    }
  }
  return true;
}

formularioPublicacion.addEventListener("submit", function (evento) {
  evento.preventDefault();
  if (idCursoActual === null) return;

  const titulo = campoTitulo.value.trim();
  const tipo = campoTipo.value;

  // El título es obligatorio para todos los tipos
  if (titulo === "") {
    mostrarErrorPublicacion("El título es obligatorio.", campoTitulo);
    return;
  }

  const seGuardo = tipo === "tarea" ? guardarTarea(titulo) : guardarMaterial(titulo, tipo);
  if (!seGuardo) return; // hubo un error y ya se mostró

  guardarDatos();
  salirDeEdicionPublicacion();
  dibujarMuro();
});

// Cuando la persona vuelve a escribir, borramos el mensaje de error
formularioPublicacion.addEventListener("input", function () {
  mensajeErrorPublicacion.textContent = "";
});

// Carga el material en el formulario para editarlo
function empezarEdicionMaterial(id) {
  const material = materiales.find(function (m) { return m.id === id; });
  if (!material) return;

  salirDeEdicionPublicacion(); // limpia cualquier edición anterior
  idMaterialEnEdicion = id;
  campoTipo.value = material.tipo;
  campoTitulo.value = material.titulo;
  campoTexto.value = material.tipo === "texto" ? material.contenido : "";
  campoEnlace.value = material.tipo === "enlace" ? material.contenido : "";
  campoArchivo.value = ""; // por seguridad el navegador no deja rellenar un archivo
  nombreArchivoGuardado = material.tipo === "archivo" ? material.contenido : "";

  mostrarCamposSegunTipo();
  mostrarArchivoActual();
  prepararFormularioEnEdicion();
}

// Carga la tarea en el formulario para editarla
function empezarEdicionTarea(id) {
  const tarea = tareas.find(function (t) { return t.id === id; });
  if (!tarea) return;

  salirDeEdicionPublicacion(); // limpia cualquier edición anterior
  idTareaEnEdicion = id;
  campoTipo.value = "tarea";
  campoTipo.disabled = true; // una tarea no puede cambiar de tipo
  campoTitulo.value = tarea.titulo;
  campoConsigna.value = tarea.consigna;
  campoFechaLimite.value = aValorDatetimeLocal(tarea.fechaLimite);
  campoPuntaje.value = tarea.puntajeMaximo;

  mostrarCamposSegunTipo();
  prepararFormularioEnEdicion();
}

// Cambia los textos del formulario al modo "editar"
function prepararFormularioEnEdicion() {
  mensajeErrorPublicacion.textContent = "";
  tituloFormularioPublicacion.textContent = "Editar publicación";
  botonGuardarPublicacion.textContent = "Guardar cambios";
  botonCancelarPublicacion.hidden = false;

  formularioPublicacion.scrollIntoView();
  campoTitulo.focus();
}

// Vuelve el formulario al modo "publicar"
function salirDeEdicionPublicacion() {
  idMaterialEnEdicion = null;
  idTareaEnEdicion = null;
  nombreArchivoGuardado = "";
  campoTipo.disabled = false;
  formularioPublicacion.reset(); // vacía los campos y vuelve al tipo "Texto"
  mostrarCamposSegunTipo();
  mostrarArchivoActual();
  mensajeErrorPublicacion.textContent = "";
  tituloFormularioPublicacion.textContent = "Publicar en el muro";
  botonGuardarPublicacion.textContent = "Publicar";
  botonCancelarPublicacion.hidden = true;
}

botonCancelarPublicacion.addEventListener("click", salirDeEdicionPublicacion);

// ---------- BAJA (con confirmación) ----------

function borrarMaterial(id) {
  const material = materiales.find(function (m) { return m.id === id; });
  if (!material) return;

  if (!confirm("¿Seguro que querés borrar \"" + material.titulo + "\"? No se puede deshacer.")) {
    return; // la persona canceló
  }

  materiales = materiales.filter(function (m) { return m.id !== id; });
  if (idMaterialEnEdicion === id) salirDeEdicionPublicacion();

  guardarDatos();
  dibujarMuro();
}

function borrarTarea(id) {
  const tarea = tareas.find(function (t) { return t.id === id; });
  if (!tarea) return;

  const cantidadEntregas = entregas.filter(function (e) { return e.tareaId === id; }).length;

  let mensaje;
  if (cantidadEntregas > 0) {
    mensaje = "⚠️ La tarea \"" + tarea.titulo + "\" tiene " + cantidadEntregas +
      " entrega(s). Si la borrás, también se borran sus entregas. " +
      "No se puede deshacer.\n\n¿Querés borrarla igual?";
  } else {
    mensaje = "¿Seguro que querés borrar la tarea \"" + tarea.titulo + "\"? No se puede deshacer.";
  }
  if (!confirm(mensaje)) return; // la persona canceló

  tareas = tareas.filter(function (t) { return t.id !== id; });
  entregas = entregas.filter(function (e) { return e.tareaId !== id; });
  if (idTareaEnEdicion === id) salirDeEdicionPublicacion();

  guardarDatos();
  dibujarMuro();
}

// ---------- DIBUJAR EL MURO ----------

// Arma el contenido de un material según su tipo
function crearCuerpoMaterial(material) {
  const cuerpo = document.createElement("p");
  cuerpo.className = "contenido-publicacion";

  if (material.tipo === "enlace" && esEnlaceSeguro(material.contenido)) {
    // Enlace que se abre en una pestaña nueva
    const enlace = document.createElement("a");
    enlace.href = material.contenido;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer"; // protege la página original
    enlace.textContent = material.contenido;
    cuerpo.appendChild(enlace);
  } else if (material.tipo === "archivo") {
    cuerpo.textContent = "📎 " + material.contenido + " (entregado en clase)";
  } else {
    // Texto (o un enlace dañado, que mostramos como texto simple)
    cuerpo.textContent = material.contenido;
  }
  return cuerpo;
}

// Crea la línea <li> de un material
function crearItemMaterial(material) {
  const item = document.createElement("li");
  item.className = "publicacion";
  item.dataset.id = material.id;
  item.dataset.tipo = material.tipo; // el CSS elige el ícono con esto

  const titulo = document.createElement("h4");
  titulo.textContent = material.titulo;

  const fecha = document.createElement("small");
  fecha.className = "fecha-publicacion";
  fecha.textContent = "Publicado el " + formatearFechaHora(material.fecha);

  // Botones de editar y borrar: solo los ve el docente
  const acciones = document.createElement("div");
  acciones.className = "acciones-publicacion solo-docente";
  acciones.appendChild(crearBotonAccion("Editar", "editar", "boton-secundario"));
  acciones.appendChild(crearBotonAccion("Borrar", "borrar", "boton-peligro"));

  item.append(titulo, fecha, crearCuerpoMaterial(material), acciones);
  return item;
}

// Crea la línea <li> de una tarea (con su fecha de vencimiento)
function crearItemTarea(tarea) {
  const item = document.createElement("li");
  item.className = "publicacion";
  item.dataset.id = tarea.id;
  item.dataset.tipo = "tarea"; // el CSS le pone el ícono ✅ y el borde rosa

  const titulo = document.createElement("h4");
  titulo.textContent = tarea.titulo;

  const fecha = document.createElement("small");
  fecha.className = "fecha-publicacion";
  fecha.textContent = "Publicada el " + formatearFechaHora(tarea.fecha);

  const consigna = document.createElement("p");
  consigna.className = "contenido-publicacion";
  consigna.textContent = tarea.consigna;

  const vencimiento = document.createElement("p");
  vencimiento.className = "datos-tarea";
  vencimiento.textContent = "⏰ Vence el " + formatearFechaHora(tarea.fechaLimite);

  const puntaje = document.createElement("p");
  puntaje.className = "datos-tarea";
  puntaje.textContent = "🎯 Puntaje máximo: " + tarea.puntajeMaximo;

  // Resumen de entregas (solo lo ve el docente)
  const cantidadEntregas = entregas.filter(function (e) { return e.tareaId === tarea.id; }).length;
  const resumen = document.createElement("p");
  resumen.className = "datos-tarea solo-docente";
  resumen.textContent = "📥 " +
    textoResumenEntregas(cantidadEntregas, contarEntregasPorCorregir(tarea.id));

  // "Abrir tarea" lo ven todos; editar y borrar solo el docente
  const acciones = document.createElement("div");
  acciones.className = "acciones-publicacion";
  acciones.appendChild(crearBotonAccion("Abrir tarea", "abrir", ""));

  const accionesDocente = document.createElement("span");
  accionesDocente.className = "acciones-docente solo-docente";
  accionesDocente.appendChild(crearBotonAccion("Editar", "editar", "boton-secundario"));
  accionesDocente.appendChild(crearBotonAccion("Borrar", "borrar", "boton-peligro"));
  acciones.appendChild(accionesDocente);

  item.append(titulo, fecha, consigna, vencimiento, puntaje, resumen, acciones);
  return item;
}

// Dibuja materiales y tareas del curso abierto, del más nuevo al más viejo
function dibujarMuro() {
  listaMuro.innerHTML = "";

  // Juntamos materiales y tareas del curso en una sola lista
  const publicaciones = [];
  materiales.forEach(function (material) {
    if (material.cursoId === idCursoActual) {
      publicaciones.push({ clase: "material", datos: material });
    }
  });
  tareas.forEach(function (tarea) {
    if (tarea.cursoId === idCursoActual) {
      publicaciones.push({ clase: "tarea", datos: tarea });
    }
  });

  if (publicaciones.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "mensaje-vacio";
    vacio.textContent = "Todavía no hay publicaciones en este curso.";
    listaMuro.appendChild(vacio);
    return;
  }

  // Ordenamos: la fecha más grande (más nueva) va primero
  publicaciones.sort(function (a, b) { return b.datos.fecha - a.datos.fecha; });

  publicaciones.forEach(function (publicacion) {
    if (publicacion.clase === "tarea") {
      listaMuro.appendChild(crearItemTarea(publicacion.datos));
    } else {
      listaMuro.appendChild(crearItemMaterial(publicacion.datos));
    }
  });
}

// Un solo "oyente" para todo el muro: mira qué botón se tocó
listaMuro.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button[data-accion]");
  const item = evento.target.closest(".publicacion");
  if (!boton || !item) return;

  const id = item.dataset.id;
  const esTarea = item.dataset.tipo === "tarea";
  const accion = boton.dataset.accion;

  if (accion === "abrir") abrirTarea(id);
  if (accion === "editar") {
    if (esTarea) empezarEdicionTarea(id);
    else empezarEdicionMaterial(id);
  }
  if (accion === "borrar") {
    if (esTarea) borrarTarea(id);
    else borrarMaterial(id);
  }
});

/* ==========================================================
   7. ALUMNO: NOMBRE (se pide una sola vez)
   ========================================================== */

const formularioNombreAlumno = document.getElementById("formularioNombreAlumno");
const campoNombrePerfil = document.getElementById("nombreAlumno");
const mensajeErrorNombre = document.getElementById("errorNombreAlumno");
const botonCancelarNombre = document.getElementById("botonCancelarNombre");
const bloqueSaludo = document.getElementById("saludoAlumno");
const textoSaludo = document.getElementById("textoSaludo");
const botonCambiarNombre = document.getElementById("botonCambiarNombre");

// Muestra el formulario (si no hay nombre guardado) o el saludo (si ya hay)
function mostrarIdentificacion() {
  const hayNombre = nombreDelAlumno !== "";
  formularioNombreAlumno.hidden = hayNombre;
  bloqueSaludo.hidden = !hayNombre;
  botonCancelarNombre.hidden = true;
  textoSaludo.textContent = "👤 Estás como " + nombreDelAlumno;
}

formularioNombreAlumno.addEventListener("submit", function (evento) {
  evento.preventDefault();

  // trim() saca espacios de los costados y replace junta los espacios repetidos
  const nombre = campoNombrePerfil.value.trim().replace(/\s+/g, " ");
  if (nombre === "") {
    mensajeErrorNombre.textContent = "Escribí tu nombre (usá uno ficticio).";
    campoNombrePerfil.focus();
    return;
  }

  nombreDelAlumno = nombre;
  guardarDatos();
  mostrarIdentificacion();

  // Con otro nombre cambian las entregas que le corresponden
  salirDeEdicionEntrega();
  actualizarEntregaComo();
  if (idTareaActual !== null) dibujarEntregas();
});

// Cuando la persona vuelve a escribir, borramos el mensaje de error
formularioNombreAlumno.addEventListener("input", function () {
  mensajeErrorNombre.textContent = "";
});

// "Cambiar nombre": vuelve a mostrar el formulario con el nombre actual
botonCambiarNombre.addEventListener("click", function () {
  formularioNombreAlumno.hidden = false;
  bloqueSaludo.hidden = true;
  botonCancelarNombre.hidden = false;
  campoNombrePerfil.value = nombreDelAlumno;
  campoNombrePerfil.focus();
});

botonCancelarNombre.addEventListener("click", mostrarIdentificacion);

/* ==========================================================
   8. TAREA: ENTREGAS Y CORRECCIÓN
   ========================================================== */

// Elementos del formulario de entrega y de la lista
const formularioEntrega = document.getElementById("formularioEntrega");
const campoTextoEntrega = document.getElementById("textoEntrega");
const campoEnlaceEntrega = document.getElementById("enlaceEntrega");
const textoEntregaComo = document.getElementById("entregaComo");
const mensajeErrorEntrega = document.getElementById("errorEntrega");
const tituloFormularioEntrega = document.getElementById("tituloFormularioEntrega");
const botonGuardarEntrega = document.getElementById("botonGuardarEntrega");
const botonCancelarEntrega = document.getElementById("botonCancelarEntrega");
const tituloListaEntregas = document.getElementById("tituloListaEntregas");
const resumenEntregas = document.getElementById("resumenEntregas");
const listaEntregas = document.getElementById("listaEntregas");

// id de la tarea abierta (null = ninguna)
let idTareaActual = null;

// id de la entrega que se está editando (null = estamos entregando por primera vez)
let idEntregaEnEdicion = null;

// ---------- FUNCIONES AUXILIARES ----------

// Compara nombres sin importar mayúsculas, tildes ni espacios de más
// ("  María  Pérez" y "maria perez" cuentan como el mismo alumno)
function normalizarNombre(nombre) {
  return nombre.trim().replace(/\s+/g, " ").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Compara la fecha de entrega con la fecha límite
function calcularEstado(fechaEntrega, fechaLimite) {
  return fechaEntrega <= fechaLimite ? "a tiempo" : "tarde";
}

// ¿La entrega ya fue corregida?
// (las entregas viejas no tienen el campo "correccion", y cuentan como pendientes)
function estaCorregida(entrega) {
  return entrega.correccion === "corregida";
}

// Cuántas entregas de una tarea faltan corregir
function contarEntregasPorCorregir(idTarea) {
  return entregas.filter(function (e) {
    return e.tareaId === idTarea && !estaCorregida(e);
  }).length;
}

// Texto del resumen, ej.: "3 entregas, 2 por corregir"
function textoResumenEntregas(total, porCorregir) {
  if (total === 0) return "Sin entregas todavía";
  const palabra = total === 1 ? "entrega" : "entregas";
  if (porCorregir === 0) return total + " " + palabra + ", todas corregidas";
  return total + " " + palabra + ", " + porCorregir + " por corregir";
}

// Muestra con qué nombre va a entregar el alumno
function actualizarEntregaComo() {
  textoEntregaComo.textContent = nombreDelAlumno !== ""
    ? "Vas a entregar como: " + nombreDelAlumno
    : "Primero guardá tu nombre en la parte de arriba.";
}

// ---------- ABRIR LA TAREA ----------

function abrirTarea(id) {
  const tarea = tareas.find(function (t) { return t.id === id; });
  if (!tarea) return;

  idTareaActual = id;
  document.getElementById("tituloTarea").textContent = tarea.titulo;
  document.getElementById("textoConsigna").textContent = tarea.consigna;
  document.getElementById("vencimientoTarea").textContent =
    "⏰ Vence el " + formatearFechaHora(tarea.fechaLimite);
  document.getElementById("puntajeTarea").textContent =
    "🎯 Puntaje máximo: " + tarea.puntajeMaximo;

  salirDeEdicionEntrega(); // por si había una edición a medias en otra tarea
  actualizarEntregaComo();
  dibujarEntregas();
  mostrarVista("tarea");
  window.scrollTo(0, 0);
}

// Botón "Volver al curso": también actualiza el muro (cambian los conteos)
document.getElementById("botonVolverCurso").addEventListener("click", function () {
  idTareaActual = null;
  salirDeEdicionEntrega();
  dibujarMuro();
  mostrarVista("curso");
});

// Si cambia el modo mientras se mira una tarea, se vuelve a dibujar la lista
selectorRol.addEventListener("change", function () {
  if (idTareaActual !== null) dibujarEntregas();
});

// ---------- VALIDACIÓN DE LA ENTREGA ----------

// Devuelve { mensaje, campo } con el primer error, o null si todo está bien
function validarEntrega(texto, enlace) {
  if (nombreDelAlumno === "") {
    return {
      mensaje: "Primero guardá tu nombre en la parte de arriba.",
      campo: campoNombrePerfil
    };
  }
  if (texto === "" && enlace === "") {
    return {
      mensaje: "Escribí un texto, pegá un enlace, o completá las dos cosas.",
      campo: campoTextoEntrega
    };
  }
  if (enlace !== "" && !esEnlaceSeguro(enlace)) {
    return {
      mensaje: "El enlace tiene que empezar con https:// y ser una dirección válida.",
      campo: campoEnlaceEntrega
    };
  }

  // Un mismo alumno no puede entregar dos veces la misma tarea
  if (idEntregaEnEdicion === null) {
    const nombreNormalizado = normalizarNombre(nombreDelAlumno);
    const yaEntrego = entregas.some(function (entrega) {
      return entrega.tareaId === idTareaActual &&
             normalizarNombre(entrega.alumno) === nombreNormalizado;
    });
    if (yaEntrego) {
      return {
        mensaje: "Ya entregaste esta tarea. Si todavía no fue corregida, " +
                 "podés editar tu entrega desde la lista.",
        campo: campoTextoEntrega
      };
    }
  }

  return null; // sin errores
}

// ---------- ENTREGA Y EDICIÓN (ALUMNO) ----------

formularioEntrega.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const tarea = tareas.find(function (t) { return t.id === idTareaActual; });
  if (!tarea) return;

  const texto = campoTextoEntrega.value.trim();
  const enlace = campoEnlaceEntrega.value.trim();

  const error = validarEntrega(texto, enlace);
  if (error) {
    mensajeErrorEntrega.textContent = error.mensaje;
    error.campo.focus();
    return; // no guardamos nada
  }

  if (idEntregaEnEdicion === null) {
    // Entrega nueva: guardamos la fecha y hora de AHORA y si llegó a tiempo
    const ahora = Date.now();
    entregas.push({
      id: crearId(),
      tareaId: idTareaActual,
      alumno: nombreDelAlumno,
      texto: texto,
      enlace: enlace,
      fecha: ahora,
      estado: calcularEstado(ahora, tarea.fechaLimite),
      fechaEdicion: null,
      correccion: "pendiente",
      nota: null,
      devolucion: "",
      fechaCorreccion: null
    });
  } else {
    // Edición: solo si la entrega todavía no fue corregida
    const entrega = entregas.find(function (e) { return e.id === idEntregaEnEdicion; });
    if (!entrega) {
      salirDeEdicionEntrega();
      dibujarEntregas();
      return;
    }
    if (estaCorregida(entrega)) {
      mensajeErrorEntrega.textContent = "Esta entrega ya fue corregida y no se puede editar.";
      return;
    }
    // Cambiamos el contenido, pero NO la fecha de entrega ni el estado original
    entrega.texto = texto;
    entrega.enlace = enlace;
    entrega.fechaEdicion = Date.now();
  }

  guardarDatos();
  salirDeEdicionEntrega();
  dibujarEntregas();
});

// Cuando la persona vuelve a escribir, borramos el mensaje de error
formularioEntrega.addEventListener("input", function () {
  mensajeErrorEntrega.textContent = "";
});

// Carga la entrega en el formulario para editarla
function empezarEdicionEntrega(id) {
  const entrega = entregas.find(function (e) { return e.id === id; });
  if (!entrega) return;

  if (estaCorregida(entrega)) {
    mensajeErrorEntrega.textContent = "Esta entrega ya fue corregida y no se puede editar.";
    return;
  }

  idEntregaEnEdicion = id;
  campoTextoEntrega.value = entrega.texto;
  campoEnlaceEntrega.value = entrega.enlace;

  mensajeErrorEntrega.textContent = "";
  tituloFormularioEntrega.textContent = "Editar tu entrega";
  botonGuardarEntrega.textContent = "Guardar cambios";
  botonCancelarEntrega.hidden = false;

  formularioEntrega.scrollIntoView();
  campoTextoEntrega.focus();
}

// Vuelve el formulario al modo "entregar"
function salirDeEdicionEntrega() {
  idEntregaEnEdicion = null;
  formularioEntrega.reset();
  mensajeErrorEntrega.textContent = "";
  tituloFormularioEntrega.textContent = "Entregar tarea";
  botonGuardarEntrega.textContent = "Entregar";
  botonCancelarEntrega.hidden = true;
}

botonCancelarEntrega.addEventListener("click", salirDeEdicionEntrega);

// ---------- CORRECCIÓN (DOCENTE) ----------

// Crea el formulario para poner nota y devolución a una entrega
function crearFormularioCorreccion(entrega, tarea) {
  const corregida = estaCorregida(entrega);

  const formulario = document.createElement("form");
  formulario.className = "formulario-correccion";
  formulario.noValidate = true; // las validaciones las hacemos nosotros
  formulario.dataset.id = entrega.id;

  const titulo = document.createElement("h5");
  titulo.textContent = corregida ? "Corrección (podés modificarla)" : "Corregir entrega";

  // Nota: un número entero de 1 al puntaje máximo
  const etiquetaNota = document.createElement("label");
  etiquetaNota.textContent = "Nota (de 1 a " + tarea.puntajeMaximo + ")";
  const campoNota = document.createElement("input");
  campoNota.type = "number";
  campoNota.name = "nota";
  campoNota.min = 1;
  campoNota.max = tarea.puntajeMaximo;
  campoNota.step = 1;
  campoNota.inputMode = "numeric";
  if (corregida) campoNota.value = entrega.nota;
  etiquetaNota.appendChild(campoNota);

  // Devolución: un comentario para el alumno (opcional)
  const etiquetaDevolucion = document.createElement("label");
  etiquetaDevolucion.textContent = "Devolución para el alumno (opcional)";
  const campoDevolucion = document.createElement("textarea");
  campoDevolucion.name = "devolucion";
  campoDevolucion.rows = 3;
  if (corregida) campoDevolucion.value = entrega.devolucion || "";
  etiquetaDevolucion.appendChild(campoDevolucion);

  const mensajeError = document.createElement("p");
  mensajeError.className = "mensaje-error";
  mensajeError.setAttribute("role", "alert");

  const botonGuardar = document.createElement("button");
  botonGuardar.type = "submit";
  botonGuardar.textContent = corregida ? "Actualizar corrección" : "Guardar corrección";

  formulario.append(titulo, etiquetaNota, etiquetaDevolucion, mensajeError, botonGuardar);
  return formulario;
}

// Valida y guarda la corrección de una entrega
function guardarCorreccion(formulario) {
  if (modo !== "docente") return; // solo el docente corrige

  const entrega = entregas.find(function (e) { return e.id === formulario.dataset.id; });
  const tarea = tareas.find(function (t) { return t.id === idTareaActual; });
  if (!entrega || !tarea) return;

  const campoNota = formulario.elements["nota"];
  const campoDevolucion = formulario.elements["devolucion"];
  const mensajeError = formulario.querySelector(".mensaje-error");
  const nota = Number(campoNota.value);

  // La nota tiene que ser un entero entre 1 y el puntaje máximo
  if (campoNota.value.trim() === "" || !Number.isInteger(nota) ||
      nota < 1 || nota > tarea.puntajeMaximo) {
    mensajeError.textContent =
      "La nota tiene que ser un número entero de 1 a " + tarea.puntajeMaximo + ".";
    campoNota.focus();
    return;
  }

  entrega.nota = nota;
  entrega.devolucion = campoDevolucion.value.trim();
  entrega.correccion = "corregida"; // el estado de corrección pasa a "corregida"
  entrega.fechaCorreccion = Date.now();

  guardarDatos();
  dibujarEntregas(); // también actualiza el contador de entregas por corregir
}

// Un solo "oyente" para todos los formularios de corrección de la lista
// (el evento "submit" sube desde cada formulario hasta la lista)
listaEntregas.addEventListener("submit", function (evento) {
  const formulario = evento.target.closest(".formulario-correccion");
  if (!formulario) return;

  evento.preventDefault();
  guardarCorreccion(formulario);
});

// Al escribir en un formulario de corrección, se borra su mensaje de error
listaEntregas.addEventListener("input", function (evento) {
  const formulario = evento.target.closest(".formulario-correccion");
  if (formulario) formulario.querySelector(".mensaje-error").textContent = "";
});

// ---------- DIBUJAR LAS ENTREGAS ----------

// Crea una "insignia" de estado (a tiempo, tarde, corregida o pendiente)
function crearInsignia(estado, texto) {
  const insignia = document.createElement("span");
  insignia.className = "estado-entrega";
  insignia.dataset.estado = estado; // el CSS le da el color
  insignia.textContent = texto;
  return insignia;
}

// Agrega al item el texto y el enlace de la entrega (si los hay)
function agregarContenidoEntrega(item, entrega) {
  if (entrega.texto !== "") {
    const texto = document.createElement("p");
    texto.className = "contenido-publicacion";
    texto.textContent = entrega.texto;
    item.appendChild(texto);
  }

  if (entrega.enlace !== "") {
    const parrafoEnlace = document.createElement("p");
    parrafoEnlace.className = "contenido-publicacion";
    if (esEnlaceSeguro(entrega.enlace)) {
      const enlace = document.createElement("a");
      enlace.href = entrega.enlace;
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
      enlace.textContent = entrega.enlace;
      parrafoEnlace.appendChild(enlace);
    } else {
      parrafoEnlace.textContent = entrega.enlace;
    }
    item.appendChild(parrafoEnlace);
  }
}

// Crea la tarjeta de una entrega (distinta para el docente y para el alumno)
function crearItemEntrega(entrega, tarea, esDocente) {
  const item = document.createElement("li");
  item.className = "entrega";
  item.dataset.id = entrega.id;

  const alumno = document.createElement("h4");
  alumno.textContent = entrega.alumno;
  item.appendChild(alumno);

  // Insignias: si llegó a tiempo y si ya fue corregida
  item.appendChild(crearInsignia(
    entrega.estado, entrega.estado === "a tiempo" ? "🟢 A tiempo" : "🔴 Tarde"));
  if (estaCorregida(entrega)) {
    item.appendChild(crearInsignia("corregida", "✔️ Corregida"));
  } else {
    item.appendChild(crearInsignia("pendiente", "⏳ Pendiente de corrección"));
  }

  // Fechas
  const fecha = document.createElement("small");
  fecha.className = "fecha-entrega";
  fecha.textContent = "Entregada el " + formatearFechaHora(entrega.fecha);
  item.appendChild(fecha);

  if (entrega.fechaEdicion !== null) {
    const editada = document.createElement("small");
    editada.className = "fecha-entrega";
    editada.textContent = "Editada el " + formatearFechaHora(entrega.fechaEdicion);
    item.appendChild(editada);
  }

  if (estaCorregida(entrega) && entrega.fechaCorreccion) {
    const fechaCorregida = document.createElement("small");
    fechaCorregida.className = "fecha-entrega";
    fechaCorregida.textContent = "Corregida el " + formatearFechaHora(entrega.fechaCorreccion);
    item.appendChild(fechaCorregida);
  }

  agregarContenidoEntrega(item, entrega);

  if (esDocente) {
    // El docente ve el formulario para poner (o cambiar) la nota
    item.appendChild(crearFormularioCorreccion(entrega, tarea));
  } else if (estaCorregida(entrega)) {
    // El alumno ve la nota y la devolución SOLO si ya está corregida
    const resultado = document.createElement("div");
    resultado.className = "resultado-correccion";

    const nota = document.createElement("p");
    nota.className = "nota-entrega";
    nota.textContent = "Nota: " + entrega.nota + " / " + tarea.puntajeMaximo;
    resultado.appendChild(nota);

    if (entrega.devolucion) {
      const devolucion = document.createElement("p");
      devolucion.className = "devolucion-entrega";
      devolucion.textContent = "💬 " + entrega.devolucion;
      resultado.appendChild(devolucion);
    }
    item.appendChild(resultado);
  } else {
    // Todavía sin corregir: el alumno puede editarla
    const acciones = document.createElement("div");
    acciones.className = "acciones-publicacion";
    acciones.appendChild(crearBotonAccion("Editar", "editar", "boton-secundario"));
    item.appendChild(acciones);
  }

  return item;
}

function dibujarEntregas() {
  listaEntregas.innerHTML = "";

  const tarea = tareas.find(function (t) { return t.id === idTareaActual; });
  if (!tarea) return;

  const esDocente = modo === "docente";
  tituloListaEntregas.textContent = esDocente ? "Entregas" : "Tus entregas";

  // Todas las entregas de esta tarea
  let lista = entregas.filter(function (e) { return e.tareaId === idTareaActual; });

  // Resumen para el docente: cuántas hay y cuántas faltan corregir
  const porCorregir = lista.filter(function (e) { return !estaCorregida(e); }).length;
  resumenEntregas.textContent = "📥 " + textoResumenEntregas(lista.length, porCorregir);

  // En modo alumno mostramos SOLO las entregas con su nombre
  if (!esDocente) {
    if (nombreDelAlumno === "") {
      crearMensajeVacio("Guardá tu nombre para ver tus entregas.");
      return;
    }
    const nombreNormalizado = normalizarNombre(nombreDelAlumno);
    lista = lista.filter(function (e) {
      return normalizarNombre(e.alumno) === nombreNormalizado;
    });
  }

  if (lista.length === 0) {
    crearMensajeVacio(esDocente ? "Todavía no hay entregas." : "Todavía no entregaste esta tarea.");
    return;
  }

  // Orden: el docente ve primero las pendientes; después, la más nueva primero
  lista.sort(function (a, b) {
    if (esDocente && estaCorregida(a) !== estaCorregida(b)) {
      return estaCorregida(a) ? 1 : -1;
    }
    return b.fecha - a.fecha;
  });

  lista.forEach(function (entrega) {
    listaEntregas.appendChild(crearItemEntrega(entrega, tarea, esDocente));
  });
}

// Agrega a la lista un cartel como "Todavía no hay entregas."
function crearMensajeVacio(texto) {
  const vacio = document.createElement("li");
  vacio.className = "mensaje-vacio";
  vacio.textContent = texto;
  listaEntregas.appendChild(vacio);
}

// Un solo "oyente" para los botones de la lista (el de Editar del alumno)
listaEntregas.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button[data-accion]");
  const item = evento.target.closest(".entrega");
  if (!boton || !item) return;

  if (boton.dataset.accion === "editar") empezarEdicionEntrega(item.dataset.id);
});

/* ==========================================================
   9. INICIO
   ========================================================== */
/* ==========================================================
   10. EXPORTAR E IMPORTAR JSON
   ========================================================== */

const botonExportar = document.getElementById("botonExportar");
const botonImportar = document.getElementById("botonImportar");
const archivoImportar = document.getElementById("archivoImportar");

// Exportar todos los datos en un archivo aula.json
botonExportar.addEventListener("click", function () {
  const datos = {
    cursos: cursos,
    materiales: materiales,
    tareas: tareas,
    entregas: entregas,
    modo: modo,
    nombreDelAlumno: nombreDelAlumno
  };

  const jsonString = JSON.stringify(datos, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const enlaceTemporal = document.createElement("a");
  enlaceTemporal.href = url;
  enlaceTemporal.download = "aula.json";
  document.body.appendChild(enlaceTemporal);
  enlaceTemporal.click();
  document.body.removeChild(enlaceTemporal);
  URL.revokeObjectURL(url);
});

// Activar el input file oculto al hacer clic en el botón Importar
botonImportar.addEventListener("click", function () {
  archivoImportar.click();
});

// Leer el archivo .json seleccionado, validar y reemplazar los datos
archivoImportar.addEventListener("change", function (evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = function (e) {
    try {
      const contenido = e.target.result;
      const datos = JSON.parse(contenido);

      // Verificamos que contenga todas las listas esperadas y sean arrays
      if (
        !datos ||
        !Array.isArray(datos.cursos) ||
        !Array.isArray(datos.materiales) ||
        !Array.isArray(datos.tareas) ||
        !Array.isArray(datos.entregas)
      ) {
        alert("Error: El archivo JSON no tiene el formato esperado para el aula virtual.");
        return;
      }

      if (!confirm("¿Seguro que querés importar los datos? Se sobrescribirá la información actual.")) {
        archivoImportar.value = ""; // limpiamos el input
        return;
      }

      // Reasignamos los datos globales
      cursos = datos.cursos;
      materiales = datos.materiales;
      tareas = datos.tareas;
      entregas = datos.entregas;
      modo = datos.modo === "alumno" ? "alumno" : "docente";
      nombreDelAlumno = typeof datos.nombreDelAlumno === "string" ? datos.nombreDelAlumno : "";

      // Guardamos y redibujamos la interfaz
      guardarDatos();
      aplicarModo();
      marcarElementosPorRol();
      mostrarIdentificacion();
      dibujarCursos();
      
      // Si estábamos dentro de un curso o tarea, volvemos a la vista principal para evitar errores de IDs perdidos
      idCursoActual = null;
      idTareaActual = null;
      mostrarVista("cursos");

      alert("¡Datos importados con éxito!");
    } catch (error) {
      alert("Error: El archivo seleccionado no es un JSON válido.");
      console.error(error);
    } finally {
      archivoImportar.value = ""; // limpiamos para permitir reimportar el mismo archivo si hace falta
    }
  };

  lector.readAsText(archivo);
});

cargarDatos();
marcarElementosPorRol();
aplicarModo();
mostrarIdentificacion();
dibujarCursos();
mostrarCamposSegunTipo();
mostrarVista("cursos");
