import { Skeleton } from "@/components/ui/skeleton";

const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsSkeleton;
