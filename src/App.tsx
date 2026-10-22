import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/lib/ThemeProvider'
import { isSupabaseConfigured } from '@/lib/supabase'
import { AuthProvider } from '@/auth/AuthProvider'
import { RequireAdmin, RequireAuth } from '@/auth/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CompanyDetailPage } from '@/pages/CompanyDetailPage'
import { ContactDetailPage } from '@/pages/ContactDetailPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupNotice } from '@/pages/SetupNotice'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {isSupabaseConfigured ? (
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/cambiar-clave" element={<ChangePasswordPage />} />

                  <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="contactos" element={<ContactsPage />} />
                      <Route path="contactos/:id" element={<ContactDetailPage />} />
                      <Route path="empresas" element={<CompaniesPage />} />
                      <Route path="empresas/:id" element={<CompanyDetailPage />} />
                      <Route path="pipeline" element={<PlaceholderPage title="Pipeline" description="Oportunidades por etapa." phase={2} />} />
                      <Route path="tareas" element={<PlaceholderPage title="Tareas" description="Llamadas, reuniones y pendientes." phase={3} />} />
                      <Route path="reportes" element={<PlaceholderPage title="Reportes" description="Embudo, ventas y origen de leads." phase={5} />} />
                      <Route element={<RequireAdmin />}>
                        <Route path="ajustes" element={<SettingsPage />} />
                      </Route>
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Route>
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        ) : (
          <SetupNotice />
        )}
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
