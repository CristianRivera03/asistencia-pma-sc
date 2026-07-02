import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Search, Trash2, UserPlus, Target, Edit2, Filter } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000`;
const socket = io(API_URL);

export default function AttendanceList() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [meta, setMeta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersona, setNewPersona] = useState({ nombre: '', comunidad: '', telefono: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);

  useEffect(() => {
    fetchRegistros();
    fetchMeta();
  }, [fecha]);

  useEffect(() => {
    socket.on('registro_actualizado', (updatedRecord) => {
      if (updatedRecord.fecha === fecha) {
        setRegistros((prev) => 
          prev.map((reg) => reg.id === updatedRecord.id ? updatedRecord : reg)
        );
      }
    });

    socket.on('nuevo_registro', (newRecord) => {
      if (newRecord.fecha === fecha) {
        setRegistros((prev) => [...prev, newRecord]);
      }
    });

    socket.on('registro_eliminado', (deletedId) => {
      setRegistros((prev) => prev.filter(reg => reg.id !== parseInt(deletedId)));
    });

    socket.on('meta_actualizada', (data) => {
      if (data.fecha === fecha) {
        setMeta(data.meta);
      }
    });

    return () => {
      socket.off('registro_actualizado');
      socket.off('nuevo_registro');
      socket.off('registro_eliminado');
      socket.off('meta_actualizada');
    };
  }, [fecha]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/asistencia/registros?fecha=${fecha}`);
      const data = await res.json();
      setRegistros(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const res = await fetch(`${API_URL}/api/asistencia/metas?fecha=${fecha}`);
      const data = await res.json();
      setMeta(data.meta || 0);
    } catch (error) {
      console.error('Error fetching meta:', error);
    }
  };

  const verifyPassword = () => {
    const pwd = window.prompt("Ingrese la contraseña de administrador:");
    if (pwd !== '022003') {
      if (pwd !== null) alert("Contraseña incorrecta");
      return false;
    }
    return true;
  };

  const handleAdjustMeta = async () => {
    if (!verifyPassword()) return;

    const newMeta = window.prompt("Ingrese la nueva meta para este día:", meta);
    if (newMeta === null || newMeta.trim() === '') return;

    const parsedMeta = parseInt(newMeta, 10);
    if (isNaN(parsedMeta)) return alert("Debe ingresar un número válido");

    try {
      const res = await fetch(`${API_URL}/api/asistencia/metas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, meta: parsedMeta, password: '022003' })
      });
      if (res.ok) {
        setMeta(parsedMeta);
      } else {
        alert("Error al actualizar la meta");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!verifyPassword()) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar a esta persona?")) return;

    try {
      const res = await fetch(`${API_URL}/api/asistencia/registros/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '022003' })
      });
      if (res.ok) {
        setRegistros(prev => prev.filter(r => r.id !== id));
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPersona = async (e) => {
    e.preventDefault();
    if (!newPersona.nombre || !newPersona.comunidad) return alert("Nombre y comunidad son obligatorios");

    try {
      const res = await fetch(`${API_URL}/api/asistencia/registro-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newPersona, 
          fecha, 
          password: '022003' 
        })
      });

      if (res.ok) {
        // Socket will handle adding it
        setShowAddModal(false);
        setNewPersona({ nombre: '', comunidad: '', telefono: '' });
      } else {
        alert("Error al guardar la persona");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const handleOpenAddModal = () => {
    if (verifyPassword()) {
      setShowAddModal(true);
    }
  };

  const handleOpenEditModal = (persona) => {
    if (verifyPassword()) {
      setEditingPersona(persona);
      setShowEditModal(true);
    }
  };

  const handleEditPersona = async (e) => {
    e.preventDefault();
    if (!editingPersona.nombre || !editingPersona.comunidad) return alert("Nombre y comunidad son obligatorios");

    try {
      const res = await fetch(`${API_URL}/api/asistencia/registros/${editingPersona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editingPersona.nombre,
          comunidad: editingPersona.comunidad,
          telefono: editingPersona.telefono
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingPersona(null);
      } else {
        alert("Error al actualizar la persona");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const handleToggle = async (id, field, currentValue) => {
    setRegistros((prev) => 
      prev.map(reg => reg.id === id ? { ...reg, [field]: !currentValue } : reg)
    );

    try {
      await fetch(`${API_URL}/api/asistencia/registros/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue })
      });
    } catch (error) {
      console.error('Error updating:', error);
      setRegistros((prev) => 
        prev.map(reg => reg.id === id ? { ...reg, [field]: currentValue } : reg)
      );
    }
  };

  const filteredRegistros = registros.filter(reg => {
    const matchesSearch = reg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          reg.comunidad.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'entrevistados_no_pasaron') {
      return matchesSearch && reg.entrevistado && !reg.scope;
    }
    
    return matchesSearch;
  });

  const grouped = filteredRegistros.reduce((acc, reg) => {
    if (!acc[reg.comunidad]) acc[reg.comunidad] = [];
    acc[reg.comunidad].push(reg);
    return acc;
  }, {});

  const totalScopes = registros.filter(r => r.scope).length;
  const progressPercent = meta > 0 ? Math.min(100, Math.round((totalScopes / meta) * 100)) : 0;

  return (
    <div className="bg-base-200 p-3 sm:p-6 rounded-box shadow-lg">
      
      {/* Header Bar: Date and Goal */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-base-100 p-4 rounded-xl shadow-sm border border-base-300">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <label className="font-semibold whitespace-nowrap text-sm sm:text-base">Fecha:</label>
          <input 
            type="date" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)} 
            className="input input-sm sm:input-md input-bordered flex-1 lg:w-auto" 
          />
        </div>

        <div className="flex items-center justify-between gap-2 w-full lg:w-auto bg-primary/10 px-3 sm:px-4 py-2 sm:py-3 rounded-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <Target className="text-primary hidden sm:block" size={24} />
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-bold text-primary-content opacity-70 uppercase tracking-wider">Meta Diaria (Scope)</span>
              <span className="text-base sm:text-xl font-black text-primary leading-none">{totalScopes} / {meta || '?'}</span>
            </div>
          </div>
          <div className="flex-1 lg:w-32 lg:flex-none max-w-[100px] sm:max-w-[150px] bg-base-300 h-2 sm:h-3 rounded-full overflow-hidden mx-2">
            <div className={`h-full ${progressPercent >= 100 ? 'bg-success' : 'bg-primary'} transition-all duration-500`} style={{ width: `${progressPercent}%` }}></div>
          </div>
          <button onClick={handleAdjustMeta} className="btn btn-xs sm:btn-sm btn-outline btn-primary">Ajustar</button>
        </div>
      </div>

      {/* Toolbar: Search, Filter Button and Add Person */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="form-control flex-[2]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-base-content/50" />
            <input 
              type="text" 
              placeholder="Buscar persona o comunidad..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>
        
        <button 
          onClick={() => setFilterType(prev => prev === 'todos' ? 'entrevistados_no_pasaron' : 'todos')}
          className={`btn flex-1 ${filterType === 'entrevistados_no_pasaron' ? 'btn-warning' : 'btn-outline btn-warning'}`}
          title="Ver personas entrevistadas que no cumplieron la meta (Scope)"
        >
          <Filter size={18} />
          {filterType === 'entrevistados_no_pasaron' ? 'Mostrar Todos' : 'Filtro: Sin Scope'}
        </button>

        <button onClick={handleOpenAddModal} className="btn btn-secondary flex-1">
          <UserPlus size={18} />
          Agregar Persona
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center p-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : registros.length === 0 ? (
        <div className="text-center p-12 text-base-content/60 bg-base-100 rounded-box">
          No hay registros para esta fecha. Ve a "Cargar Datos" o agrega a alguien manualmente.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([comunidad, personas]) => (
            <div key={comunidad} className="bg-base-100 p-3 sm:p-5 rounded-box shadow-sm border border-base-200">
              <h3 className="text-lg sm:text-xl font-bold text-primary border-b border-base-200 pb-2 mb-4">
                {comunidad} <span className="text-xs sm:text-sm font-normal text-base-content/50">({personas.length} personas)</span>
              </h3>
              
              <div className="flex flex-col gap-3">
                {personas.map(persona => (
                  <div key={persona.id} className="flex flex-col lg:flex-row justify-between lg:items-center p-3 sm:p-4 bg-base-200/50 rounded-xl hover:bg-base-200 transition-colors group">
                    
                    {/* Header fila (Móvil) / Columna Izq (Desktop) */}
                    <div className="flex justify-between items-start w-full lg:w-auto mb-3 lg:mb-0">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-base sm:text-lg leading-tight">{persona.nombre}</span>
                        <span className="text-xs sm:text-sm text-base-content/60 mt-1">Tel: {persona.telefono}</span>
                      </div>
                      
                      <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEditModal(persona)} 
                          className="btn btn-ghost btn-sm btn-circle text-info"
                          title="Editar Registro"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(persona.id)} 
                          className="btn btn-ghost btn-sm btn-circle text-error"
                          title="Eliminar Registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Toggles (Móvil: Grid 3 columnas, Desktop: flex) */}
                    <div className="grid grid-cols-3 gap-2 w-full lg:flex lg:w-auto lg:gap-6 bg-base-100 lg:bg-transparent p-2 lg:p-0 rounded-lg lg:rounded-none">
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1 p-1">
                        <span className="label-text text-[10px] sm:text-xs font-medium text-center">Asistió</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-success toggle-sm sm:toggle-md" 
                          checked={!!persona.asistio} 
                          onChange={() => handleToggle(persona.id, 'asistio', !!persona.asistio)} 
                        />
                      </label>

                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1 p-1 border-x border-base-200 lg:border-none">
                        <span className="label-text text-[10px] sm:text-xs font-medium text-center leading-tight">Entrevistado</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-warning toggle-sm sm:toggle-md" 
                          checked={!!persona.entrevistado} 
                          onChange={() => handleToggle(persona.id, 'entrevistado', !!persona.entrevistado)} 
                        />
                      </label>

                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1 p-1">
                        <span className="label-text text-[10px] sm:text-xs font-medium text-center">Scope</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-primary toggle-sm sm:toggle-md" 
                          checked={!!persona.scope} 
                          onChange={() => handleToggle(persona.id, 'scope', !!persona.scope)} 
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus size={20} className="text-secondary" /> Agregar Persona Manual</h3>
            
            <form onSubmit={handleAddPersona} className="flex flex-col gap-4">
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Nombre Completo</span></label>
                <input 
                  type="text" 
                  value={newPersona.nombre} 
                  onChange={e => setNewPersona({...newPersona, nombre: e.target.value})} 
                  className="input input-bordered" required 
                />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Comunidad</span></label>
                <input 
                  type="text" 
                  value={newPersona.comunidad} 
                  onChange={e => setNewPersona({...newPersona, comunidad: e.target.value})} 
                  className="input input-bordered" required 
                />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Teléfono (Opcional)</span></label>
                <input 
                  type="text" 
                  value={newPersona.telefono} 
                  onChange={e => setNewPersona({...newPersona, telefono: e.target.value})} 
                  className="input input-bordered" 
                />
              </div>

              <div className="modal-action mt-6 flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-secondary">Guardar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPersona && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Edit2 size={20} className="text-info" /> Editar Persona</h3>
            
            <form onSubmit={handleEditPersona} className="flex flex-col gap-4">
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Nombre Completo</span></label>
                <input 
                  type="text" 
                  value={editingPersona.nombre} 
                  onChange={e => setEditingPersona({...editingPersona, nombre: e.target.value})} 
                  className="input input-bordered" required 
                />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Comunidad</span></label>
                <input 
                  type="text" 
                  value={editingPersona.comunidad} 
                  onChange={e => setEditingPersona({...editingPersona, comunidad: e.target.value})} 
                  className="input input-bordered" required 
                />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Teléfono (Opcional)</span></label>
                <input 
                  type="text" 
                  value={editingPersona.telefono} 
                  onChange={e => setEditingPersona({...editingPersona, telefono: e.target.value})} 
                  className="input input-bordered" 
                />
              </div>

              <div className="modal-action mt-6 flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-info">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
