import axios from "axios";
export const API_BASE =
  import.meta.env.VITE_API_URL || "https://crm-real-connect.onrender.com/api/";


export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15000,
});

function normalizeUrl(u?: string) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u; 

  let url = u;
  if (url.startsWith("/api/")) url = url.slice(5);
  else if (url.startsWith("api/")) url = url.slice(4);

  url = url.replace(/\/{2,}/g, "/");
  return url;
}

api.interceptors.request.use((config) => {
  
  const token = localStorage.getItem("rc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url) config.url = normalizeUrl(config.url);
  return config;
});

axios.defaults.baseURL = API_BASE;
axios.defaults.headers.common["Accept"] = "application/json";
axios.defaults.timeout = 15000;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("rc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizeUrl(config.url);
  }
  return config;
});

/*  Leads */
export type Contacto = {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: number | null;
  estado_fase?: string | null;
  proximo_contacto?: string | null;
  ultimo_contacto?: string | null;
  preferencias?: PreferenciaBusqueda[];
};

export async function fetchLeads(params: Record<string, any> = {}) {
  const { data } = await api.get("contactos/", { params });
  return data.results ?? data;
}

export type TipoPropiedad =
  | "casa" | "departamento" | "ph" | "terreno" | "cochera" | "local"
  | "oficina" | "consultorio" | "quinta" | "chacra" | "galpon"
  | "deposito" | "campo" | "hotel" | "fondo de comercio" | "edificio" | "otro";

export type PreferenciaBusqueda = {
  id?: number;
  etiqueta?: string;
  tipo_de_propiedad?: TipoPropiedad | "";
  operacion?: "venta" | "alquiler" | "";
  localidad?: string;
  barrio?: string;
  presupuesto_min?: string | number | null;
  presupuesto_max?: string | number | null;
  moneda?: "USD" | "ARS";
  ambientes_min?: number | null;
  actualizado_en?: string;
};

export async function updatePreferenciasLead(contactoId: number, preferencias: PreferenciaBusqueda[]) {
  const { data } = await api.patch(`contactos/${contactoId}/`, { preferencias });
  return data as Contacto;
}

export async function clearPreferenciasLead(contactoId: number) {
  const { data } = await api.patch(`contactos/${contactoId}/`, { preferencias: null });
  return data as Contacto;
}

export async function fetchMatchesForLead(contactoId: number): Promise<Propiedad[]> {
  const { data } = await api.get(`contactos/${contactoId}/matches/`);
  return Array.isArray(data) ? data : (data.resultados ?? []);
}

export async function fetchLeadsInteresados(propiedadId: number): Promise<Contacto[]> {
  const { data } = await api.get(`propiedades/${propiedadId}/leads-interesados/`);
  return Array.isArray(data) ? data : (data.results ?? []);
}

/* Propiedades */
export type Propiedad = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ubicacion: string;
  tipo_de_propiedad: "casa" | "departamento" | "hotel";
  disponibilidad: string;
  precio: string;
  moneda: "USD" | "ARS";
  ambiente: number;
  antiguedad: number;
  banos: number;
  superficie: string;
  fecha_alta: string;
  estado: "disponible" | "vendido" | "reservado";
};

export async function fetchPropiedades(params: Record<string, any> = {}) {
  const { data } = await api.get("propiedades/", { params });
  return data.results ?? data;
}

/* Usuarios */
export type Usuario = {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  telefono?: string;
  dni?: string;
};

export async function fetchUsuarios() {
  const { data } = await api.get("usuarios/");
  return data.results ?? data;
}

/*  Eventos  */
export type Evento = {
  id: number;
  owner?: number; 
  nombre?: string;
  apellido?: string;
  email?: string | null;
  contacto: number | null;
  propiedad: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string; 
  notas?: string;
  creado_en?: string;
};

export type EventoCreate = {
  contacto?: number | null;
  propiedad: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string;
  notas?: string;
};

export type EventoUpdate = Partial<EventoCreate>;

export type EventoFilters = {
  date?: string;
  from?: string;
  to?: string;
  types?: string;
  ordering?: string;
  [k: string]: any;
};

export async function fetchEventos(params: EventoFilters = {}) {
  const { data } = await api.get("eventos/", { params });
  return data.results ?? data;
}

export async function createEvento(payload: EventoCreate): Promise<Evento> {
  const { data } = await api.post("eventos/", payload);
  return data;
}

export async function updateEvento(id: number, payload: EventoUpdate): Promise<Evento> {
  const { data } = await api.patch(`eventos/${id}/`, payload);
  return data;
}

export async function deleteEvento(id: number): Promise<void> {
  await api.delete(`eventos/${id}/`);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("rc_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("rc_user_id");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("rc_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("rc_user_id");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
