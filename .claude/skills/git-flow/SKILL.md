---
name: git-flow
description: Flujo de Git de VetCare-Web. Úsala cuando el desarrollador escriba `_git`, pida commit/push/PR, o antes de editar archivos para verificar y crear la rama correcta (Git Flow). Con `_git` el agente ejecuta add, commit, push y gh pr create (nunca el merge).
---

# git-flow

Fuente: `context/11-flujo-git.md` y `.claude/rules/git-flujo.md`.

## A. Antes de editar (siempre)

1. `git branch --show-current` y `git status`.
2. Clasifica el trabajo → tipo de rama (`feature`, `bugfix`, `docs`, `refactor`, `perf`, `style`, `chore`, `ci`, `build`, `release`, `hotfix`). Los cambios en `context/` o `.claude/` son `docs/`.
3. Si la rama no corresponde: `git switch -c tipo/nombre-en-kebab-case` desde `develop` (`hotfix/*` desde `main`). Si `develop` no existe, créala desde `main` primero.
4. Si no puedes cambiar de rama, no edites nada y pide el cambio.

## B. Al terminar una tarea

No hagas commit, push ni PR. Di solo qué cambió y recuerda que `_git` los ejecuta.

## C. Cuando el desarrollador escribe `_git`

1. Revisa **todo** lo de la rama: `git status`, `git diff`, `git diff --staged`, `git diff develop...HEAD`, `git log develop..HEAD`, `git log -8 --oneline` (para imitar el estilo).
2. Si no hay nada que commitear ni abrir en PR, dilo en una frase. Si ya está commiteado, ejecuta solo push y PR.
3. Propón **un** commit y **un** PR cuyo mensaje salga de lo que realmente cambió. Tipo según la rama (`feature`→`feat`, `bugfix`/`hotfix`→`fix`, el resto igual al prefijo). Alcance en `api|web|auth|users|uploads|db|shared|deps|context|<dominio>`. Descripción en imperativo, sin punto final, 50–72 caracteres.
4. Agrega a `git add` **solo** los archivos que pertenecen al cambio (nada de `git add .` si hay archivos ajenos, p. ej. `.claude/settings.local.json`, `.env`).
5. Ejecuta en orden, sin atribución a Claude en el commit ni en el PR, y confirma cada resultado:

```
git add <archivos>
git commit -m "tipo(alcance): descripcion"
git push -u origin HEAD
gh pr create --base develop --title "tipo(alcance): descripcion" --body-file <archivo.md>
```

El cuerpo se escribe antes en un archivo (en el scratchpad) con esta estructura, para que funcione en Git Bash:

```
## Resumen
<2-3 lineas: que se hizo y por que>

## Cambios
- <cambio concreto, agrupado por area: back, front, context, ...>
- <...>

## Referencias
<IDs de context/ (RF-xx, RN-xx, CU-xx, D-xx) o 'Sin cambios de negocio'>

## Como verificar
- <pasos o comandos para comprobar el cambio>

## Notas
<decisiones, impacto en context/, pendientes o riesgos; omitir si no hay>
```

Al terminar, entrega la URL del PR y recuerda que el merge lo hace el desarrollador.

**Cuerpo del PR** (se redacta a partir de `git diff develop...HEAD` y `git log develop..HEAD`, no de memoria):

- Profesional e informativo, pero conciso: entre 10 y 25 líneas en total, sin relleno ni repetir el título.
- Resumen en prosa; Cambios como viñetas de una línea con el *qué* y, si no es obvio, el *por qué*; menciona los archivos o carpetas clave, no una lista exhaustiva.
- Referencias: cita los IDs de `context/` afectados y di si `context/` y `context/CHANGELOG.md` se actualizaron en el mismo cambio.
- Como verificar: pasos reales y ejecutables (sin pruebas automatizadas en este proyecto: comprobación manual, build, lint o typecheck). Si es solo documentación o estructura, indica qué revisar.
- Omite las secciones que no apliquen (p. ej. Notas); el cuerpo va en español, sin emojis.

Después de que el desarrollador apruebe y haga el merge del PR, la limpieza (la ejecuta el agente si se lo piden):

```
git checkout develop
git pull origin develop
git branch -d <rama>
git push origin --delete <rama>
```

- `hotfix/*` y el merge de `release/*` a producción usan `--base main`, y luego también se hace merge a `develop`; la limpieza hace `checkout` y `pull` de `main` y `develop` antes de borrar la rama.
- Si el cambio toca reglas de negocio, confirma que `context/` y `context/CHANGELOG.md` están en el mismo commit.

## Prohibido

Hacer merge o aprobar un PR, `--force`, `--no-verify`, trabajar en `main`/`develop`, atribución a Claude en commits o PR, tipo `test`, y ejecutar git sin que el desarrollador haya escrito `_git`.
