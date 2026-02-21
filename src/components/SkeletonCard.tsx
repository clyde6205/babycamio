import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Reusable skeleton loader for cards throughout the app */
export const SkeletonCard = () => (
  <Card className="p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-4 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 flex-1" />
    </div>
  </Card>
);

export const SkeletonStats = () => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="p-4 text-center space-y-2">
        <Skeleton className="h-6 w-6 mx-auto rounded-full" />
        <Skeleton className="h-8 w-16 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </Card>
    ))}
  </div>
);

export const SkeletonChart = () => (
  <Card className="p-4 space-y-3">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-48 w-full rounded-lg" />
  </Card>
);

export const SkeletonRoomList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonCard;
