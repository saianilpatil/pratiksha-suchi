'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'react-hot-toast';
import { Clock, Users, Mail, CheckCircle, MapPin } from 'lucide-react';

interface QueueEntry {
  id: string;
  position: number;
  name: string;
  email: string;
  service: string;
  status: string;
}

interface TenantData {
  name: string;
  type: string;
}

function PageContent() {
  const searchParams = useSearchParams();
  const tenantParam = searchParams.get('tenant') || '';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantData | null>(null);

  useEffect(() => {
    if (!tenantParam) return;
    
    const fetchQueue = async () => {
      try {
        const res = await fetch(`/api/queue/status?tenant=${tenantParam}`);
        if (res.ok) {
          const data = await res.json();
          setQueue(data.entries || []);
          setTenant(data.tenant);
        }
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };
    
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [tenantParam]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    
    setLoading(true);
    const toastId = toast.loading('Joining queue...');
    
    try {
      const res = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, tenant: tenantParam })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`You are #${data.entry.position} in line!`, { id: toastId });
        setMyEntry(data.entry);
        setName('');
        setEmail('');
        const statusRes = await fetch(`/api/queue/status?tenant=${tenantParam}`);
        const statusData = await statusRes.json();
        setQueue(statusData.entries || []);
      } else {
        toast.error(data.error || 'Something went wrong', { id: toastId });
      }
    } catch (e) {
      toast.error('Network error', { id: toastId });
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Waiting</Badge>;
      case 'checkedin':
        return <Badge className="bg-blue-500">Checked In</Badge>;
      case 'serving':
        return <Badge className="bg-orange-500">Serving</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!tenantParam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Pratiksha Suchi</h1>
          <p className="text-xl text-gray-600 mb-8">The smart waitlist for every business</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <Users className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold">For Any Business</h3>
              <p className="text-sm text-gray-500 mt-1">Doctors, barbers, salons, clinics</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <Mail className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold">Email Notifications</h3>
              <p className="text-sm text-gray-500 mt-1">Customers know their position</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold">Live Updates</h3>
              <p className="text-sm text-gray-500 mt-1">Real-time queue position</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Try a Demo</h2>
            <p className="text-gray-600 mb-4">Visit any business waitlist:</p>
            <code className="block bg-gray-100 p-3 rounded-lg text-sm mb-4">
              localhost:3000?tenant=drvaibhav
            </code>
            <p className="text-sm text-gray-500">
              Or create your own business at <a href="/register" className="text-orange-500 underline">/register</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{tenant?.name || 'Loading...'}</h1>
          <p className="text-sm text-gray-500 capitalize">
            {tenant?.type || 'business'} — Powered by Pratiksha Suchi
          </p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Toaster position="top-center" />
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Live Queue
              </span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {queue.length} waiting
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">No one in line right now!</p>
                <p className="text-sm text-gray-400">Be the first to join</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((entry, idx) => (
                  <div 
                    key={entry.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx === 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg w-8 ${
                        idx === 0 ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        #{entry.position}
                      </span>
                      <div>
                        <span className="font-medium">{entry.name}</span>
                        {entry.service && entry.service !== 'General' && (
                          <span className="text-sm text-gray-500 ml-2">({entry.service})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(entry.status)}
                      {entry.status === 'checkedin' && <MapPin className="w-4 h-4 text-blue-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {!myEntry ? (
          <Card>
            <CardHeader>
              <CardTitle>Join the Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="John Doe" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="john@email.com" 
                    required 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading}
                >
                  {loading ? 'Joining...' : 'Join Queue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500 border-2">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                You are in line!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-6xl font-bold text-green-600 mb-2">
                #{myEntry.position}
              </div>
              <p className="text-gray-600 text-lg">Your position in queue</p>
              <p className="text-sm text-gray-500 mt-2">
                We will email you at <strong>{myEntry.email}</strong> when it is your turn.
              </p>
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Check your inbox for confirmation
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function PublicPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>}>
      <PageContent />
    </Suspense>
  );
}