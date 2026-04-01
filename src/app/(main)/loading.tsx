// src/app/(main)/loading.tsx
// Route-level skeleton shown during client-side navigation.
// Next.js uses this automatically when a Suspense boundary suspends.
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
