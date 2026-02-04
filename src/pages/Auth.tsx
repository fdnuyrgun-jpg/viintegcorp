import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import FloatingOrbs from "@/components/FloatingOrbs";
import { z } from "zod";

const emailSchema = z.string().email("Некорректный email");
const passwordSchema = z.string().min(6, "Минимум 6 символов");

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Неверный email или пароль");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Подтвердите email перед входом");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Вход выполнен успешно!");
        navigate("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-app">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-app">
      <FloatingOrbs />
      
      <div className="w-full max-w-md mx-auto">
        {/* Glass card */}
        <div className="glass rounded-2xl p-8 shadow-2xl relative overflow-hidden" style={{ boxShadow: '0 0 60px hsl(217 91% 60% / 0.2)' }}>
          {/* Subtle gradient overlay */}
          <div 
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.05) 0%, transparent 50%, hsl(265 89% 66% / 0.05) 100%)',
            }}
          />
          
          <div className="relative z-10">
            {/* Logo section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div 
                  className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                  style={{
                    boxShadow: '0 0 40px hsl(217 91% 60% / 0.4)',
                  }}
                >
                  <Briefcase className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold gradient-text">VIntegCorp</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Система управления предприятием
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12"
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs">{errors.email}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">
                  Пароль
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password}</p>
                )}
              </div>

              {/* Submit button */}
              <Button 
                type="submit" 
                variant="gradient" 
                size="lg" 
                className="w-full mt-6 uppercase tracking-wider font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Войти
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          © 2026 VIntegCorp. Все права защищены.
        </p>
      </div>
    </div>
  );
};

export default Auth;
