import { useEffect, useState } from "react";
import { ShieldCheck, Droplets } from "lucide-react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setShowContent(true), 200);
    const timer = setTimeout(() => setFadeOut(true), 2200);
    const finish = setTimeout(onFinish, 2800);
    return () => { clearTimeout(show); clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-600 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{
        background: "linear-gradient(135deg, hsl(199 89% 38%) 0%, hsl(199 89% 48%) 40%, hsl(160 60% 42%) 100%)",
      }}
    >
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-white/3" />
      </div>

      <div className={`flex flex-col items-center transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        {/* Logo / Icon */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
            <div className="relative">
              <Droplets className="w-14 h-14 text-white" strokeWidth={1.5} />
              <ShieldCheck className="w-7 h-7 text-white absolute -bottom-1 -right-2 drop-shadow-lg" strokeWidth={2} />
            </div>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-3xl border-2 border-white/20 animate-ping" style={{ animationDuration: "2s" }} />
        </div>

        {/* App name */}
        <h1
          className="text-3xl font-extrabold text-white mb-1 tracking-wide drop-shadow-lg"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          Alazwak
        </h1>
        <h2
          className="text-lg font-semibold text-white/90 mb-4 tracking-wider uppercase"
          style={{ fontFamily: "'Cairo', sans-serif", letterSpacing: "0.25em" }}
        >
          Food Safety
        </h2>

        {/* Divider */}
        <div className="w-16 h-0.5 bg-white/40 rounded-full mb-4" />

        {/* Tagline */}
        <p
          className="text-white/80 text-sm font-medium"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          مساعدك الذكي لسلامة الغذاء
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;