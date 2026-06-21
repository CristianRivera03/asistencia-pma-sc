import { useState, useEffect } from 'react';

export default function Reports() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRegistros();
  }, [fecha]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/asistencia/registros?fecha=${fecha}`);
      const data = await res.json();
      setRegistros(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPersonas = registros.length;
  const totalAsistencias = registros.filter(r => r.asistio).length;
  const totalEntrevistados = registros.filter(r => r.entrevistado).length;
  const totalScope = registros.filter(r => r.scope).length;

  // Grouped by comunidad
  const groupedStats = registros.reduce((acc, reg) => {
    if (!acc[reg.comunidad]) {
      acc[reg.comunidad] = { total: 0, asistio: 0, entrevistado: 0, scope: 0 };
    }
    acc[reg.comunidad].total++;
    if (reg.asistio) acc[reg.comunidad].asistio++;
    if (reg.entrevistado) acc[reg.comunidad].entrevistado++;
    if (reg.scope) acc[reg.comunidad].scope++;
    return acc;
  }, {});

  const StatCard = ({ title, value, colorClass }) => (
    <div className={`card bg-base-100 shadow-sm border border-base-200 ${colorClass}`}>
      <div className="card-body items-center text-center p-6">
        <h2 className="card-title text-4xl font-bold mb-2">{value}</h2>
        <p className="text-sm uppercase tracking-wider text-base-content/60">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-base-200 p-6 rounded-box shadow-md">
        <div className="form-control w-full max-w-xs">
          <label className="label"><span className="label-text font-semibold">Seleccionar Fecha del Reporte</span></label>
          <input 
            type="date" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)} 
            className="input input-bordered w-full" 
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : totalPersonas === 0 ? (
        <div className="bg-base-200 p-12 rounded-box text-center text-base-content/60 shadow-md">
          No hay datos para esta fecha.
        </div>
      ) : (
        <>
          {/* General Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Registrados" value={totalPersonas} colorClass="text-base-content" />
            <StatCard title="Asistieron" value={totalAsistencias} colorClass="text-success" />
            <StatCard title="Entrevistados" value={totalEntrevistados} colorClass="text-warning" />
            <StatCard title="Pasados a Scope" value={totalScope} colorClass="text-primary" />
          </div>

          {/* Breakdown by Community */}
          <div className="bg-base-200 p-6 rounded-box shadow-md">
            <h3 className="text-xl font-bold mb-6 border-b border-base-300 pb-2">
              Desglose por Comunidad
            </h3>
            
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Comunidad</th>
                    <th>Total</th>
                    <th>Asistieron</th>
                    <th>Entrevistados</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedStats).map(([comunidad, stats]) => (
                    <tr key={comunidad}>
                      <td className="font-semibold">{comunidad}</td>
                      <td>{stats.total}</td>
                      <td className="text-success font-medium">{stats.asistio}</td>
                      <td className="text-warning font-medium">{stats.entrevistado}</td>
                      <td className="text-primary font-medium">{stats.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
