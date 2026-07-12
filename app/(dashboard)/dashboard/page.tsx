'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Users, 
  Play, 
  Clock, 
  Mail,
  AlertCircle,
  RefreshCw,
  LogIn,
  CheckCircle,
  MapPin,
  Trash2,
  ArrowRight
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  checkedin: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-orange-100 text-orange-800 border-orange-300',
  served: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  checkedin: 'Checked In',
  serving: 'Serving',
  served: 'Served',
  cancelled: 'Cancelled',
};

const STATUS_FLOW: Record<string, string[]> = {
  waiting: ['checkedin', 'cancelled'],
  checkedin: ['serving', 'cancelled'],
  serving: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const stored = localStorage.getItem('pratiksha_admin');
    if (!stored) {
      router.push('/login');
      return;
    }
    const t = JSON.parse(stored);
    setTenant(t);
  }, [router]);

  useEffect(() => {
    if (!tenant) return;
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [tenant]);

  const fetchQueue = async () => {
    if (!tenant) return;
    try {
      const allRes = await fetch(`/api/queue/all?tenant=${tenant.subdomain}`);
      if (allRes.ok) {
        const allData = await allRes.json();
        setQueue(allData.entries || []);
      }
    } catch (e) {
      console.error('Fetch queue error:', e);
    }
  };

  const handleStatusChange = async (entryId: string, newStatus: string) => {
    if (!tenant) return;
    setActionLoading(entryId);
    
    try {
      const res = await fetch('/api/queue/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, newStatus, tenant: tenant.subdomain })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`, { duration: 2000 });
        setQueue(data.queue);
      } else {
        toast.error(data.error || 'Failed to update', { duration: 2000 });
      }
    } catch (e) {
      toast.error('Network error', { duration: 2000 });
    }
    setActionLoading(null);
  };

  const filteredQueue = filter === 'all' 
    ? queue 
    : queue.filter(e => e.status === filter);

  const stats = {
    waiting: queue.filter(e => e.status === 'waiting').length,
    checkedin: queue.filter(e => e.status === 'checkedin').length,
    serving: queue.filter(e => e.status === 'serving').length,
    served: queue.filter(e => e.status === 'served').length,
    total: queue.length,
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <LogIn className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to access your dashboard</p>
          <Button className="mt-4 bg-orange-500" onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Waiting</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Checked In</p>
            <p className="text-2xl font-bold text-blue-600">{stats.checkedin}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Serving</p>
            <p className="text-2xl font-bold text-orange-600">{stats.serving}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Served</p>
            <p className="text-2xl font-bold text-green-600">{stats.served}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Total Today</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'waiting', 'checkedin', 'serving', 'served', 'cancelled'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter === s ? 'bg-gray-800' : ''}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={fetchQueue}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue Management</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQueue.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No entries in this category</p>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((entry) => (
                <div 
                  key={entry.id}
                  className="border rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-sm text-gray-500">{entry.email}</p>
                        {entry.service && entry.service !== 'General' && (
                          <Badge variant="outline" className="text-xs mt-1">{entry.service}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${STATUS_COLORS[entry.status]} border`}>
                        {STATUS_LABELS[entry.status]}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        #{entry.position}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span>Joined: {new Date(entry.joinedAt).toLocaleTimeString()}</span>
                    {entry.checkedInAt && (
                      <span className="text-blue-600">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Checked in: {new Date(entry.checkedInAt).toLocaleTimeString()}
                      </span>
                    )}
                    {entry.servedAt && (
                      <span className="text-green-600">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Done: {new Date(entry.servedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {STATUS_FLOW[entry.status]?.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === entry.id}
                        onClick={() => handleStatusChange(entry.id, nextStatus)}
                        className={nextStatus === 'cancelled' ? 'text-red-600 border-red-300 hover:bg-red-50' : ''}
                      >
                        {nextStatus === 'checkedin' && <MapPin className="w-3 h-3 mr-1" />}
                        {nextStatus === 'serving' && <Play className="w-3 h-3 mr-1" />}
                        {nextStatus === 'served' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {nextStatus === 'cancelled' && <Trash2 className="w-3 h-3 mr-1" />}
                        Mark {STATUS_LABELS[nextStatus]}
                      </Button>
                    ))}
                    {entry.status === 'waiting' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === entry.id}
                        onClick={() => handleStatusChange(entry.id, 'serving')}
                        className="bg-orange-50 border-orange-300 text-orange-700"
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Skip to Serving
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}