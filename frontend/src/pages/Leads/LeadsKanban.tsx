import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function LeadsKanban({
    contactos,
    estados,
    onStatusChange,
    onRefresh,
    onEdit,
    onHistory,
    onPreferences,
    onMatches,
    formatDate,
    statusChipClass
}: any) {
    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const leadId = Number(draggableId);
        const newEstadoId = Number(destination.droppableId);

        onStatusChange(leadId, newEstadoId);

        try {
            await api.patch(`contactos/${leadId}/`, { estado: newEstadoId });
            toast.success("Estado actualizado");
        } catch (error) {
            toast.error("Error al mover el lead");
            onRefresh(); 
        }
    };

    const getLeadEstadoId = (c: any) => {
        if (typeof c.estado === 'number') return c.estado;
        if (c.estado && typeof c.estado === 'object' && 'id' in c.estado) return c.estado.id;
        return null;
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start min-h-[60vh]">
                {estados.map((estado: any) => {
                    // Filtramos los leads que pertenecen a esta columna
                    const leadsInColumn = contactos.filter((c: any) => getLeadEstadoId(c) === estado.id);

                    return (
                        <div key={estado.id} className="min-w-[260px] w-[260px] bg-surface-2/50 border border-soft rounded-2xl flex flex-col max-h-[75vh]">
                            {/* Cabecera de la columna */}
                            <div className="p-4 border-b border-soft flex justify-between items-center bg-surface-2/80 rounded-t-2xl">
                                <h3 className="font-black text-base-clr tracking-tight">{estado.fase}</h3>
                                <span className="bg-surface border border-soft text-muted-clr text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                                    {leadsInColumn.length}
                                </span>
                            </div>

                            {/* Zona donde se sueltan las tarjetas */}
                            <Droppable droppableId={String(estado.id)}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[150px] transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-blue-500/10' : ''}`}
                                    >
                                        {leadsInColumn.map((lead: any, index: number) => (
                                            <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-surface border border-soft p-4 rounded-xl shadow-sm transition-all ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 rotate-2 scale-105' : 'hover:shadow-md'}`}
                                                    >
                                                        <div className="font-bold text-base-clr mb-1">
                                                            {lead.nombre} {lead.apellido}
                                                        </div>
                                                        <div className="text-xs text-muted-clr mb-3">
                                                            {lead.email || lead.telefono || "Sin contacto"}
                                                        </div>

                                                        {lead.next_contact_at && (
                                                            <div className="flex flex-col gap-1 mb-3 bg-surface-2 p-2 rounded-lg border border-soft/50">
                                                                <span className="text-[10px] font-bold uppercase text-muted-clr">Próximo contacto</span>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-xs font-medium text-base-clr">
                                                                        {formatDate(lead.next_contact_at, true)}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusChipClass(lead.proximo_contacto_estado)}`}>
                                                                        {lead.proximo_contacto_estado || "Pendiente"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center pt-3 border-t border-soft mt-1">
                                                            <button onClick={() => onEdit(lead)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                                                Editar
                                                            </button>
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => onHistory(lead)} className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-blue-500 hover:text-white transition-colors border border-soft" title="Historial">📋</button>
                                                                <button onClick={() => onPreferences(lead)} className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-violet-500 hover:text-white transition-colors border border-soft" title="Preferencias">🔍</button>
                                                                <button onClick={() => onMatches(lead)} className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-amber-500 hover:text-white transition-colors border border-soft" title="Matches">✨</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}