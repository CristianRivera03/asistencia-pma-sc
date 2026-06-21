import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Search } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000`;
const socket = io(API_URL);

export default function AttendanceList() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data when date changes
  useEffect(() => {
    fetchRegistros();
  }, [fecha]);

  // Real-time updates
  useEffect(() => {
    socket.on('registro_actualizado', (updatedRecord) => {
      // Only update if it belongs to the currently viewed date
      if (updatedRecord.fecha === fecha) {
        setRegistros((prev) => 
          prev.map((reg) => reg.id === updatedRecord.id ? updatedRecord : reg)
        );
      }
    });

    return () => {
      socket.off('registro_actualizado');
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

  const handleToggle = async (id, field, currentValue) => {
    // Optimistic UI Update (immediate visual feedback for better UX on tablets)
    setRegistros((prev) => 
      prev.map(reg => reg.id === id ? { ...reg, [field]: !currentValue } : reg)
    );

    try {
      await fetch(`${API_URL}/api/asistencia/registros/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue })
      });
      // The websocket will broadcast the true update to everyone else
    } catch (error) {
      console.error('Error updating:', error);
      // Revert if failed
      setRegistros((prev) => 
        prev.map(reg => reg.id === id ? { ...reg, [field]: currentValue } : reg)
      );
    }
  };

  const filteredRegistros = registros.filter(reg => 
    reg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    reg.comunidad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by comunidad
  const grouped = filteredRegistros.reduce((acc, reg) => {
    if (!acc[reg.comunidad]) acc[reg.comunidad] = [];
    acc[reg.comunidad].push(reg);
    return acc;
  }, {});

  return (
    <div className="bg-base-200 p-6 rounded-box shadow-lg">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="form-control flex-1">
          <label className="label"><span className="label-text font-semibold">Fecha</span></label>
          <input 
            type="date" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)} 
            className="input input-bordered w-full" 
          />
        </div>
        
        <div className="form-control flex-[2]">
          <label className="label"><span className="label-text font-semibold">Buscar persona o comunidad...</span></label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-base-content/50" />
            <input 
              type="text" 
              placeholder="Ej. Fatima Rivera..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : registros.length === 0 ? (
        <div className="text-center p-12 text-base-content/60 bg-base-100 rounded-box">
          No hay registros para esta fecha. Ve a "Cargar Datos" para importar la lista.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([comunidad, personas]) => (
            <div key={comunidad} className="bg-base-100 p-4 rounded-box shadow-sm">
              <h3 className="text-xl font-bold text-primary border-b border-base-200 pb-2 mb-4">
                {comunidad} <span className="text-sm font-normal text-base-content/50">({personas.length} personas)</span>
              </h3>
              
              <div className="flex flex-col gap-2">
                {personas.map(persona => (
                  <div key={persona.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors">
                    <div className="flex flex-col mb-4 md:mb-0">
                      <span className="font-semibold text-lg">{persona.nombre}</span>
                      <span className="text-sm text-base-content/60">Tel: {persona.telefono}</span>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                      <label className="cursor-pointer flex flex-col items-center gap-1">
                        <span className="label-text text-xs">Asistió</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-success" 
                          checked={!!persona.asistio} 
                          onChange={() => handleToggle(persona.id, 'asistio', !!persona.asistio)} 
                        />
                      </label>

                      <label className="cursor-pointer flex flex-col items-center gap-1">
                        <span className="label-text text-xs">Entrevistado</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-warning" 
                          checked={!!persona.entrevistado} 
                          onChange={() => handleToggle(persona.id, 'entrevistado', !!persona.entrevistado)} 
                        />
                      </label>

                      <label className="cursor-pointer flex flex-col items-center gap-1">
                        <span className="label-text text-xs">Scope</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-primary" 
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
    </div>
  );
}
