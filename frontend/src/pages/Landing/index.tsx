import { Link } from "react-router-dom";
import { useState, useEffect, useRef, RefObject } from "react";


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
        text: 'group-hover:text-blue-500'
    },
    indigo: {
        blob: 'bg-indigo-600/20',
        border: 'hover:border-indigo-500/50',
        text: 'group-hover:text-indigo-500'
    },
    purple: {
        blob: 'bg-purple-600/20',
        border: 'hover:border-purple-500/50',
        text: 'group-hover:text-purple-500'
    },
    green: {
        blob: 'bg-green-600/20',
        border: 'hover:border-green-500/50',
        text: 'group-hover:text-green-500'
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
      
      {/* TARJETA ADAPTABLE */}
      <div className={`relative p-8 rounded-2xl backdrop-blur-sm transition-colors border
        bg-white border-slate-200 
        dark:bg-white/5 dark:border-white/10
        ${colors.border}`}>

        <div className={`text-5xl font-black absolute -top-6 -left-2 lg:-right-2 lg:left-auto transition-colors
           text-slate-100 dark:text-white/10 ${colors.text} dark:group-hover:text-white/20`}>
           {number}
        </div>

        {/* TÍTULO Y TEXTO */}
        <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-gray-400">{description}</p>
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
    <div className="relative w-full min-h-screen text-slate-900 dark:text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* Estilos para animaciones */}
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
        @keyframes gradient-x {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 15s ease infinite;
        }
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
      <div className="fixed inset-0 -z-10 bg-white dark:bg-[#050505] transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] opacity-[0.4]" 
             style={{ 
                 backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', 
                 backgroundSize: '50px 50px',
                 color: 'inherit' 
             }}>
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      <div className="relative container mx-auto px-4">
        
        
        <div className="min-h-screen flex flex-col items-center justify-center text-center pb-20 relative">
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 relative z-10 flex flex-col items-center">
              <span className="block text-slate-900 dark:text-white mb-2 drop-shadow-2xl opacity-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                Bienvenido a
              </span>

              <span className="relative inline-block opacity-0 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                
                <span className="absolute -inset-2 blur-3xl opacity-40 bg-blue-600 animate-pulse"></span>

                
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 animate-gradient-x">
                  Real Connect
                </span>
              </span>
            </h1>

            <p className="text-xl md:text-2xl max-w-3xl mx-auto font-semibold leading-relaxed mb-12 text-shimmer">
              El primer CRM que realmente trabaja por vos. Sin perder tiempo. Sin perder leads.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 relative z-10 items-center justify-center">
              
              {/* BOTÓN REGISTRARSE  */}
              <Link to="/register" className="relative inline-flex h-14 overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-transform hover:scale-105">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-10 py-1 text-base font-bold backdrop-blur-3xl transition-colors 
                  bg-white text-slate-900 hover:bg-slate-50 
                  dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900">
                  Registrarse
                </span>
              </Link>
              
              {/* BOTÓN INICIAR SESIÓN */}
              <Link to="/login" className="group inline-flex h-14 items-center justify-center rounded-full px-8 py-1 text-base font-medium transition-colors gap-2
                text-slate-600 hover:text-blue-600 hover:bg-slate-100
                dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
                <span>Iniciar sesión</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

             {/* LÍNEA VERTICAL QUE "BAJA" CON EL SCROLL */}
             <div 
                className="absolute bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-blue-500/50 to-blue-500 transition-all duration-300 ease-out"
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
             <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">¿Listo para modernizarte?</h2>
             <Link to="/register" className="inline-block px-10 py-4 font-bold rounded-full transition-transform hover:scale-105 shadow-xl
               bg-slate-900 text-white hover:bg-slate-800
               dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:shadow-[0_0_40px_rgba(255,255,255,0.3)]">
               Crear cuenta gratis
             </Link>
        </div>

      </div>
    </div>
  );
}