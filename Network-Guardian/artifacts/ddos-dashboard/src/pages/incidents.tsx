import { useGetIncidents, useExportIncidents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, History, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function IncidentsPage() {
  const { data: incidents, isLoading } = useGetIncidents({ limit: 100 });
  const exportQuery = useExportIncidents({ query: { enabled: false } });

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        // Create blob link and trigger download. Assuming result.data is text CSV
        const blob = new Blob([result.data as any], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch(sev) {
      case 'critical': return "bg-red-500/20 text-red-500 border-red-500/50";
      case 'high': return "bg-orange-500/20 text-orange-500 border-orange-500/50";
      case 'medium': return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
      case 'low': return "bg-green-500/20 text-green-500 border-green-500/50";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return "bg-red-500/20 text-red-500 animate-pulse";
      case 'mitigated': return "bg-blue-500/20 text-blue-500";
      case 'resolved': return "bg-green-500/20 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold tracking-widest uppercase flex items-center gap-3">
          <History className="w-8 h-8 text-primary" /> Incident History
        </h1>
        <Button onClick={handleExport} variant="outline" className="font-mono text-xs border-primary/50 text-primary hover:bg-primary/10">
          <Download className="w-4 h-4 mr-2" /> EXPORT CSV
        </Button>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-mono text-[10px] uppercase tracking-widest py-4 pl-6">ID / Time</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Source / Target</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Severity</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Peak Volume</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                  </TableCell>
                </TableRow>
              ) : incidents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center font-mono text-sm text-muted-foreground py-8">No incidents recorded</TableCell>
                </TableRow>
              ) : (
                incidents?.map((incident) => (
                  <TableRow key={incident.id} className="border-border hover:bg-muted/50 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-muted-foreground">INC-{incident.id.toString().padStart(4, '0')}</span>
                        <span className="font-mono text-[10px] text-foreground">{new Date(incident.startedAt).toLocaleString()}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{incident.duration}s</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-bold text-foreground">{incident.attackType.replace('_', ' ').toUpperCase()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col font-mono text-xs">
                        <span className="text-destructive flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {incident.sourceIp}</span>
                        <span className="text-muted-foreground">Target: {incident.targetIp || 'Any'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm border ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">({incident.severityScore}/100)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-foreground">{new Intl.NumberFormat('en-US', { notation: "compact" }).format(incident.peakPacketsPerSecond)} pps</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm border-transparent ${getStatusBadge(incident.status)}`}>
                          {incident.status}
                        </Badge>
                        {incident.wasBlocked && (
                          <span className="font-mono text-[9px] text-primary">ACTION: BLOCKED</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
