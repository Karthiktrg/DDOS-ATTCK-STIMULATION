import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Activity, AlertTriangle, ShieldOff, ShieldAlert, Cpu, PowerOff, ActivityIcon, History, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, isLoading, location, setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("ddos_token");
        setLocation("/login");
      }
    });
  };

  if (location === "/login") {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary">
        <Activity className="w-12 h-12 animate-spin" />
        <div className="mt-4 font-mono text-sm tracking-widest">INITIALIZING SECURE LINK...</div>
      </div>
    );
  }

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = location === href;
    return (
      <Link href={href}>
        <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-l-2 transition-all ${
          active ? "bg-primary/10 border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}>
          <Icon className="w-5 h-5" />
          <span className="font-mono text-sm uppercase tracking-wider">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground cyber-grid">
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)"
      }} />

      <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-md flex flex-col z-10">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" />
          <div>
            <div className="font-mono font-bold tracking-widest text-primary leading-tight">AEGIS</div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Defense Grid</div>
          </div>
        </div>
        
        <div className="flex-1 py-6 flex flex-col gap-1">
          <NavItem href="/" icon={ActivityIcon} label="Overwatch" />
          <NavItem href="/alerts" icon={AlertTriangle} label="Alerts" />
          <NavItem href="/incidents" icon={History} label="Incidents" />
          <NavItem href="/blocklist" icon={ShieldOff} label="Blocklist" />
          <NavItem href="/system" icon={Cpu} label="System" />
          <NavItem href="/scanner" icon={Globe} label="Scanner" />
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
            <div className="font-mono text-xs uppercase tracking-widest">
              <div>{user.username}</div>
              <div className="text-muted-foreground text-[10px]">{user.role}</div>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start font-mono text-xs border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <PowerOff className="w-4 h-4 mr-2" />
            DISCONNECT
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 z-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 justify-between shrink-0">
          <div className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            {location === "/" ? "Overwatch / Real-time Telemetry" : 
             location === "/alerts" ? "Alerts / Threat Detection" : 
             location === "/incidents" ? "Incidents / Action Report" :
             location === "/blocklist" ? "Blocklist / Access Control" :
             location === "/scanner" ? "Scanner / URL Threat Analysis" :
             "System / Hardware Health"}
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
              SERVER TIME: <span className="text-foreground">{new Date().toISOString().replace('T', ' ').substring(0, 19)}Z</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
