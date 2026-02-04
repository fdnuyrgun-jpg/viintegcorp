import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreatePostInputProps {
  userName: string;
  userAvatar?: string;
  onSubmit: (content: string) => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const CreatePostInput = ({ userName, userAvatar, onSubmit }: CreatePostInputProps) => {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ scale: isFocused ? 1.01 : 1 }}
      className={`glass rounded-xl p-4 transition-shadow duration-300 ${
        isFocused ? 'ring-2 ring-primary/50 shadow-xl' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Аватар с градиентом */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0 text-primary-foreground">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            getInitials(userName)
          )}
        </div>

        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Что нового? Поделитесь с коллегами..."
          className="flex-1 bg-muted/50 border-0 focus-visible:ring-0 placeholder:text-muted-foreground/70"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <Button 
          size="icon" 
          variant={content.trim() ? "default" : "ghost"}
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="relative overflow-hidden transition-all duration-200 flex-shrink-0"
        >
          <AnimatePresence mode="wait" initial={false}>
            {content.trim() ? (
              <motion.div
                key="sparkles"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Sparkles className="w-5 h-5 text-yellow-200" />
              </motion.div>
            ) : (
              <motion.div
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Send className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.div>
  );
};

export default CreatePostInput;