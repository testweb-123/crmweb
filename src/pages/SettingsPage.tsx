import { useSearchParams } from 'react-router-dom'
import { UsersPanel } from '@/features/profiles/UsersPanel'
import { TagsPanel } from '@/features/tags/TagsPanel'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = ['usuarios', 'etiquetas'] as const

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab = TABS.find((t) => t === requested) ?? 'usuarios'

  return (
    <>
      <PageHeader title="Ajustes" description="Usuarios, roles y etiquetas del CRM." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v as string }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="pt-2"><UsersPanel /></TabsContent>
        <TabsContent value="etiquetas" className="pt-2"><TagsPanel /></TabsContent>
      </Tabs>
    </>
  )
}
