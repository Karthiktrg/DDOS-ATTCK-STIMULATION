import { useGetSystemHealth } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Database, Network, Server, HardDrive, BrainCircuit, Activity } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export function SystemPage() {
  const { data: health } = useGetSystemHealth({ query: { refetchInterval: 5000 } });

  const Gauge = ({ value, label, icon: Icon, color }: { value: number, label: string, icon: any, color: string }) => {
    const data = [{ name: label, value: value, fill: color }];
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm flex flex-col items-center justify-center p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/50 z-0"></div>
        <div className="z-10 w-full flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
          </div>
          <span className="font-mono text-xl font-bold" style={{ color }}>{value}%</span>
        </div>
        <div className="h-[120px] w-full z-10">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="100%" innerRadius="70%" outerRadius="100%" barSize={10} data={data} startAngle={180} endAngle={0}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={5} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };

  const StatusIndicator = ({ status, label, value }: { status: string, label: string, value: string }) => {
    let colorClass = "text-muted-foreground bg-muted border-border";
    if (status === 'up' || status === 'active' || status === 'connected' || status === 'loaded') {
      colorClass = "text-green-500 bg-green-500/10 border-green-500/30 glow-normal";
    } else if (status === 'degraded' || status === 'loading') {
      colorClass = "text-yellow-500 bg-yellow-500/10 border-yellow-500/30 glow-elevated";
    } else if (status === 'down' || status === 'error' || status === 'disconnected') {
      colorClass = "text-red-500 bg-red-500/10 border-red-500/30 glow-critical";
    }

    return (
      <div className="flex items-center justify-between p-4 border border-border bg-background/50 rounded-md">
        <span className="font-mono text-sm text-muted-foreground tracking-widest uppercase">{label}</span>
        <div className={`px-3 py-1 font-mono text-xs font-bold uppercase rounded border ${colorClass}`}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold tracking-widest uppercase flex items-center gap-3">
          <Server className="w-8 h-8 text-primary" /> System Telemetry
        </h1>
        <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-500 animate-pulse" /> SYSTEM ONLINE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Gauge value={health?.cpuUsagePercent || 0} label="CPU Load" icon={Cpu} color={health?.cpuUsagePercent > 85 ? '#ef4444' : 'hsl(var(--primary))'} />
        <Gauge value={health?.memoryUsagePercent || 0} label="Memory" icon={HardDrive} color={health?.memoryUsagePercent > 90 ? '#ef4444' : 'hsl(var(--primary))'} />
        
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 h-full flex flex-col justify-center gap-4">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-primary" />
              <div>
                <div className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Packet Drop Rate</div>
                <div className="font-mono text-3xl font-bold text-foreground">{(health?.packetDropRate || 0).toFixed(4)}%</div>
              </div>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min((health?.packetDropRate || 0) * 100, 100)}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Engine Statuses</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusIndicator 
            label="Network Interface" 
            status={health?.networkInterfaceStatus || 'down'} 
            value={health?.networkInterfaceStatus || 'UNKNOWN'} 
          />
          <StatusIndicator 
            label="Capture Engine" 
            status={health?.captureEngineStatus || 'error'} 
            value={health?.captureEngineStatus || 'UNKNOWN'} 
          />
          <StatusIndicator 
            label="AI Inference Model" 
            status={health?.aiModelStatus || 'error'} 
            value={health?.aiModelStatus || 'UNKNOWN'} 
          />
          <StatusIndicator 
            label="Telemetry Database" 
            status={health?.databaseStatus || 'error'} 
            value={health?.databaseStatus || 'UNKNOWN'} 
          />
        </CardContent>
      </Card>

      <div className="font-mono text-[10px] text-muted-foreground text-center">
        LAST MODEL UPDATE: {health?.lastModelUpdateAt ? new Date(health.lastModelUpdateAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
