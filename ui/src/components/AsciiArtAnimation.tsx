import { MilkLogo } from "./MilkLogo";

/**
 * Right-side branded panel shown during onboarding Step 1.
 * Replaces the previous ASCII art animation with clean Mi1k branding.
 */
export function AsciiArtAnimation() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-12">
      <MilkLogo className="w-48 h-auto opacity-90" />
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-white/90 tracking-tight">
          Welcome to Mi1k
        </h2>
        <p className="text-sm text-white/50 max-w-xs leading-relaxed">
          Your AI-powered workforce platform. Create a company, hire agents, and let them get to work.
        </p>
      </div>
      <div className="flex flex-col gap-4 text-xs text-white/30 mt-4">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-[10px] font-medium">1</span>
          <span>Name your company</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-[10px] font-medium">2</span>
          <span>Create your first agent</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-[10px] font-medium">3</span>
          <span>Assign a task</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-[10px] font-medium">4</span>
          <span>Launch and watch it work</span>
        </div>
      </div>
    </div>
  );
}
