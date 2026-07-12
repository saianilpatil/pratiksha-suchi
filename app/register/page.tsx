'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast, Toaster } from 'react-hot-toast';
import { Store, Mail, Lock, Link } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const data = {
      name: formData.get('name') as string,
      subdomain: formData.get('subdomain') as string,
      type: formData.get('type') as string,
      ownerEmail: formData.get('ownerEmail') as string,
      password: formData.get('password') as string,
    };

    if (!data.name || !data.subdomain || !data.ownerEmail || !data.password) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating your business...');

    try {
      const res = await fetch('/api/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(
          `Created! Your waitlist: localhost:3000?tenant=${data.subdomain}`,
          { id: toastId, duration: 5000 }
        );
        localStorage.setItem('pratiksha_admin', JSON.stringify(result.tenant));
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        toast.error(result.error || 'Failed to create', { id: toastId });
      }
    } catch (e) {
      toast.error('Network error', { id: toastId });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Toaster position="top-center" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Create Your Business</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Set up your Pratiksha Suchi waitlist in seconds
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Business Name</label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  name="name"
                  placeholder="Dr. Vaibhav Patil"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subdomain</label>
              <div className="relative">
                <Link className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  name="subdomain"
                  placeholder="drvaibhav"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Your URL: <code className="bg-gray-100 px-1 rounded">yourname.pratikshasuchi.com</code>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Business Type</label>
              <select 
                name="type" 
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                required
              >
                <option value="general">General</option>
                <option value="doctor">Doctor / Clinic</option>
                <option value="barber">Barber</option>
                <option value="salon">Salon</option>
                <option value="restaurant">Restaurant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email (for login)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  name="ownerEmail"
                  type="email"
                  placeholder="you@business.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create My Waitlist'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-orange-500 hover:underline">
                Login here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}