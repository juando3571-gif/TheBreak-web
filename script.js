// Estado del reproductor
let isPlaying = false;

// Elementos del DOM
const playerTitle = document.getElementById('track-title');
const playerArtist = document.getElementById('track-artist');
const mainPlayBtn = document.getElementById('main-play-btn');
const mainPlayIcon = mainPlayBtn.querySelector('i');
const audio = document.getElementById('audio-player');
const progressFill = document.querySelector('.progress-fill');

// Mapa de pistas -> coloca los archivos de audio en la carpeta `audio/`
const tracks = {
    'intro': 'audio/intro.mp3',
    'tip1':  'audio/tip1.mp3',
    'tip2':  'audio/tip2.mp3',
    'tip3':  'audio/tip3.mp3'
};

// Textos en español para cada pista (usados por TTS)
const ttsTexts = {
    'intro': `Hola, soy Ana. Esta es la historia "Cómo reprobé y sobreviví para contarlo". \n
En la universidad aprendí que equivocarse no es el fin: es una oportunidad para ajustar métodos, pedir ayuda y levantarse con más fuerza. En esta historia te cuento cómo un examen reprobado me llevó a cambiar hábitos, encontrar nuevos aliados y, por supuesto, a depender de mucho café barato.`,
    'tip1': `Consejos para hackear tu horario de sueño. Primero: prioriza la calidad sobre la cantidad; establece una ventana de sueño regular y evita pantallas una hora antes. Segundo: utiliza siestas estratégicas de 20 minutos; no hagas de dormir cuatro horas la regla. Tercero: cuida tu alimentación y tu hidratación para mantener la concentración.`,
    'tip2': `Guía rápida de comida barata cerca del campus. Busca los puestos locales que ofrecen menús del día; compara precios y porciones, y prueba las recomendaciones de otros estudiantes. Opta por carbohidratos complejos y proteínas sencillas para energías largas. Y recuerda: compartir es ahorrar.`,
    'tip3': `Amor en tiempos de finales: sí es posible, con comunicación y planificación. Hablen de prioridades, establezcan horarios de estudio y de descanso en pareja, y apoyen metas académicas mutuamente. No te olvides de espacio personal: rendir en la universidad y cuidar una relación requieren equilibrio.`
    ,
    'con1': `Organiza tu semana: divide grandes tareas en pasos pequeños, planifica bloques de estudio de 50 minutos y usa listas de tareas para priorizar.`,
    'con2': `Cuida tu salud: mantén una rutina de sueño regular, desayuna algo nutritivo y mueve el cuerpo con pequeños paseos durante el día.`,
    'con3': `Haz contactos: asiste a actividades en el campus, únete a grupos de estudio y comparte recursos. Las redes abren oportunidades.`,
    'con4': `Técnicas de estudio: aplica Pomodoro, crea mapas mentales y explica lo aprendido a otra persona para reforzar la memoria.`,
    'con5': `Gestión del dinero: registra tus gastos, establece un presupuesto mensual y busca opciones de comida y transporte económicas.`,
    'con6': `Cuida tu salud mental: habla con amigos, busca apoyo profesional si lo necesitas y reserva tiempo para actividades que te relajen.`
};

// TTS control
let usingTTS = false;
let ttsUtterance = null;
let ttsInterval = null;
let ttsEstimatedMs = 0;
let ttsStart = 0;

// Estado de reproducción por tarjeta (id) y referencia al botón activo
let currentPlayingId = null;
let currentPlayButton = null;

function setActiveTipButton(id) {
    const btn = document.querySelector(`.tip-play[onclick*="${id}"]`);
    if (btn) {
        currentPlayButton = btn;
        btn.innerHTML = '<i class="fa-solid fa-circle-pause"></i>';
        btn.classList.add('playing');
    }
    if (mainPlayIcon) {
        mainPlayIcon.classList.remove('fa-play');
        mainPlayIcon.classList.add('fa-pause');
    }
}

function clearActiveTipButton() {
    if (currentPlayButton) {
        currentPlayButton.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
        currentPlayButton.classList.remove('playing');
        currentPlayButton = null;
    }
    currentPlayingId = null;
    if (mainPlayIcon) {
        mainPlayIcon.classList.remove('fa-pause');
        mainPlayIcon.classList.add('fa-play');
    }
}

