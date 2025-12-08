import { Link } from "react-router-dom";
import { useState, useEffect, useRef, RefObject } from "react";

// --- HOOKS Y TIPOS (Mantengo tu lógica corregida) ---

type UseOnScreenReturn = [RefObject<HTMLDivElement | null>, boolean];

function useOnScreen(options: IntersectionObserverInit): UseOnScreenReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        if (element) {
            observer.unobserve(element);
        }
      }
    }, options);

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options]);

  return [ref, isVisible];
}

type ColorKey = 'blue' | 'indigo' | 'purple' | 'green';

interface StepCardProps {
    number: string;
    title: string;
    description: string;
    color: ColorKey;
    delay: number;
}

function StepCard({ number, title, description, color, delay }: StepCardProps) {
  const [ref, isVisible] = useOnScreen({ threshold: 0.2 });

  const colorClasses: Record<ColorKey, { blob: string; border: string; text: string }> = {
    blue: {
        blob: 'bg-blue-600/20',
        border: 'hover:border-blue-500/50',
        text: 'group-hover:text-blue-500/20'
    },
    indigo: {
        blob: 'bg-indigo-600/20',
        border: 'hover:border-indigo-500/50',
        text: 'group-hover:text-indigo-500/20'
    },
    purple: {
        blob: 'bg-purple-600/20',
        border: 'hover:border-purple-500/50',
        text: 'group-hover:text-purple-500/20'
    },
    green: {
        blob: 'bg-green-600/20',
        border: 'hover:border-green-500/50',
        text: 'group-hover:text-green-500/20'
    }
  };
  
  const colors = colorClasses[color];

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 ${colors.blob} blur-[60px] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500`}></div>
      <div className={`relative bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-2xl ${colors.border} transition-colors`}>
        <div className={`text-5xl font-black text-white/10 absolute -top-6 -left-2 lg:-right-2 lg:left-auto ${colors.text} transition-colors`}>{number}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}


// --- COMPONENTE PRINCIPAL ---

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .text-shimmer {
          background: linear-gradient(to right, #4b5563 20%, #ffffff 50%, #4b5563 80%);
          background-size: 200% auto;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        /* Animación para el gradiente del texto principal */
        @keyframes gradient-x {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 15s ease infinite;
        }
         /* Animación tilt para el video */
        @keyframes tilt {
            0%, 50%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(1deg); }
            75% { transform: rotate(-1deg); }
        }
        .animate-tilt {
            animation: tilt 10s infinite linear;
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(-5%); }
            50% { transform: translateY(5%); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s infinite;
        }
      `}</style>

      {/* --- FONDO FIJO LIMPIO --- */}
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      <div className="relative container mx-auto px-4">
        
        {/* --- HERO SECTION --- */}
        <div className="min-h-screen flex flex-col items-center justify-center text-center pb-20 relative">
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="mb-8 relative group cursor-default">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative px-4 py-1.5 bg-black rounded-full border border-white/10 flex items-center gap-2">
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                 </span>
                 <span className="text-xs font-semibold tracking-wider text-gray-300">V2.0 LIVE</span>
              </div>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 relative z-10">
              <span className="block text-white mb-2 drop-shadow-2xl">Dominá</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">
                tu mercado.
              </span>
            </h1>

            <p className="text-xl md:text-2xl max-w-2xl mx-auto font-light leading-relaxed mb-12 opacity-80">
              El primer CRM que <span className="text-shimmer font-semibold">realmente trabaja por vos</span>. 
              Sin perder tiempo. Sin perder leads.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 relative z-10 items-center justify-center">
              <Link to="/register" className="relative inline-flex h-14 overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-base font-medium text-white backdrop-blur-3xl transition-colors hover:bg-slate-900">
                  Empezar ahora (Gratis)
                </span>
              </Link>
              
              <Link to="/login" className="group inline-flex h-14 items-center justify-center rounded-full px-8 py-1 text-base font-medium text-slate-400 transition-colors hover:text-white hover:bg-white/5 gap-2">
                <span>Iniciar sesión</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

             {/* CORRECCIÓN: LÍNEA VERTICAL QUE "BAJA" CON EL SCROLL */}
             <div 
                className="absolute bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-blue-500/50 to-blue-500 transition-all duration-300 ease-out"
                // Usamos scrollY para controlar la altura dinámicamente. 
                // El 'Math.min' y 'Math.max' son para limitar el efecto entre 0 y 150px de altura.
                style={{ height: `${Math.min(150, Math.max(0, scrollY - 50))}px` }} 
             ></div>
        </div>


        {/* --- STORYTELLING SCROLL --- */}
        <div className="relative pb-32">
          
          <div className="absolute top-0 bottom-0 left-4 lg:left-1/2 w-px bg-white/5 lg:-translate-x-1/2 z-0 hidden lg:block"></div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            
            <div className="space-y-32 pt-10 relative z-10 pl-4 lg:pl-0 lg:text-right lg:pr-10">
              <StepCard 
                number="01"
                title="Agenda a tu Lead"
                description="Ingreso ultra-rápido. Olvídate de los formularios que nadie llena. Un click y adentro."
                color="blue"
                delay={0}
              />
              <StepCard 
                number="02"
                title="Match Automático"
                description="Nuestro algoritmo conecta al cliente con tu inventario al instante. Magia pura."
                color="indigo"
                delay={100}
              />
              <StepCard 
                number="03"
                title="Agenda Inteligente"
                description="Nunca más un 'me olvidé'. Recordatorios automáticos por WhatsApp y correo."
                color="purple"
                delay={200}
              />
              <StepCard 
                number="04"
                title="Cierra el Trato"
                description="Negocia con datos en mano. Tablero Kanban visual para mover leads a 'Vendido'."
                color="green"
                delay={300}
              />
            </div>

            <div className="lg:h-[120vh] relative mt-10 lg:mt-0 lg:pl-10">
                <div className="sticky top-1/4">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000 animate-tilt"></div>
                        
                        <div className="relative rounded-xl bg-black border border-white/10 overflow-hidden shadow-2xl transform transition-transform hover:scale-[1.02] duration-500">
                            <div className="h-8 bg-[#151515] border-b border-white/5 flex items-center px-4 justify-between">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">live_preview.mp4</div>
                            </div>
                            
                            <div className="aspect-video bg-slate-900 relative">
                                <video
                                    src="/video.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                            </div>
                        </div>

                        <div className="absolute -bottom-5 -right-5 bg-black/80 backdrop-blur border border-green-500/30 px-4 py-2 rounded-lg shadow-xl animate-bounce-slow hidden md:block">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-mono text-green-400">Sistema Activo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* --- FINAL CTA --- */}
        <div className="py-20 text-center relative z-10">
             <h2 className="text-3xl font-bold mb-6">¿Listo para modernizarte?</h2>
             <Link to="/register" className="inline-block px-10 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-transform hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
               Crear cuenta gratis
             </Link>
        </div>

      </div>
    </div>
  );
}