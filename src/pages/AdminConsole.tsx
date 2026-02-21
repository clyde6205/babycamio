import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  ArrowLeft,
  Users,
  MonitorPlay,
  CreditCard,
  Loader2,
  Shield,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

interface RoomRow {
  id: string;
  room_name: string;
  owner_id: string;
  is_active: boolean;
  room_type: string;
  created_at: string;
}

interface SubRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  payment_provider: string | null;
  current_period_end: string | null;
  created_at: string;
}

const AdminConsole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [stats, setStats] = useState({ users: 0, rooms: 0, activeRooms: 0, proUsers: 0 });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdmin = roles?.some((r: any) => r.role === "admin") ?? false;
      setIsAdmin(hasAdmin);

      if (!hasAdmin) {
        setLoading(false);
        return;
      }

      // Fetch data via edge function (admin-only)
      try {
        const { data, error } = await supabase.functions.invoke("admin-data", {
          body: {},
        });
        if (error) throw error;
        if (data) {
          setProfiles(data.profiles || []);
          setRooms(data.rooms || []);
          setSubscriptions(data.subscriptions || []);
          setStats(data.stats || { users: 0, rooms: 0, activeRooms: 0, proUsers: 0 });
        }
      } catch (err: any) {
        toast({ title: "Error loading data", description: err.message, variant: "destructive" });
      }

      setLoading(false);
    };
    init();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const filteredProfiles = profiles.filter(
    (p: any) => p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.user_id?.includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Founder's Console
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total Users", value: stats.users, icon: Users },
            { label: "Total Rooms", value: stats.rooms, icon: MonitorPlay },
            { label: "Active Now", value: stats.activeRooms, icon: Video },
            { label: "Pro Subscribers", value: stats.proUsers, icon: CreditCard },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users, rooms..."
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users ({profiles.length})</TabsTrigger>
            <TabsTrigger value="rooms">Rooms ({rooms.length})</TabsTrigger>
            <TabsTrigger value="subs">Subscriptions ({subscriptions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="space-y-2">
              {filteredProfiles.map((p: any) => (
                <Card key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.display_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.user_id}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </Card>
              ))}
              {filteredProfiles.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No users found</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="space-y-2">
              {rooms.map((r) => (
                <Card key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {r.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.is_active ? "🟢 Live" : "⚫ Offline"} · {r.room_type} · Owner: {r.owner_id.slice(0, 8)}...
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Card>
              ))}
              {rooms.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No rooms</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subs">
            <div className="space-y-2">
              {subscriptions.map((s) => (
                <Card key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold mr-2 ${
                        s.plan === "pro"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {s.plan.toUpperCase()}
                      </span>
                      {s.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User: {s.user_id.slice(0, 8)}... · {s.payment_provider || "none"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </Card>
              ))}
              {subscriptions.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No subscriptions</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimers management hint */}
        <Card className="mt-8 p-4 bg-muted/30">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Legal Pages
          </h3>
          <p className="text-sm text-muted-foreground">
            Terms of Service, Privacy Policy, and Disclaimer pages are live at{" "}
            <code>/terms</code>, <code>/privacy</code>, and <code>/disclaimer</code>.
          </p>
        </Card>
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io — All Rights Reserved. Founder's Console.
      </footer>
    </div>
  );
};

export default AdminConsole;
