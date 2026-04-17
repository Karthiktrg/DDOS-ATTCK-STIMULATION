import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useScanUrl,
  useSimulateDdos,
  useGetSimulationStatus,
  useStopSimulation,
  getGetSimulationStatusQueryKey,
} from "@workspace/api-client-react";
import { Shield, Search, Zap, AlertTriangle, CheckCircle2, XCircle, Info, StopCircle, Wifi, Globe, Lock, Server, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ATTACK_TYPES = [
  { value: "syn_flood", label: "SYN Flood", description: "Exhausts server connection table" },
  { value: "udp_flood", label: "UDP Flood", description: "Overwhelms ports with UDP packets" },
  { value: "http_flood", label: "HTTP Flood", description: "Floods with HTTP requests" },
  { value: "icmp_flood", label: "ICMP Flood", description: "Ping flood attack" },
  { value: "slowloris", label: "Slowloris", description: "Holds connections open slowly" },
  { value: "dns_amplification", label: "DNS Amplification", description: "Abuses DNS for amplified traffic" },
];

const THREAT_COLORS: Record<string, string> = {
  safe: "text-green-400",
  low: "text-yellow-400",
  medium: "text-orange-400",
  high: "text-red-400",
  critical: "text-red-500",
};

const THREAT_BG: Record<string, string> = {
  safe: "bg-green-500/10 border-green-500/30",
  low: "bg-yellow-500/10 border-yellow-500/30",
  medium: "bg-orange-500/10 border-orange-500/30",
  high: "bg-red-500/10 border-red-500/30",
  critical: "bg-red-600/20 border-red-600/50",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  low: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  medium: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  critical: "bg-red-700/30 text-red-200 border-red-700/50",
};

const SEVERITY_ICONS: Record<string, typeof Info> = {
  info: Info,
  low: AlertTriangle,
  medium: AlertTriangle,
  high: XCircle,
  critical: XCircle,
};

function ScanResultPanel({ result }: { result: NonNullable<ReturnType<typeof useScanUrl>["data"]> }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className={`rounded-lg border p-5 ${THREAT_BG[result.threatLevel] ?? THREAT_BG.safe}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">TARGET ANALYSIS</div>
            <div className="font-mono font-bold text-xl text-foreground">{result.domain}</div>
            {result.resolvedIp && (
              <div className="font-mono text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Server className="w-3 h-3" />
                IP: {result.resolvedIp}
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">THREAT LEVEL</div>
            <div className={`font-mono font-black text-2xl uppercase ${THREAT_COLORS[result.threatLevel]}`}>
              {result.threatLevel}
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-1">Risk Score: {result.riskScore}/100</div>
          </div>
        </div>

        {result.isTargeted && (
          <div className="mt-3 flex items-center gap-2 bg-red-600/30 border border-red-600/60 rounded px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-mono text-xs text-red-300 uppercase tracking-wider font-bold">
              ACTIVE TARGET — This domain is currently under simulated attack
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Detected Threats ({result.detectedThreats.length})
          </div>
          <div className="space-y-2">
            {result.detectedThreats.map((threat, i) => {
              const Icon = SEVERITY_ICONS[threat.severity] ?? Info;
              return (
                <div key={i} className={`flex items-start gap-2 rounded px-3 py-2 border text-xs ${SEVERITY_COLORS[threat.severity] ?? SEVERITY_COLORS.info}`}>
                  <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-mono font-bold uppercase tracking-wider mb-0.5">{threat.type.replace(/_/g, " ")}</div>
                    <div className="text-[11px] leading-relaxed opacity-80">{threat.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Wifi className="w-3 h-3" />
              Open Ports
            </div>
            <div className="flex flex-wrap gap-2">
              {result.openPorts.map((port) => (
                <span key={port} className="font-mono text-xs bg-primary/10 border border-primary/30 text-primary px-2 py-1 rounded">
                  :{port}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Recommendations
            </div>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="font-mono text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">›</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="text-right font-mono text-[10px] text-muted-foreground">
        Scanned at: {new Date(result.scannedAt).toLocaleString()}
      </div>
    </div>
  );
}

function SimulationStatusPanel({ onStop }: { onStop: () => void }) {
  const { data: status } = useGetSimulationStatus({
    query: { refetchInterval: 1000, queryKey: getGetSimulationStatusQueryKey() },
  });

  if (!status?.isActive) return null;

  const pct = status.durationSeconds
    ? Math.round(((status.elapsedSeconds ?? 0) / status.durationSeconds) * 100)
    : 0;

  return (
    <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-5 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,1)]" />
          <span className="font-mono text-sm text-red-300 uppercase tracking-widest font-bold">
            DDoS Simulation Active
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onStop}
          className="font-mono text-xs"
          data-testid="button-stop-simulation"
        >
          <StopCircle className="w-3 h-3 mr-1" />
          ABORT
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono mb-4">
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Target</div>
          <div className="text-foreground font-bold">{status.targetDomain}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Vector</div>
          <div className="text-red-300 font-bold uppercase">{(status.attackType ?? "").replace(/_/g, " ")}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Current PPS</div>
          <div className="text-foreground font-bold">{Math.round(status.currentPps ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Peak PPS</div>
          <div className="text-foreground font-bold">{Math.round(status.peakPps ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Packets Generated</div>
          <div className="text-foreground font-bold">{(status.packetsGenerated ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Remaining</div>
          <div className="text-yellow-400 font-bold">{status.remainingSeconds}s</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-red-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ScannerPage() {
  const [url, setUrl] = useState("");
  const [attackType, setAttackType] = useState("syn_flood");
  const [duration, setDuration] = useState("30");
  const [scanResult, setScanResult] = useState<ReturnType<typeof useScanUrl>["data"] | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scanMutation = useScanUrl();
  const simulateMutation = useSimulateDdos();
  const stopMutation = useStopSimulation();

  const { data: simStatus } = useGetSimulationStatus({
    query: { refetchInterval: 1000, queryKey: getGetSimulationStatusQueryKey() },
  });

  const handleScan = () => {
    if (!url.trim()) {
      toast({ title: "Input required", description: "Enter a URL or domain to scan", variant: "destructive" });
      return;
    }
    setScanResult(null);
    scanMutation.mutate(
      { data: { url: url.trim() } },
      {
        onSuccess: (data) => {
          setScanResult(data);
        },
        onError: () => {
          toast({ title: "Scan failed", description: "Could not analyze the URL", variant: "destructive" });
        },
      }
    );
  };

  const handleSimulate = () => {
    if (!url.trim()) {
      toast({ title: "Input required", description: "Enter a target URL first", variant: "destructive" });
      return;
    }
    simulateMutation.mutate(
      {
        data: {
          targetUrl: url.trim(),
          attackType,
          durationSeconds: parseInt(duration),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSimulationStatusQueryKey() });
          toast({
            title: "Simulation started",
            description: `${attackType.replace(/_/g, " ").toUpperCase()} simulation running against ${url}`,
          });
        },
        onError: () => {
          toast({ title: "Failed to start simulation", variant: "destructive" });
        },
      }
    );
  };

  const handleStop = () => {
    stopMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSimulationStatusQueryKey() });
        toast({ title: "Simulation stopped" });
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Globe className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-mono font-bold text-lg uppercase tracking-widest">URL Threat Scanner</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Analyze any website for threats and run manual DDoS simulations
          </p>
        </div>
      </div>

      {simStatus?.isActive && <SimulationStatusPanel onStop={handleStop} />}

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Search className="w-3 h-3" />
          Target URL
        </div>
        <div className="flex gap-2">
          <Input
            data-testid="input-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            placeholder="https://example.com or example.com"
            className="font-mono text-sm bg-background border-border flex-1"
          />
          <Button
            data-testid="button-scan"
            onClick={handleScan}
            disabled={scanMutation.isPending}
            className="font-mono text-xs shrink-0"
          >
            {scanMutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> SCANNING</>
            ) : (
              <><Search className="w-3 h-3 mr-1" /> SCAN URL</>
            )}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
          <Zap className="w-3 h-3 text-red-400" />
          Manual DDoS Simulation
          <Badge variant="outline" className="ml-1 font-mono text-[10px] border-yellow-500/50 text-yellow-400">
            SIMULATION ONLY — No real traffic sent
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-1">
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              Attack Vector
            </label>
            <Select value={attackType} onValueChange={setAttackType}>
              <SelectTrigger data-testid="select-attack-type" className="font-mono text-xs bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ATTACK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="font-mono text-xs">
                    <span className="font-bold">{t.label}</span>
                    <span className="text-muted-foreground ml-1">— {t.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              Duration (seconds)
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger data-testid="select-duration" className="font-mono text-xs bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {["10", "20", "30", "60", "90", "120"].map((d) => (
                  <SelectItem key={d} value={d} className="font-mono text-xs">
                    {d} seconds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              data-testid="button-simulate"
              variant="destructive"
              onClick={handleSimulate}
              disabled={simulateMutation.isPending || simStatus?.isActive}
              className="w-full font-mono text-xs"
            >
              {simulateMutation.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> LAUNCHING</>
              ) : simStatus?.isActive ? (
                <><Zap className="w-3 h-3 mr-1" /> SIMULATION RUNNING</>
              ) : (
                <><Zap className="w-3 h-3 mr-1" /> LAUNCH SIMULATION</>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ATTACK_TYPES.map((t) => (
            <button
              key={t.value}
              data-testid={`attack-type-${t.value}`}
              onClick={() => setAttackType(t.value)}
              className={`text-left p-3 rounded border font-mono text-xs transition-all ${
                attackType === t.value
                  ? "border-red-500/60 bg-red-500/10 text-red-300"
                  : "border-border bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <div className="font-bold uppercase tracking-wider">{t.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-muted-foreground border-t border-border pt-3">
          <Lock className="w-3 h-3" />
          This simulation generates traffic patterns within this monitoring system only. No packets are sent to the target server.
        </div>
      </div>

      {scanMutation.isPending && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="font-mono text-sm text-muted-foreground">
            Resolving DNS, analyzing threat vectors, scanning ports...
          </div>
        </div>
      )}

      {scanResult && <ScanResultPanel result={scanResult} />}
    </div>
  );
}
