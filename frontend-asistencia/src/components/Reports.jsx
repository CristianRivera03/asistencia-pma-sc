import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search } from 'lucide-react';

export default function Reports() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

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
  const totalEntrevistadosSinScope = registros.filter(r => r.entrevistado && !r.scope).length;

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

  const filteredRecords = registros.filter(reg => {
    let matchFilter = true;
    if (filterType === 'Asistieron') matchFilter = reg.asistio;
    else if (filterType === 'Entrevistados') matchFilter = reg.entrevistado;
    else if (filterType === 'Scope') matchFilter = reg.scope;
    else if (filterType === 'Entrevistados sin Scope') matchFilter = reg.entrevistado && !reg.scope;
    
    if (!matchFilter) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchName = reg.nombre.toLowerCase().includes(term);
      const matchCommunity = reg.comunidad.toLowerCase().includes(term);
      return matchName || matchCommunity;
    }

    return true;
  });

  const exportToExcel = () => {
    if (filteredRecords.length === 0) return alert('No hay datos para exportar.');
    
    // Formatting data for Excel
    const dataToExport = filteredRecords.map((reg, index) => ({
      'N°': index + 1,
      'Comunidad': reg.comunidad,
      'Nombre Completo': reg.nombre,
      'Teléfono': reg.telefono,
      'Asistió': reg.asistio ? 'Sí' : 'No',
      'Entrevistado': reg.entrevistado ? 'Sí' : 'No',
      'Pasó a Scope': reg.scope ? 'Sí' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Reporte ${filterType}`);
    
    // Download
    XLSX.writeFile(workbook, `Asistencia_${fecha}_${filterType}.xlsx`);
  };

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
      {/* Date Picker */}
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
            <h3 className="text-xl font-bold mb-6 border-b border-base-300 pb-2">Desglose por Comunidad</h3>
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

          {/* Detailed Filters & Export */}
          <div className="bg-base-200 p-6 rounded-box shadow-md">
            <div className="flex flex-col gap-4 mb-6 border-b border-base-300 pb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-xl font-bold">Lista Detallada</h3>
                <div className="flex w-full md:w-auto gap-2">
                  <div className="relative w-full md:w-64">
                    <Search size={18} className="absolute left-3 top-3 text-base-content/50" />
                    <input 
                      type="text" 
                      placeholder="Buscar persona o comunidad..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input input-bordered w-full pl-10 h-12"
                    />
                  </div>
                  <button onClick={exportToExcel} className="btn btn-success text-white h-12">
                    <Download size={18} /> <span className="hidden sm:inline">Exportar Excel</span>
                  </button>
                </div>
              </div>
              
              {/* Scrollable chips for mobile */}
              <div className="flex gap-2 overflow-x-auto pb-2 w-full max-w-[90vw] md:max-w-none">
                {['Todos', 'Asistieron', 'Entrevistados', 'Scope', 'Entrevistados sin Scope'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`btn btn-sm rounded-full whitespace-nowrap ${filterType === f ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}
                  >
                    {f} ({
                      f === 'Todos' ? totalPersonas : 
                      f === 'Asistieron' ? totalAsistencias : 
                      f === 'Entrevistados' ? totalEntrevistados : 
                      f === 'Scope' ? totalScope : totalEntrevistadosSinScope
                    })
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table table-zebra w-full bg-base-100 rounded-box">
                <thead>
                  <tr>
                    <th>Comunidad</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Asistió</th>
                    <th>Entrevistado</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(reg => (
                    <tr key={reg.id}>
                      <td className="text-sm">{reg.comunidad}</td>
                      <td className="font-semibold">{reg.nombre}</td>
                      <td className="text-sm">{reg.telefono}</td>
                      <td>{reg.asistio ? <span className="badge badge-success badge-sm text-white">Sí</span> : <span className="badge badge-ghost badge-sm">No</span>}</td>
                      <td>{reg.entrevistado ? <span className="badge badge-warning badge-sm text-white">Sí</span> : <span className="badge badge-ghost badge-sm">No</span>}</td>
                      <td>{reg.scope ? <span className="badge badge-primary badge-sm text-white">Sí</span> : <span className="badge badge-ghost badge-sm">No</span>}</td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-4">No hay resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on desktop) */}
            <div className="md:hidden flex flex-col gap-3">
              {filteredRecords.map(reg => (
                <div key={reg.id} className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body p-4">
                    <p className="text-xs text-primary font-bold">{reg.comunidad}</p>
                    <h4 className="font-bold text-lg">{reg.nombre}</h4>
                    <p className="text-sm text-base-content/70">Tel: {reg.telefono}</p>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-base-200 text-sm">
                      <div className="flex items-center gap-1">
                        <span>Asistió:</span> {reg.asistio ? <span className="text-success font-bold">Sí</span> : <span className="text-base-content/40">No</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Entr.:</span> {reg.entrevistado ? <span className="text-warning font-bold">Sí</span> : <span className="text-base-content/40">No</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Scope:</span> {reg.scope ? <span className="text-primary font-bold">Sí</span> : <span className="text-base-content/40">No</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="text-center py-4">No hay resultados.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
