# Git: Git Flow y commits

Fuente: `context/11-flujo-git.md`. Esta regla es obligatoria en cada tarea que modifique archivos.

## Antes de tocar archivos

1. Ejecuta `git branch --show-current` y `git status`.
2. Clasifica el trabajo y elige el tipo de rama:
   `feature/` · `bugfix/` · `docs/` · `refactor/` · `perf/` · `style/` · `chore/` · `ci/` · `build/` · `release/` · `hotfix/`.
   Nombre: `tipo/nombre-descriptivo` en kebab-case, corto, en español (cambios en `context/` o en estas reglas → `docs/`).
3. Si la rama actual no corresponde, créala o cámbiate a ella (`git switch` / `git switch -c`) **antes** de editar. Origen: `hotfix/*` sale de `main`; todas las demás, de `develop`.
4. Si estás en `main`, `develop` o en una rama de otro tema y no puedes cambiar, **no edites nada** y pide el cambio.
5. Si `develop` no existe, créala desde `main` primero.

## Cuándo ejecuta Git el agente

- Solo cuando el desarrollador escriba **`_git`** (usa la skill `git-flow`), el agente **ejecuta** `git add` (solo los archivos del cambio), `git commit`, `git push -u origin HEAD` y `gh pr create`.
- Al terminar una tarea sin `_git`, no hace commit, push ni PR: dice qué cambió y recuerda que `_git` lo publica.
- El PR siempre se redacta con el cuerpo en un archivo y `--body-file` (el desarrollador usa Git Bash; los here-strings de PowerShell fallan).

## Prohibido para el agente

- **Nunca** hace merge de un PR ni lo aprueba: la revisión y el merge son del desarrollador.
- No trabaja directo en `main` ni en `develop`: no hace commit, push ni PR desde ellas. Los `release/*` a `main`, los tags y los `hotfix/*` solo los ejecuta si el desarrollador lo pide de forma explícita para ese caso.
- No usa `--force`, `--no-verify` ni reescribe historia. No agrega `.env`, archivos ajenos al cambio ni `git add .` con archivos ajenos.
- No agrega líneas de atribución a Claude/Anthropic (`Co-Authored-By`, "Generated with Claude Code") en commits ni PR.

## Commits (cuando el desarrollador los pida con `_git`)

- Conventional Commits: `tipo(alcance): descripcion`; descripción en imperativo, sin punto final, primera línea de 50 a 72 caracteres, cuerpo = el *por qué*.
- Tipo según la rama: `feature`→`feat`, `bugfix`/`hotfix`→`fix`, y `docs`, `refactor`, `perf`, `style`, `chore`, `ci`, `build` igual que el prefijo. No existe el tipo `test`.
- Alcances: `api`, `web`, `auth`, `users`, `uploads`, `db`, `shared`, `deps`, `context`, y los de dominio.
- Un solo commit y un solo PR por rama, con mensaje que salga de lo que realmente cambió.
- `context/` viaja con el cambio: si el cambio toca reglas de negocio, su actualización va en el mismo commit.
