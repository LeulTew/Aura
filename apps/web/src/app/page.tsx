import HealthCheck from "@/components/HealthCheck";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-background to-black z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] z-0" />

      <div className="z-10 text-center space-y-6">
        <h1 className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
          Aura
        </h1>
        <p className="text-xl text-white/60 max-w-lg mx-auto">
          Intelligent Photo Retrieval. <br />
          <span className="text-primary font-medium">Privacy First.</span>
        </p>
        
        <div className="flex gap-4 justify-center pt-8">
          <button className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all">
            Get Started
          </button>
          <button className="px-8 py-3 rounded-full bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all">
            Scan QR
          </button>
        </div>
      </div>

      <HealthCheck />
    </main>
  );
}