// Reproducir una pista asociada a una tarjeta
function playAudio(id, title, artist) {
    // Actualizar información del reproductor
    playerTitle.textContent = title;
    playerArtist.textContent = artist;

    // Si ya se está reproduciendo la misma pista, entonces hacemos toggle (pausar)
    if (currentPlayingId === id) {
        stopCurrentPlayback();
        clearActiveTipButton();
        return;
    }

    // detener cualquier otra reproducción y marcar la nueva como activa
    stopCurrentPlayback();
    currentPlayingId = id;
    setActiveTipButton(id);

    // Preferir TTS en español si está disponible
    if ('speechSynthesis' in window && ttsTexts[id]) {
        // Detener cualquier reproducción anterior
        stopCurrentPlayback();

        usingTTS = true;
        const text = ttsTexts[id];
        ttsUtterance = new SpeechSynthesisUtterance(text);
        ttsUtterance.lang = 'es-ES';
        ttsUtterance.rate = 1;

        // Estimar duración en ms (aprox: 150 palabras por minuto)
        const words = text.split(/\s+/).length;
        ttsEstimatedMs = (words / 150) * 60 * 1000;
        ttsStart = Date.now();

        ttsUtterance.onstart = () => {
            isPlaying = true;
            updatePlayButton();
            startTTSProgress();
        };
        ttsUtterance.onend = () => {
            isPlaying = false;
            updatePlayButton();
            stopTTSProgress();
            // limpiar estado visual del botón de consejo
            clearActiveTipButton();
        };
        ttsUtterance.onerror = (e) => {
            console.error('TTS error', e);
            isPlaying = false;
            updatePlayButton();
            stopTTSProgress();
            clearActiveTipButton();
        };

        window.speechSynthesis.speak(ttsUtterance);
        return;
    }

    // Fallback: reproducir archivo si existe en /audio/
    const src = tracks[id];
    if (!src) {
        console.warn(`No se encontró pista para id='${id}'. Coloca el archivo en audio/${id}.mp3 o habilita TTS.`);
        return;
    }

    // Si es la misma pista y está pausada, volver a play
    if (audio.src && audio.src.endsWith(src) && audio.paused === false) {
        // ya está sonando la misma pista
    } else {
        audio.src = src;
    }

    audio.play().then(() => {
        isPlaying = true;
        updatePlayButton();
        // marcar el botón activo si corresponde
        setActiveTipButton(id);
    }).catch(err => {
        console.error('Error reproduciendo audio:', err);
    });
}

