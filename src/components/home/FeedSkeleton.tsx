import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const FeedSkeleton = () => {
  // Массив с разной шириной для имитации разного контента
  const widths = ["w-full", "w-[90%]", "w-[85%]"];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            {/* Аватар */}
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                {/* Имя пользователя */}
                <Skeleton className="h-4 w-24" />
                {/* Метка времени */}
                <Skeleton className="h-3 w-16 opacity-50" />
              </div>
              
              {/* Многострочный текст поста */}
              <div className="space-y-2">
                <Skeleton className={`h-4 ${widths[i % 3]}`} />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>

          {/* Футер поста (лайки, комментарии) */}
          <div className="flex items-center gap-6 pt-2 border-t border-white/5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default FeedSkeleton;