# Acciones al subir a producción

Checklist de acciones manuales/una-sola-vez que hay que ejecutar cuando se
despliegue por primera vez (o la próxima vez que se sincronice producción
con la rama actual). No son parte del código — no se ejecutan solas.

## 1. Limpiar solicitudes_curso huérfanas

**Por qué:** antes del commit `971a772`, `eliminarCurso` no borraba las
`solicitudes_curso` asociadas al borrar un curso. Eso dejaba filas con
`curso_id` apuntando a un curso que ya no existe. Esas filas huérfanas:

- Seguían contando en `contarAcreditacion` / `contarAprobacionPorBloque`
  (admin, sección Solicitudes) — el marcador de acreditados no se
  reseteaba nunca al borrar y recargar cursos.
- Quedaban invisibles en `misSolicitudes` (KPIs del usuario en Portal),
  porque esa query usa `innerJoin` con `cursos`.
- Resultado: números distintos/inconsistentes entre la vista admin y la
  vista usuario para la misma persona.

El fix de código (`971a772`) evita huérfanas **nuevas**, pero no limpia
las que ya existan en la base de producción. Correr una sola vez, antes o
justo después de desplegar ese commit:

```sql
DELETE sc FROM solicitudes_curso sc
LEFT JOIN cursos c ON sc.curso_id = c.id
WHERE c.id IS NULL;
```

Verificar antes de borrar (opcional, para ver qué se va a afectar):

```sql
SELECT sc.id, sc.user_id, sc.curso_id, sc.estado, sc.calificacion
FROM solicitudes_curso sc
LEFT JOIN cursos c ON sc.curso_id = c.id
WHERE c.id IS NULL;
```

## 2. Configurar llaves de Cloudflare Turnstile (CAPTCHA en registro)

**Por qué:** el registro público (`auth.register`) ahora exige un token de
Turnstile válido. Sin `TURNSTILE_SECRET_KEY` en el servidor, el código
**omite la verificación** (para no romper desarrollo local) — si esto
llega a producción sin la llave puesta, el registro queda sin CAPTCHA real,
sin que nadie se dé cuenta.

Pasos:
1. Crear sitio en el dashboard de Cloudflare Turnstile (gratis).
2. Poner `TURNSTILE_SECRET_KEY` (server, secreta) y
   `VITE_TURNSTILE_SITE_KEY` (client, pública) en el `.env` de producción.
3. Confirmar en logs de arranque que no aparece el warning
   `[turnstile] TURNSTILE_SECRET_KEY no configurada`.

## 3. Verificar DATABASE_URL / variables de entorno de producción

Confirmar `.env` de producción antes del primer deploy real:
`DATABASE_URL`, `JWT_SECRET` (cambiar el de desarrollo), `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`,
`TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`.

## 4. exportarTodos trunca en 10,000 filas

Bug latente documentado en `DEUDA_TECNICA.md` — baja prioridad mientras
el volumen de servidores públicos sea el actual (100-999), pero revisar
antes de que el volumen crezca.
