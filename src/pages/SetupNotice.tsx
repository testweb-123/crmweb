import { AuthShell } from '@/components/layout/AuthShell'

/** Se muestra cuando faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
export function SetupNotice() {
  return (
    <AuthShell title="Falta configurar Supabase" description="La app no sabe a qué base de datos conectarse.">
      <ol className="list-decimal space-y-2 pl-4 text-sm">
        <li>Copia <code className="rounded bg-muted px-1">.env.example</code> como <code className="rounded bg-muted px-1">.env.local</code>.</li>
        <li>Pega la URL y la clave <em>anon</em> del proyecto (Supabase → Project Settings → API).</li>
        <li>Reinicia <code className="rounded bg-muted px-1">npm run dev</code>.</li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">En Cloudflare Pages, define las mismas variables en Settings → Environment variables.</p>
    </AuthShell>
  )
}
