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

## Prohibido para el agente

- **Nunca** ejecutes `git commit`, `git push` ni `gh pr create` (ni `git add` como entrega final), aunque la tarea esté terminada.
- No entregues comandos de `add`/`commit`/`push`/PR al terminar una tarea. Solo cuando el desarrollador escriba **`_git`** (usa la skill `git-flow`).
- No trabajes directo en `main` ni en `develop`. No uses `--force`, `--no-verify` ni reescribas historia.

## Commits (cuando el desarrollador los pida con `_git`)

- Conventional Commits: `tipo(alcance): descripcion`; descripción en imperativo, sin punto final, primera línea de 50 a 72 caracteres, cuerpo = el *por qué*.
- Tipo según la rama: `feature`→`feat`, `bugfix`/`hotfix`→`fix`, y `docs`, `refactor`, `perf`, `style`, `chore`, `ci`, `build` igual que el prefijo. No existe el tipo `test`.
- Alcances: `api`, `web`, `auth`, `users`, `uploads`, `db`, `shared`, `deps`, `context`, y los de dominio.
- Un solo commit y un solo PR por rama, con mensaje que salga de lo que realmente cambió.
- `context/` viaja con el cambio: si el cambio toca reglas de negocio, su actualización va en el mismo commit.
