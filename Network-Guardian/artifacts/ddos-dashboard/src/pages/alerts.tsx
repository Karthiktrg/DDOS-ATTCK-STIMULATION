import { useState } from "react";
import { useGetAlerts, useAcknowledgeAlert } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ShieldOff, ShieldAlert, Crosshair, Server } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

export function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useGetAlerts(
    { limit: 50, severity: severityFilter !== "all" ? severityFilter as any : undefined },
    { query: { refetchInterval: 5000 } }
  );

  const ackMutation = useAcknowledgeAlert();

  const handleAcknowledge = (id: number) => {
    ackMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      }
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500 border-red-500/50 bg-red-500/10";
      case "high": return "text-orange-500 border-orange-500/50 bg-orange-500/10";
      case "medium": return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
      case "low": return "text-green-500 border-green-500/50 bg-green-500/10";
      default: return "text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold tracking-widest uppercase">Threat Alerts</h1>
        <div className="w-48">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="font-mono text-xs border-border bg-card">
              <SelectValue placeholder="Filter by Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL SEVERITIES</SelectItem>
              <SelectItem value="critical">CRITICAL</SelectItem>
              <SelectItem value="high">HIGH</SelectItem>
              <SelectItem value="medium">MEDIUM</SelectItem>
              <SelectItem value="low">LOW</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : alerts?.length === 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-4 text-green-500/50" />
              <p className="font-mono text-sm tracking-widest uppercase">No Active Alerts</p>
            </CardContent>
          </Card>
        ) : (
          alerts?.map((alert) => (
            <Card key={alert.id} className={`border-l-4 bg-card/50 backdrop-blur-sm transition-all ${
              alert.severity === 'critical' ? 'border-l-red-500' : 
              alert.severity === 'high' ? 'border-l-orange-500' : 
              alert.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            } ${!alert.isAcknowledged && alert.severity === 'critical' ? 'animate-pulse' : ''}`}>
              <CardContent className="p-4 flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold px-2 py-1 uppercase border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <h3 className="font-mono font-bold text-lg">{alert.type.replace('_', ' ').toUpperCase()}</h3>
                    <div className="flex-1" />
                    <span className="font-mono text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <p className="font-mono text-sm text-foreground/80">{alert.message}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Crosshair className="w-4 h-4" />
                      SRC: <span className="text-primary font-bold">{alert.sourceIp}</span>
                    </div>
                    {alert.targetPort && (
                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <Server className="w-4 h-4" />
                        PORT: <span className="text-foreground font-bold">{alert.targetPort}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">SCORE:</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full" style={{ 
                          width: `${alert.severityScore}%`,
                          backgroundColor: alert.severityScore > 80 ? 'hsl(0, 84%, 60%)' : alert.severityScore > 50 ? 'hsl(24, 95%, 53%)' : 'hsl(45, 93%, 47%)'
                        }} />
                      </div>
                      <span className="font-mono text-xs font-bold">{alert.severityScore}</span>
                    </div>
                    {alert.autoBlocked && (
                      <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/50">
                        <ShieldAlert className="w-3 h-3 mr-1" /> AUTO-BLOCKED
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-l border-border pl-6 min-w-[140px]">
                  {alert.isAcknowledged ? (
                    <Button disabled variant="outline" className="w-full font-mono text-xs border-green-500/20 text-green-500 bg-green-500/5">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> ACK'D
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={ackMutation.isPending}
                      variant="outline" 
                      className="w-full font-mono text-xs hover:bg-primary/20 hover:text-primary hover:border-primary/50"
                    >
                      ACKNOWLEDGE
                    </Button>
                  )}
                  {!alert.autoBlocked && (
                     <Button variant="outline" className="w-full font-mono text-xs border-destructive/20 text-destructive hover:bg-destructive/20">
                       <ShieldOff className="w-4 h-4 mr-2" /> BLOCK IP
                     </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
