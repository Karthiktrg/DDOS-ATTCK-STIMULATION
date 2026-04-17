import { ShieldAlert, Terminal } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("ddos_token", data.token);
          queryClient.invalidateQueries();
          setLocation("/");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "ACCESS DENIED",
            description: "Invalid credentials provided.",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid relative overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />
      
      <div className="w-full max-w-md p-8 border border-border bg-card/80 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full border border-primary/50 flex items-center justify-center bg-primary/10 mb-4 text-primary">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-primary">AEGIS SECURE</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest mt-2 uppercase">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Identity
              </label>
              <Input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="font-mono bg-background/50 border-border focus-visible:ring-primary focus-visible:border-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Passphrase
              </label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                className="font-mono bg-background/50 border-border focus-visible:ring-primary focus-visible:border-primary"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full font-mono font-bold tracking-widest uppercase bg-primary hover:bg-primary/80 text-primary-foreground border border-primary/50"
          >
            {loginMutation.isPending ? "Authenticating..." : "Initialize Link"}
          </Button>
        </form>
        
        <div className="mt-8 pt-4 border-t border-border/50 text-center">
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            System monitored and recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
