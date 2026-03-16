## Setup inicial del proyecto frontend

Guía paso a paso para dejar el entorno listo y poder empezar a desarrollar el frontend Vue 3 + TypeScript del MVP.

---

## 1. Requisitos previos

- **Node.js**: versión LTS (20.x recomendada).
  - Verificar: `node -v`
  - Si usas `nvm-windows`: `nvm use 20`
- **Git** instalado (opcional pero recomendado).
- Editor recomendado: VS Code / Cursor con extensiones:
  - Vue (Volar)
  - ESLint
  - Prettier

---

## 2. Clonar repo y posicionarse en la carpeta

```bash
cd C:\Users\rvaz\projects\multi-tenant
```

Si el proyecto viene de Git:

```bash
git clone <URL_DEL_REPO> multi-tenant
cd multi-tenant
```

---

## 3. Instalar dependencias del proyecto

Desde la raíz del proyecto (`multi-tenant`):

```bash
npm install
```

Esto instala:
- Dependencias de runtime (`vue`, `vue-router`, `pinia`, etc.).
- Dependencias de desarrollo (`vite`, `typescript`, `vue-tsc`, `eslint`, `prettier`, `@vitejs/plugin-vue`, etc.).

---

## 4. Comandos principales de npm

Desde la raíz del proyecto:

- **Arrancar entorno de desarrollo**:
  ```bash
  npm run dev
  ```
  - Abre el navegador en la URL que indica (normalmente `http://localhost:5173`).

- **Build de producción**:
  ```bash
  npm run build
  ```

- **Previsualizar build**:
  ```bash
  npm run preview
  ```

- **Lint de código**:
  ```bash
  npm run lint
  npm run lint:fix     # intenta autocorregir
  ```

- **Formato con Prettier**:
  ```bash
  npm run format
  npm run format:fix   # reescribe archivos con el formato correcto
  ```

---

## 5. Archivos de configuración relevantes

En la raíz del proyecto:

- `package.json`
  - Scripts (`dev`, `build`, `preview`, `lint`, `lint:fix`, `format`, `format:fix`).
  - Lista de dependencias y devDependencies.

- `.prettierrc`
  - Reglas de formato (comillas simples, punto y coma, ancho de línea, etc.).

- `eslint.config.cjs`
  - Configuración base de ESLint (flat config para ESLint 10).

- `.eslintrc.cjs`
  - Config antigua basada en `extends` (se puede ir migrando o eliminar cuando la flat config cubra todo).

---

## 6. Primer arranque y verificación

1. Ejecutar:
   ```bash
   npm run lint
   ```
   - Corregir o revisar los avisos que aparezcan.

2. Ejecutar:
   ```bash
   npm run dev
   ```
   - Confirmar que la app arranca sin errores en consola.

3. Opcional: ejecutar formateo inicial del código:
   ```bash
   npm run format:fix
   ```

---

## 7. Siguiente paso: empezar a desarrollar

Con el entorno listo:

- Seguir el documento `FRONTEND_PLAN_DE_ACCION.md` para:
  - Reorganizar la estructura de `src` según la arquitectura definida.
  - Configurar router, Pinia y módulos `public` y `admin`.
  - Implementar los flujos de tienda y panel de administración, integrando contra la API descrita en `API_MVP_CONTRACT.md`.

