import { Suspense } from 'react';
import TokenDetailsClientPage from './token-details-client';
import { Loader2 } from 'lucide-react';

// This is now a SERVER component. Its only job is to provide a Suspense boundary.
export default function TokenDetailsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-transparent">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <TokenDetailsClientPage />
        </Suspense>
    )
}