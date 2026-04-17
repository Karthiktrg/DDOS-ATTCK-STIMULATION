import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { AlertsPage } from "@/pages/alerts";
import { BlocklistPage } from "@/pages/blocklist";
import { IncidentsPage } from "@/pages/incidents";
import { SystemPage } from "@/pages/system";
import { ScannerPage } from "@/pages/scanner";

setAuthTokenGetter(() => localStorage.getItem("ddos_token"));

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Layout>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/" component={DashboardPage} />
              <Route path="/alerts" component={AlertsPage} />
              <Route path="/blocklist" component={BlocklistPage} />
              <Route path="/incidents" component={IncidentsPage} />
              <Route path="/system" component={SystemPage} />
              <Route path="/scanner" component={ScannerPage} />
              <Route>
                <div className="flex items-center justify-center h-full font-mono text-xl text-muted-foreground tracking-widest">
                  404 // SECTOR NOT FOUND
                </div>
              </Route>
            </Switch>
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