function stopCurrentPlayback() {
    // Stop audio element
    if (audio && !audio.paused) {
        audio.pause();
    }
    audio.removeAttribute('src');
    audio.load();

    // Stop TTS
    if (usingTTS && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    usingTTS = false;
    if (ttsUtterance) ttsUtterance = null;
    stopTTSProgress();

    // limpiar estado visual del botón activo
    clearActiveTipButton();
}

function startTTSProgress() {
    if (!progressFill) return;
    stopTTSProgress();
    ttsInterval = setInterval(() => {
        const elapsed = Date.now() - ttsStart;
        const pct = Math.min(100, (elapsed / ttsEstimatedMs) * 100);
        progressFill.style.width = `${pct}%`;
    }, 200);
}

function stopTTSProgress() {
    if (ttsInterval) {
        clearInterval(ttsInterval);
        ttsInterval = null;
    }
    if (progressFill) progressFill.style.width = `0%`;
}

// Control play/pause desde el botón principal
mainPlayBtn.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

// Actualizar icono cuando el audio cambia de estado
audio.addEventListener('play', () => { isPlaying = true; updatePlayButton(); });
audio.addEventListener('pause', () => { isPlaying = false; updatePlayButton(); });
audio.addEventListener('ended', () => { isPlaying = false; updatePlayButton(); clearActiveTipButton(); });

// Actualizar barra de progreso
audio.addEventListener('timeupdate', () => {
    if (!audio.duration || !progressFill) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${pct}%`;
});

// Permitir saltar en la barra de progreso
const progressBar = document.querySelector('.progress-bar');
if (progressBar) {
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        if (audio.duration) audio.currentTime = pct * audio.duration;
    });
}

function updatePlayButton() {
    if (isPlaying) {
        mainPlayIcon.classList.remove('fa-play');
        mainPlayIcon.classList.add('fa-pause');
    } else {
        mainPlayIcon.classList.remove('fa-pause');
        mainPlayIcon.classList.add('fa-play');
    }
}

// --- Simple section navigation ---
function showSection(id, event) {
    if (event) event.preventDefault();
    // hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    // update active menu
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    const menuLink = Array.from(document.querySelectorAll('.menu a')).find(a => a.getAttribute('onclick') && a.getAttribute('onclick').includes(`'${id}'`));
    if (menuLink) menuLink.classList.add('active');

    // If we navigated to confesiones, ensure list is visible
    if (id === 'confesiones') {
        // nothing else for now
    }
}

// Form submission: append the story to the confesiones list
function submitStory(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim() || 'Anónimo';
    const story = document.getElementById('story').value.trim();
    if (!story) return;

    const confList = document.getElementById('confesiones-list');
    const article = document.createElement('article');
    article.className = 'conf-card';
    const p = document.createElement('p');
    p.textContent = `"${story}"`;
    const span = document.createElement('span');
    span.className = 'meta';
    span.textContent = `— ${name}`;
    article.appendChild(p);
    article.appendChild(span);
    // add to top
    confList.insertBefore(article, confList.firstChild);

    // persist to localStorage
    try {
        saveStoryToStorage({ name, story, created: Date.now() });
    } catch (e) {
        console.error('Error guardando historia en storage', e);
    }

    // feedback
    const feedback = document.getElementById('story-feedback');
    feedback.textContent = '¡Gracias! Tu historia se ha enviado y aparece en Confesiones.';

    // clear form
    document.getElementById('story-form').reset();

    // navigate to confesiones
    showSection('confesiones');
}

// --- localStorage persistence for stories ---
const STORAGE_KEY_STORIES = 'thebreak_stories_v1';
function saveStoryToStorage(obj) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_STORIES);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(obj); // newest first
        localStorage.setItem(STORAGE_KEY_STORIES, JSON.stringify(arr.slice(0, 200)));
    } catch (e) {
        console.error('Error guardando historia', e);
    }
}

function loadStoredStories() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_STORIES);
        if (!raw) return;
        const arr = JSON.parse(raw);
        const confList = document.getElementById('confesiones-list');
        if (!confList) return;
        arr.forEach(item => {
            const article = document.createElement('article');
            article.className = 'conf-card';
            const p = document.createElement('p');
            p.textContent = `"${item.story}"`;
            const span = document.createElement('span');
            span.className = 'meta';
            span.textContent = `— ${item.name || 'Anónimo'}`;
            article.appendChild(p);
            article.appendChild(span);
            confList.insertBefore(article, confList.firstChild);
        });
    } catch (e) {
        console.error('Error cargando historias desde localStorage', e);
    }
}

// Newsletter subscription
const STORAGE_KEY_NEWS = 'thebreak_news_v1';
function subscribeNewsletter(e) {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const feedback = document.getElementById('newsletter-feedback');
    const email = emailInput.value.trim();
    if (!email) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_NEWS);
        const arr = raw ? JSON.parse(raw) : [];
        if (!arr.includes(email)) arr.push(email);
        localStorage.setItem(STORAGE_KEY_NEWS, JSON.stringify(arr));
        feedback.textContent = '¡Gracias! Te hemos suscrito.';
        emailInput.value = '';
        setTimeout(() => feedback.textContent = '', 4000);
    } catch (err) {
        console.error('Error suscribiendo', err);
        feedback.textContent = 'No se pudo suscribir en este momento.';
    }
}

function loadNewsletterState() {
    const raw = localStorage.getItem(STORAGE_KEY_NEWS);
    const feedback = document.getElementById('newsletter-feedback');
    if (raw && feedback) {
        const arr = JSON.parse(raw);
        if (arr.length) feedback.textContent = `Suscriptores: ${arr.length}`;
    }
}

// Ensure home is visible on load and initialize persisted data
document.addEventListener('DOMContentLoaded', () => {
    showSection('home');
    // set copyright year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    loadStoredStories();
    loadNewsletterState();
    // attach newsletter form handler if present
    const nf = document.getElementById('newsletter-form');
    if (nf) nf.addEventListener('submit', subscribeNewsletter);
    // Initialize lazy-loaded YouTube thumbnails
    initVideoThumbnails();
});

// Lazy-load YouTube embeds: replace thumbnail with iframe on click
function initVideoThumbnails() {
    const items = document.querySelectorAll('.video-item');
    items.forEach(item => {
        // store thumb HTML so we can restore on close
        const thumb = item.innerHTML;
        item.dataset.thumb = thumb;
        // play button: open YouTube in new tab as a reliable fallback
        const playBtn = item.querySelector('.video-play');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = item.dataset.videoId;
                if (!id) return;
                // If user holds Alt (option), embed inline; otherwise open YouTube
                if (e.altKey) {
                    loadVideo(item);
                } else {
                    const url = `https://www.youtube.com/watch?v=${id}`;
                    window.open(url, '_blank', 'noopener');
                }
            });
        }
        // also allow clicking the thumbnail itself to embed when Alt is held
        item.addEventListener('click', (e) => {
            if (e.altKey) loadVideo(item);
        });
    });
}

function loadVideo(item) {
    const id = item.dataset.videoId;
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.src = `https://www.youtube.com/embed/${id}?rel=0&autoplay=1`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    // create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'video-close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Cerrar';
    closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // restore thumbnail
        if (item.dataset.thumb) item.innerHTML = item.dataset.thumb;
        // re-init listeners for this item
        initVideoThumbnails();
    });

    // Clear and insert iframe + close button wrapper
    item.innerHTML = '';
    item.appendChild(iframe);
    item.appendChild(closeBtn);
}