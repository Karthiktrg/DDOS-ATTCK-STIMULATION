import { useState } from "react";
import { useGetBlocklist, useBlockIp, useUnblockIp } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldOff, Search, Plus, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function BlocklistPage() {
  const [search, setSearch] = useState("");
  const [ipToBlock, setIpToBlock] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blocklist, isLoading } = useGetBlocklist();
  const blockMutation = useBlockIp();
  const unblockMutation = useUnblockIp();

  const handleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipToBlock) return;
    
    blockMutation.mutate({ data: { ip: ipToBlock, reason: reason || "Manual block" } }, {
      onSuccess: () => {
        toast({ title: "IP Blocked", description: `${ipToBlock} added to blocklist.` });
        setIpToBlock("");
        setReason("");
        queryClient.invalidateQueries({ queryKey: ["/api/blocklist"] });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: "Failed to block IP." });
      }
    });
  };

  const handleUnblock = (id: number, ip: string) => {
    unblockMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "IP Unblocked", description: `${ip} removed from blocklist.` });
        queryClient.invalidateQueries({ queryKey: ["/api/blocklist"] });
      }
    });
  };

  const filtered = blocklist?.filter(b => b.ip.includes(search) || b.reason.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold tracking-widest uppercase flex items-center gap-3">
          <ShieldOff className="w-8 h-8 text-primary" /> Active Blocklist
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card/50 backdrop-blur-sm md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Manual Block</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBlock} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-xs text-muted-foreground uppercase">IP Address</label>
                <Input 
                  placeholder="192.168.1.1" 
                  className="font-mono border-border bg-background" 
                  value={ipToBlock}
                  onChange={(e) => setIpToBlock(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-xs text-muted-foreground uppercase">Reason</label>
                <Input 
                  placeholder="Suspicious activity" 
                  className="font-mono border-border bg-background"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={blockMutation.isPending} className="w-full font-mono font-bold tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> ENFORCE BLOCK
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Blocked Entries</CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search IPs..." 
                className="pl-9 font-mono text-xs h-8 bg-background border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">IP Address</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Reason / Attack</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Source</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Blocked At</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center font-mono text-xs py-8 text-muted-foreground">No blocked IPs found</TableCell>
                    </TableRow>
                  ) : (
                    filtered?.map((b) => (
                      <TableRow key={b.id} className="border-border hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm text-primary font-bold">{b.ip}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{b.reason}</span>
                            {b.attackType && <span className="font-mono text-[10px] text-destructive uppercase">{b.attackType}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {b.autoBlocked ? (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AI ENGINE</span>
                          ) : (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">MANUAL</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(b.blockedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleUnblock(b.id, b.ip)}
                            className="font-mono text-[10px] text-muted-foreground hover:text-green-500 hover:bg-green-500/10 h-7"
                          >
                            <Unlock className="w-3 h-3 mr-1" /> UNBLOCK
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
