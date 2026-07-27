# TimeTrack

Tracker de tiempo por proyectos y tareas. Funciona desde el navegador — los datos se guardan en un repositorio GitHub privado.

## Despliegue en GitHub Pages

### 1. Crear el repositorio

```bash
git init timetrack-app
cd timetrack-app
# copia aquí todos los archivos del proyecto
git add .
git commit -m "TimeTrack inicial"
git remote add origin https://github.com/TU_USUARIO/timetrack-app.git
git push -u origin main
```

### 2. Activar GitHub Pages

En tu repo: **Settings → Pages → Source → Deploy from branch → main / (root)**.

La app quedará en: `https://TU_USUARIO.github.io/timetrack-app/`

### 3. Crear Personal Access Token

GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)** → Generate new token:
- Scope necesario: `repo` (para repos privados) o `public_repo`
- Guarda el token — solo se muestra una vez

### 4. Configurar la app

Abre la app → pestaña **Config**:

| Campo | Valor |
|-------|-------|
| Token | `ghp_xxxxxxxxxxxx` |
| Usuario | tu usuario de GitHub |
| Repositorio | el repo donde quieres guardar los datos (puede ser diferente al que aloja la app) |
| Rama | `main` |
| Ruta JSON | `data/timetrack.json` |

Pulsa **Guardar** y luego **Probar conexión**.

> **Seguridad**: el token se guarda en `localStorage` del navegador — nunca aparece en el código fuente. Si compartes la URL de GitHub Pages, nadie más puede acceder a tus datos sin el token.

## Estructura de archivos

```
timetrack/
├── index.html              ← Entrada
├── css/
│   └── style.css           ← Tema Slate completo
└── js/
    ├── config.js           ← Constantes y tokens de diseño
    ├── state.js            ← Estado global + mutaciones
    ├── helpers.js          ← Utilidades puras (formateo, fechas)
    ← github.js            ← API GitHub (leer/escribir JSON)
    ├── main.js             ← Router, delegación de eventos, init
    └── views/
        ├── register.js     ← Pestaña Registro (timer + manual)
        ├── projects.js     ← Pestaña Proyectos (jerarquía)
        ├── dashboard.js    ← Pestaña Dashboard (KPIs)
        ├── gantt.js        ← Pestaña Gantt (real vs planificado)
        └── settings.js     ← Pestaña Config (GitHub)
```

## Uso en local (desarrollo)

Los ES Modules requieren un servidor HTTP. La forma más rápida:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Luego abre `http://localhost:8080`.

> Abrir `index.html` directamente como `file://` no funciona con ES Modules.
