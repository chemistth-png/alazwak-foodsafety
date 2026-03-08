import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2000);
    const finish = setTimeout(onFinish, 2600);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-sky-500 to-secondary transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      <div className="animate-bounce mb-6">
        <img src="/app-icon.png" alt="Alazwak Food Safety" className="w-32 h-32 drop-shadow-2xl" />
      </div>
      <h1 className="text-2xl font-bold text-primary-foreground mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
        Alazwak Food Safety
      </h1>
      <p className="text-primary-foreground/70 text-sm">مساعدك الذكي لسلامة الغذاء</p>
    </div>
  );
};

export default SplashScreen;
