import { motion } from "framer-motion";
import { LucideIcon, ChevronRight } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
  index: number;
}

const StatsCard = ({ icon: Icon, label, value, color, onClick, index }: StatsCardProps) => {
  const isClickable = !!onClick;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={isClickable ? { scale: 1.02, y: -2 } : undefined}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`glass rounded-xl p-4 flex items-center gap-4 transition-colors ${isClickable ? 'hover:bg-muted/30 cursor-pointer group' : ''}`}
    >
      <motion.div 
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <motion.div 
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold"
        >
          {value}
        </motion.div>
      </div>
      {isClickable && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default StatsCard;
