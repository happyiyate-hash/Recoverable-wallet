
'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  ArrowLeft, 
  Globe, 
  Database, 
  AlertCircle, 
  CheckCircle2,
  Code
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * FETCH PROTOCOL DEMO
 * Demonstrates the institutional pattern for network requests.
 */
export default function FetchDemoPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestFetch = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    // Using a public placeholder API for the demo handshake
    const response = await apiGet<any>('https://jsonplaceholder.typicode.com/posts/1');

    if (response.error) {
      setError(response.error);
    } else {
      setData(response.data);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground p-6">
      <header className="flex items-center gap-4 mb-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">Fetch Protocol</h1>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Documentation & Handshake Demo</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full space-y-8 pb-20">
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Network Handshake</p>
          <Card className="p-8 bg-white/[0.02] border-white/5 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary">
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Globe className="w-8 h-8" />}
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Public Registry Test</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                Click below to dispatch a standardized GET request using our hardened fetch wrapper.
              </p>
            </div>

            <Button 
              onClick={handleTestFetch} 
              disabled={isLoading}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20"
            >
              {isLoading ? "Executing Handshake..." : "Dispatch Fetch"}
            </Button>
          </Card>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Response Registry</p>
          <div className="space-y-3">
            {error && (
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 animate-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-black text-red-500 uppercase tracking-widest">Protocol Error</p>
                  <p className="text-sm font-bold text-red-400 mt-1">{error}</p>
                </div>
              </div>
            )}

            {data && (
              <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 flex gap-4 animate-in slide-in-from-top-2">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-black text-green-500 uppercase tracking-widest">Registry Data Verified</p>
                  <pre className="mt-4 p-4 rounded-xl bg-black/40 text-[10px] font-mono text-white/60 overflow-auto border border-white/5 max-h-[200px]">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {!data && !error && !isLoading && (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 border border-dashed border-white/10 rounded-[2.5rem]">
                <Database className="w-10 h-10 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Waiting for Signal</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-2">
            <Code className="w-3 h-3 text-primary" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Implementation Standard</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In this terminal, we never use <code className="text-primary font-mono">fetch()</code> raw. We use the <code className="text-white font-bold">apiClient</code> protocol which enforces:
            </p>
            <ul className="text-[10px] space-y-2 text-white/60 font-bold uppercase tracking-widest list-disc pl-4">
              <li>Automatic JSON Serialization</li>
              <li>Status Code Validation (response.ok)</li>
              <li>Try/Catch Network Resilience</li>
              <li>Standardized ApiResponse Object</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
