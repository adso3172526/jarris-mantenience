# Frontend - Sistema de Mantenimiento JARRIS

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Iniciar en modo desarrollo
npm run dev
```

El frontend se ejecutará en `http://localhost:5173`

## 📦 Tecnologías

- **React 18** con TypeScript
- **Vite** - Build tool
- **Ant Design 5** - UI Framework
- **React Router 6** - Routing
- **Axios** - HTTP Client

## 🎨 Tema

Colores corporativos JARRIS:
- **Rojo principal:** `#E60012`
- **Grises profesionales** para textos y fondos

## 🔐 Credenciales de prueba

```
Email: sistemas@jarris.com.co
Password: Admin123*
```

## 📂 Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   └── Layout/          # Layout principal
├── pages/               # Páginas de la aplicación
│   ├── Login/
│   ├── Dashboard/
│   ├── Assets/
│   ├── WorkOrders/
│   └── ...
├── services/            # Servicios API
│   └── api.ts
├── contexts/            # Contextos de React
│   └── AuthContext.tsx
├── config/              # Configuraciones
│   └── theme.ts
├── App.tsx              # Componente principal
└── main.tsx             # Punto de entrada
```

## 🛠️ Comandos disponibles

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## 📝 Notas

- El frontend se conecta al backend en `http://localhost:3000`
- El token JWT se guarda en `localStorage`
- Las rutas están protegidas según roles de usuario
