const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary large orb */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-float animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle, hsl(217 91% 60% / 0.15) 0%, transparent 70%)',
          top: '-10%',
          right: '-10%',
        }}
      />
      
      {/* Secondary orb */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full animate-float animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle, hsl(265 89% 66% / 0.1) 0%, transparent 70%)',
          bottom: '-5%',
          left: '-5%',
          animationDelay: '-3s',
        }}
      />
      
      {/* Small accent orb */}
      <div 
        className="absolute w-[200px] h-[200px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(217 91% 60% / 0.08) 0%, transparent 70%)',
          top: '40%',
          left: '10%',
          animationDelay: '-2s',
        }}
      />
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(217 91% 60%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(217 91% 60%) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

export default FloatingOrbs;
