# 11 — Flujo de trabajo con Git (Git Flow) y commits

El desarrollador hace **todos** los `commit`, `push` y Pull Requests a mano. El agente (Claude Code) **nunca** ejecuta `git commit`, `git push` ni `gh pr create`.

Las reglas operativas del agente están en `.claude/rules/git-flujo.md` y la skill `git-flow`; este archivo es la fuente de la que derivan.

## 1. Ramas principales

| Rama | Rol |
|------|-----|
| `main` | Código en producción. Estable y probado; nunca se trabaja directo en ella |
| `develop` | Rama de integración: aquí se juntan las funcionalidades terminadas antes de pasar a producción |

No se trabaja directo en `main` ni en `develop` (la única excepción fue el commit inicial del repositorio).

## 2. Ramas de soporte

Nombre: `tipo/nombre-descriptivo` en kebab-case, corto y en español.

| Rama | Sale de → vuelve a | Uso | Ejemplo |
|------|--------------------|-----|---------|
| `feature/*` | `develop` → `develop` | Funcionalidad nueva | `feature/registro-otp` |
| `bugfix/*` | `develop` → `develop` | Corregir errores detectados antes de producción | `bugfix/validacion-email` |
| `docs/*` | `develop` → `develop` | Solo documentación (incluye `context/` y reglas) | `docs/actualizar-arquitectura` |
| `refactor/*` | `develop` → `develop` | Reestructurar código sin cambiar su comportamiento | `refactor/extraer-servicio-otp` |
| `perf/*` | `develop` → `develop` | Mejoras de rendimiento específicas | `perf/optimizar-consulta-usuarios` |
| `style/*` | `develop` → `develop` | Formato puro, sin afectar la lógica | `style/aplicar-prettier` |
| `chore/*` | `develop` → `develop` | Mantenimiento que no toca código de producción | `chore/actualizar-dependencias` |
| `ci/*` | `develop` → `develop` | Configuración de integración continua | `ci/agregar-workflow-lint` |
| `build/*` | `develop` → `develop` | Sistema de build o gestión de dependencias | `build/configurar-workspaces` |
| `release/*` | `develop` → `main` y `develop` | Preparar una versión antes de lanzarla | `release/1.2.0` |
| `hotfix/*` | `main` → `main` y `develop` | Error urgente ya en producción | `hotfix/error-login` |

> No hay ramas `test/*` ni commits `test`: el proyecto omite las pruebas automatizadas.

## 3. Pasos del flujo normal

1. Se crea una rama del tipo que corresponda desde `develop`.
2. Se trabaja y se termina el cambio.
3. Se hace merge de esa rama a `develop` mediante Pull Request (revisado por la otra integrante, DoD).
4. Cuando `develop` acumula suficientes cambios listos, se crea `release/*` desde `develop`.
5. En `release` solo se hacen ajustes finales.
6. Al terminar, merge de `release` a `main`, tag de versión, y también merge de `release` a `develop`.
7. Si aparece un error grave en producción, `hotfix/*` desde `main`, se corrige y se hace merge a `main` y a `develop`.

## 4. Convención de commits (Conventional Commits)

```
tipo(alcance opcional): descripcion corta

cuerpo opcional

footer opcional
```

| Tipo | Uso |
|------|-----|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Solo documentación |
| `style` | Formato, sin afectar la lógica |
| `refactor` | Reestructurar código sin cambiar el comportamiento |
| `perf` | Mejoras de rendimiento |
| `chore` | Tareas de mantenimiento |
| `ci` | Configuración de integración continua |
| `build` | Sistema de build o dependencias |

**Alcances sugeridos**: `api`, `web`, `auth`, `users`, `uploads`, `db`, `shared`, `deps`, y los de dominio (`owners`, `patients`, `appointments`, `clinical`, `invoices`, `inventory`), más `context` para cambios de esta carpeta. Ejemplo: `feat(auth): agregar verificacion de OTP`.

Reglas de estilo:

- Descripción en imperativo (*agregar*, no *agregado*) y sin punto final.
- Primera línea de 50 a 72 caracteres.
- El cuerpo explica el **por qué**, no el qué.
- *Breaking changes*: `!` tras el tipo o alcance (`feat(api)!: ...`) y explicación en el footer con `BREAKING CHANGE:`.

## 5. Relación entre ramas y commits

| Rama | Tipo de commit |
|------|----------------|
| `feature/` | `feat` |
| `bugfix/` | `fix` |
| `hotfix/` | `fix` (urgente) |
| `docs/`, `refactor/`, `perf/`, `style/`, `chore/`, `ci/`, `build/` | El mismo tipo que el prefijo |

Al hacer merge de `release` a `main` se agrega un tag SemVer según los commits acumulados: `fix` sube *patch*, `feat` sube *minor*, `BREAKING CHANGE` sube *major*.

## 6. Reglas para el agente (Claude Code)

1. **Antes de tocar archivos**: ejecutar `git branch --show-current` y `git status`, y clasificar el trabajo según la tabla de §2.
2. Si la rama no corresponde, el agente la crea o cambia a ella (`git switch` / `git checkout -b`) **antes** de editar. Origen: `hotfix/*` sale de `main`; todas las demás, de `develop`.
3. Si sigue en `main`, `develop` o en una rama de otro tema y no puede cambiar, **no edita nada** y pide el cambio.
4. Al terminar una tarea, **no** entrega comandos de `git add`, `commit`, `push` ni de PR.
5. Esos comandos se entregan **solo cuando el desarrollador escribe `_git`**. En ese momento el agente revisa todos los cambios de la rama (`git status`, `git diff`, `git diff --staged`, `git diff develop...HEAD`, `git log develop..HEAD` y `git log -8 --oneline` para el estilo) y propone **un** commit y **un** PR cuyo mensaje sale de lo que realmente cambió.
6. Si no hay nada que commitear ni abrir en PR, lo dice en una frase. Si ya está commiteado, entrega solo el push y el PR.

Bloques que entrega el agente al recibir `_git`:

```
# add
git add <archivos>

# commit
git commit -m "tipo(alcance): descripcion"

# push
git push -u origin HEAD

# pr
gh pr create --base develop --title "tipo(alcance): descripcion" --body "<1-2 lineas>"
```

```
# despues de aprobar el PR (borrar local + GitHub y volver a develop)
git checkout develop
git pull origin develop
git branch -d <rama>
git push origin --delete <rama>
```

- `hotfix/*` y el merge de `release/*` a producción usan `--base main`, y después también se hace merge a `develop`.
- Tras un `hotfix/*` o un release, la limpieza hace `checkout` y `pull` de `main` y de `develop` antes de borrar la rama local y la de `origin`.

## 7. Regla adicional: `context/` viaja con el cambio

Cuando un cambio modifica reglas de negocio, requerimientos, modelo, stack o flujo, la actualización de `context/` (y su línea en `CHANGELOG.md`) va **en el mismo commit y la misma rama** que el cambio de código. Un cambio puramente documental de `context/` usa rama `docs/*`.
