import { useGetTrafficSnapshot, useGetTrafficHistory, useGetTopIps, useGetProtocolDistribution, useGetAlerts, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ShieldAlert, Activity, ArrowDownUp, Shield, ArrowUpRight, ArrowDownRight, BrainCircuit, Globe, Zap, AlertTriangle } from "lucide-react";

export function DashboardPage() {
  const { data: snapshot } = useGetTrafficSnapshot({ query: { refetchInterval: 2000 } });
  const { data: history } = useGetTrafficHistory({ minutes: 30 }, { query: { refetchInterval: 5000 } });
  const { data: topIps } = useGetTopIps({ query: { refetchInterval: 5000 } });
  const { data: protocols } = useGetProtocolDistribution({ query: { refetchInterval: 5000 } });
  const { data: stats } = useGetDashboardStats({ query: { refetchInterval: 10000 } });
  const { data: alerts } = useGetAlerts({ limit: 5 }, { query: { refetchInterval: 5000 } });

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);

  const threatColor = {
    normal: "text-green-500 border-green-500/20 bg-green-500/10",
    elevated: "text-yellow-500 border-yellow-500/20 bg-yellow-500/10",
    high: "text-orange-500 border-orange-500/20 bg-orange-500/10",
    critical: "text-red-500 border-red-500/20 bg-red-500/10",
  }[snapshot?.threatLevel || "normal"];

  const threatGlow = {
    normal: "glow-normal",
    elevated: "glow-elevated",
    high: "glow-high",
    critical: "glow-critical pulse-critical",
  }[snapshot?.threatLevel || "normal"];

  const aiColor = {
    monitoring: "text-green-500",
    analyzing: "text-blue-500",
    detecting: "text-yellow-500",
    blocking: "text-red-500 animate-pulse",
  }[snapshot?.aiStatus || "monitoring"];

  return (
    <div className={`space-y-6 ${snapshot?.threatLevel === 'critical' ? 'pulse-critical' : ''}`}>
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-border bg-card/50 backdrop-blur-sm ${threatGlow}`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Threat Level</p>
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-5 h-5 ${threatColor.split(' ')[0]}`} />
                  <span className={`font-mono text-2xl font-bold uppercase tracking-wider ${threatColor.split(' ')[0]}`}>
                    {snapshot?.threatLevel || "ANALYZING"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Traffic / Sec</p>
                <div className="flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="font-mono text-2xl font-bold tracking-wider">
                    {formatNumber(snapshot?.packetsPerSecond || 0)} <span className="text-sm text-muted-foreground">pps</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Bandwidth</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4 text-green-500" />
                    <span className="font-mono font-bold">{formatNumber(snapshot?.inboundBandwidthMbps || 0)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Mb/s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4 text-blue-500" />
                    <span className="font-mono font-bold">{formatNumber(snapshot?.outboundBandwidthMbps || 0)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Mb/s</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">AI Engine</p>
                <div className="flex items-center gap-2">
                  <BrainCircuit className={`w-5 h-5 ${aiColor}`} />
                  <span className={`font-mono text-lg font-bold uppercase tracking-wider ${aiColor}`}>
                    {snapshot?.aiStatus || "INIT"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Live Telemetry (30m)</CardTitle>
            <div className="flex gap-4 font-mono text-[10px] uppercase">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-primary rounded-full"></div> Total Traffic</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Suspicious</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Attack</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {history && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAttack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      fontFamily="monospace"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      fontFamily="monospace"
                      tickFormatter={formatNumber}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0', fontFamily: 'monospace', fontSize: '12px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                    />
                    <Area type="monotone" dataKey="packetsPerSecond" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="attackCount" stroke="#ef4444" fillOpacity={1} fill="url(#colorAttack)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="suspiciousCount" stroke="#eab308" fill="transparent" strokeDasharray="4 4" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Protocols */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Protocol Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full relative">
              {protocols && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={protocols}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      isAnimationActive={false}
                    >
                      {protocols.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'monospace' }}
                      formatter={(val: number) => formatNumber(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <Globe className="w-6 h-6 text-muted-foreground mb-1" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {protocols?.map(p => (
                <div key={p.protocol} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-mono text-[10px] font-bold">{p.protocol}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top IPs */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Top Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topIps?.map((ip, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">{ip.ip}</span>
                      {ip.classification === 'attack' && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-500 border border-red-500/30">ATTACK</span>}
                      {ip.classification === 'suspicious' && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">SUSPICIOUS</span>}
                      {ip.isBlocked && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">BLOCKED</span>}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground mt-1">{ip.country}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="font-mono text-sm">{formatNumber(ip.requestsPerSecond)} req/s</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{formatNumber(ip.bytesCount / 1024 / 1024)} MB</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts Feed */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Active Threats</CardTitle>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">Total Prevented Today: <span className="text-primary font-bold">{stats?.attacksPrevented || 0}</span></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-2">
              {alerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">NO ACTIVE THREATS</div>
              ) : (
                alerts?.map((alert) => (
                  <div key={alert.id} className="relative p-3 border-l-2 bg-background/50 flex gap-4" style={{
                    borderColor: alert.severity === 'critical' ? 'hsl(0, 84%, 60%)' : alert.severity === 'high' ? 'hsl(24, 95%, 53%)' : alert.severity === 'medium' ? 'hsl(45, 93%, 47%)' : 'hsl(215, 20%, 65%)'
                  }}>
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{
                      color: alert.severity === 'critical' ? 'hsl(0, 84%, 60%)' : alert.severity === 'high' ? 'hsl(24, 95%, 53%)' : alert.severity === 'medium' ? 'hsl(45, 93%, 47%)' : 'hsl(215, 20%, 65%)'
                    }} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-sm text-foreground">{alert.type.replace('_', ' ').toUpperCase()}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-mono text-[10px] uppercase bg-muted px-2 py-0.5 rounded">SRC: {alert.sourceIp}</span>
                        {alert.autoBlocked && (
                          <span className="font-mono text-[10px] uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded flex items-center gap-1">
                            <Shield className="w-3 h-3" /> AUTO-BLOCKED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
