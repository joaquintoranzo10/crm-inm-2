import { Link } from "react-router-dom";
import { useState, useEffect, useRef, RefObject } from "react";
import { Building2, Home, Warehouse, Handshake, CornerRightDown } from "lucide-react";

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

type ColorKey = 'blue' | 'indigo' | 'purple' | 'green' | 'amber';

interface StepCardProps {
    number: string;
    title: string;
    description: string;
    color: ColorKey;
    delay: number;
}

function StepCard({ number, title, description, color, delay }: StepCardProps) {
  const [ref, isVisible] = useOnScreen({ threshold: 0.2 });

  const colorClasses: Record<ColorKey, { bg: string; border: string; text: string; badge: string }> = {
    blue: {
        bg: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
        border: 'hover:border-blue-200 dark:hover:border-blue-800/50',
        text: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        badge: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
    },
    indigo: {
        bg: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10',
        border: 'hover:border-indigo-200 dark:hover:border-indigo-800/50',
        text: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
    },
    purple: {
        bg: 'hover:bg-purple-50/50 dark:hover:bg-purple-900/10',
        border: 'hover:border-purple-200 dark:hover:border-purple-800/50',
        text: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        badge: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
    },
    green: {
        bg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
        border: 'hover:border-emerald-200 dark:hover:border-emerald-800/50',
        text: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
    },
    amber: {
        bg: 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10',
        border: 'hover:border-amber-200 dark:hover:border-amber-800/50',
        text: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
        badge: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
    }
  };
  
  const colors = colorClasses[color];

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-300 transform-gpu ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`relative p-6 rounded-2xl transition-all duration-300 border
        bg-white border-slate-100 shadow-sm
        dark:bg-[#0A0A0A] dark:border-white/5
        ${colors.bg} ${colors.border}`}>

        <div className="flex gap-4 items-start">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0 transition-colors ${colors.badge}`}>
                {number}
            </div>
            <div>
                <h3 className={`text-lg font-bold mb-1 transition-colors text-slate-900 dark:text-white ${colors.text}`}>
                    {title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}



export default function Landing() {
 
  const scrollLineRef = useRef<HTMLDivElement>(null);
  
  const [activeProperty, setActiveProperty] = useState(0);
  const properties = [
    { id: 0, title: "Edificios", icon: Building2, color: "from-blue-500 via-cyan-500 to-blue-600", glow: "bg-blue-500", text: "text-blue-500" },
    { id: 1, title: "Casas", icon: Home, color: "from-emerald-400 via-teal-500 to-emerald-600", glow: "bg-emerald-500", text: "text-emerald-500" },
    { id: 2, title: "Galpones", icon: Warehouse, color: "from-amber-400 via-orange-500 to-amber-600", glow: "bg-amber-500", text: "text-amber-500" },
  ];

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (scrollLineRef.current) {
             const y = window.scrollY;
             
             scrollLineRef.current.style.height = `${Math.min(100, Math.max(0, y - 50))}px`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    const propertyInterval = setInterval(() => {
      setActiveProperty((prev) => (prev + 1) % properties.length);
    }, 2000);

    return () => {
        window.removeEventListener("scroll", handleScroll);
        clearInterval(propertyInterval);
    };
  }, [properties.length]);

  return (
    <div className="relative w-full min-h-screen text-slate-900 dark:text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      <style>{`
        @keyframes gradient-x {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 15s ease infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-8px) scale(1.02); }
        }
        .animate-float {
            animation: float 4s ease-in-out infinite;
        }
      `}</style>

    
      <div className="fixed inset-0 -z-10 bg-white dark:bg-[#050505] transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" 
             style={{ 
                 backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', 
                 backgroundSize: '50px 50px',
                 color: 'inherit' 
             }}>
        </div>
      
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] blur-[180px] rounded-full pointer-events-none transition-colors duration-300 opacity-[0.06] dark:opacity-[0.15] transform-gpu will-change-transform ${properties[activeProperty].glow}`} />
      </div>

      <div className="relative container mx-auto px-4 max-w-7xl">
      
        <div className="w-full flex flex-col items-center justify-center text-center pb-12 pt-4 relative min-h-[calc(100vh-140px)]">
            
            <div className="relative w-full h-[320px] mb-4 flex flex-col items-center justify-center">
                
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    {properties.map((prop, index) => {
                        const isActive = index === activeProperty;
                        const Icon = prop.icon;
                        return (
                            <div 
                                key={prop.id}
                                className={`absolute flex flex-col items-center transition-all duration-300 ease-out transform-gpu
                                    ${isActive ? 'opacity-100 scale-100 translate-y-[-20px]' : 'opacity-0 scale-75 translate-y-10'}`}
                            >
                                <div className={`mb-4 px-4 py-1 rounded-full border border-current/20 bg-white/10 dark:bg-black/20 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider transition-opacity duration-300 shadow-xl ${prop.text} ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                    {prop.title}
                                </div>

                                <Icon 
                                    size={200}
                                    strokeWidth={0.7} 
                                    className={`drop-shadow-2xl transition-colors duration-300 opacity-[0.2] dark:opacity-[0.3] ${prop.text}`} 
                                />
                            </div>
                        );
                    })}
                </div>

              
                <div className="relative z-10 w-32 h-32 flex items-center justify-center animate-float transform-gpu mt-20">
                    <div className={`absolute -inset-2 blur-xl rounded-full transition-colors duration-300 opacity-50 dark:opacity-70 transform-gpu ${properties[activeProperty].glow}`}></div>
                    <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Handshake size={44} strokeWidth={1.5} className="text-slate-800 dark:text-white drop-shadow-sm" />
                        </div>
                    </div>
                </div>
                
                <div className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-slate-300 dark:border-white/10 animate-[spin_60s_linear_infinite] transform-gpu z-0 opacity-40 mt-20"></div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-4 relative z-10 flex flex-col items-center">
              <span className="block text-slate-950 dark:text-white mb-1">
                Simplificá tu
              </span>
              <span className="relative inline-block">
                <span className={`absolute -inset-3 blur-3xl transition-colors duration-300 opacity-20 dark:opacity-30 transform-gpu ${properties[activeProperty].glow} animate-pulse`}></span>
                <span className={`relative text-transparent bg-clip-text bg-gradient-to-r animate-gradient-x transition-all duration-300 transform-gpu ${properties[activeProperty].color}`}>
                  Negocio Inmobiliario
                </span>
              </span>
            </h1>

            <p className="text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed mb-8 text-slate-600 dark:text-gray-400">
              Un CRM diseñado para que realmente trabajés por vos. Gestioná <span className={`transition-colors duration-300 font-bold ${properties[activeProperty].text}`}>{properties[activeProperty].title}</span> y clientes sin perder tiempo ni oportunidades.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 relative z-10 items-center justify-center">
              <Link to="/register" className="relative inline-flex h-12 overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-transform hover:-translate-y-0.5 shadow-lg transform-gpu">
                <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] transform-gpu" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl px-8 py-1 text-sm font-bold backdrop-blur-3xl transition-colors 
                  bg-white text-slate-950 hover:bg-slate-50 
                  dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900">
                  Crear cuenta gratis
                </span>
              </Link>
              
              <button className="group inline-flex h-12 items-center justify-center rounded-xl px-6 py-1 text-sm font-semibold transition-colors gap-2
                text-slate-600 hover:text-blue-600 hover:bg-slate-100
                dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
                <span>Conocer más</span>
                <CornerRightDown className="w-4 h-4 transition-transform transform-gpu group-hover:translate-y-1" />
              </button>
            </div>

            
             <div 
                ref={scrollLineRef}
                className={`absolute bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent to-current transition-colors duration-300 ease-out will-change-[height] ${properties[activeProperty].text}`}
                style={{ height: '0px' }} 
             ></div>
        </div>


        
        <div className="relative pb-24 max-w-5xl mx-auto mt-10">
          
          <div className="absolute top-10 bottom-10 left-[2.25rem] lg:left-[50%] w-px bg-slate-200 dark:bg-white/5 lg:-translate-x-1/2 z-0 hidden lg:block"></div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start relative">
            
            <div className="lg:col-span-5 space-y-6 lg:space-y-8 relative z-10">
              <StepCard 
                number="01"
                title="Agenda a tu Lead"
                description="Ingreso ultra-rápido. Olvidate de los formularios interminables. Un click y el cliente ya está en tu embudo."
                color="blue"
                delay={0}
              />
              <StepCard 
                number="02"
                title="Match Automático"
                description="Nuestro algoritmo conecta los requerimientos del cliente con tu inventario disponible al instante."
                color="indigo"
                delay={100}
              />
              <StepCard 
                number="03"
                title="Gestión Inteligente"
                description="Automatizá tu día a día con recordatorios por correo. Que ninguna oportunidad se enfríe."
                color="purple"
                delay={200}
              />
              <StepCard 
                number="04"
                title="Decisiones Inteligentes"
                description="Analiza el rendimiento de tu negocio en tiempo real. Visualiza métricas de tus leads y propiedades más elegidas para cerrar más operaciones."
                color="green"
                delay={300}
              />
              <StepCard 
                number="05"
                title="Cierre de Operaciones"
                description="Registra cada interacción en el historial del cliente y actualiza su estado ('En negociación', 'Vendido') hasta concretar la venta de forma organizada."
                color="amber"
                delay={400}
              />
            </div>

            <div className="lg:col-span-7 sticky top-28 z-20 mt-8 lg:mt-0">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-purple-600/50 rounded-2xl blur opacity-20 group-hover:opacity-50 transition duration-300 transform-gpu"></div>
                    
                    <div className="relative rounded-2xl bg-slate-900 border border-slate-800/50 dark:border-white/10 overflow-hidden shadow-2xl">
                        <div className="h-8 bg-[#1A1D24] border-b border-white/5 flex items-center px-4 justify-between">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">live_preview.mp4</div>
                        </div>
                        
                        <div className="aspect-video bg-slate-950 relative">
                            <video
                                src="/video.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
                            />
                        </div>
                    </div>

                    <div className="absolute -bottom-4 -right-4 bg-white dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-emerald-500/30 px-4 py-2 rounded-xl shadow-lg animate-bounce-slow hidden md:block transform-gpu">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 transform-gpu"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-emerald-400">Sistema Activo</span>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>

        <div className="py-20 text-center relative z-10 border-t border-slate-100 dark:border-white/5 mt-10">
             <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight">Optimizá tu gestión hoy mismo</h2>
             
              <Link to="/register" className="inline-flex items-center justify-center h-14 px-10 rounded-xl text-base font-bold transition-all transform hover:-translate-y-1 shadow-md transform-gpu
                bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25
                dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100">
                Crear mi cuenta gratis
              </Link>
        </div>

      </div>
    </div>
  );
}