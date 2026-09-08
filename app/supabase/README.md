# Supabase - Puesta en marcha (Free / Pro)

1. Crear proyecto en https://supabase.com (Free: 500 MB, 50k MAU).
2. Dashboard > Settings > API: copia `Project URL` y `anon public key`.
3. Dashboard > SQL Editor > New query: pega `schema_unified.sql` completo > Run. (Incluye todas las tablas, RLS, lápidas de borrado, configuración y activación de Supabase Realtime por WebSockets).
4. Dashboard > Authentication > Providers > Email: Enable, Confirm email OFF (para probar), Secure password ON.
5. En la app: Configuración > Nube: pega URL y anon key > Guardar > recarga e Inicia sesión con email+password. Nota: crea el usuario en Dashboard > Authentication > Users > Add user si los registros públicos están desactivados.
6. Primera sincronización: los datos locales se sincronizan automáticamente al iniciar sesión.
7. Probar en otro dispositivo (móvil/PC) con mismo email/pass: se conectará en tiempo real vía WebSockets y cualquier cambio se propagará instantáneamente en menos de 1 segundo.

Notas:
- Los datos viajan ya cifrados (`enc:`) con tu misma contraseña (PBKDF2/AES-GCM de js/crypto.js). Supabase no ve texto en claro.
- RLS garantiza que cada usuario solo ve sus filas (`auth.uid() = user_id`).
- La suscripción Realtime actualiza automáticamente todas las vistas de la app en móvil y PC sin necesidad de recargar la página.
- Sin URL/key configurados la app funciona 100% offline.
