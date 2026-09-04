# Supabase - Puesta en marcha (Free)

1. Crear proyecto en https://supabase.com (Free: 500 MB, 50k MAU).
2. Dashboard > Settings > API: copia `Project URL` y `anon public key`.
3. Dashboard > SQL Editor > New query: pega `schema.sql` completo > Run.
4. Dashboard > Authentication > Providers > Email: Enable, Confirm email OFF (para probar), Secure password ON.
5. En la app (rama migracion-nube): Configuracion > Nube: pega URL y anon key > Guardar > recarga e Inicia sesion con email+password. Nota: el registro de cuentas nuevas está desactivado (signups OFF); crea el usuario en Dashboard > Authentication > Users > Add user, la app solo hace login.
6. Primera sincronizacion: si ya tenias datos offline, se hace push automatico al iniciar sesion. Verifica en Table Editor que aparecen filas.
7. Probar en otro dispositivo (movil/PC) con mismo email/pass: al iniciar sesion hace pull.

Notas:
- Los datos viajan ya cifrados (`enc:`) con tu misma contrasena (PBKDF2/AES-GCM de js/crypto.js). Supabase no ve texto en claro.
- RLS garantiza que cada usuario solo ve sus filas (`auth.uid() = user_id`).
- Sin URL/key configurados la app funciona 100% offline (no rompe tests).
