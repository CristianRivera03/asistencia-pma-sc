import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [comunidad, setComunidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !fecha || !comunidad) {
      setMessage('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('fecha', fecha);
    formData.append('comunidad', comunidad);

    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const response = await fetch(`${API_URL}/api/asistencia/cargar-datos`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`Datos guardados exitosamente (${data.total} registros)`);
        setFile(null);
        setComunidad('');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-200 shadow-xl max-w-lg mx-auto">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Cargar Lista Diaria</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-semibold">Archivo DOCX</span></label>
            <input 
              type="file" 
              accept=".docx"
              onChange={(e) => setFile(e.target.files[0])}
              className="file-input file-input-bordered file-input-primary w-full"
            />
          </div>

          <div className="form-control w-full">
            <label className="label"><span className="label-text font-semibold">Fecha del Listado</span></label>
            <input 
              type="date" 
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control w-full">
            <label className="label"><span className="label-text font-semibold">Nombre de la Comunidad</span></label>
            <input 
              type="text" 
              placeholder="Ej. LA VIRGENCITA"
              value={comunidad}
              onChange={(e) => setComunidad(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary mt-4" 
            disabled={loading}
          >
            <UploadCloud size={20} />
            {loading ? 'Cargando...' : 'Subir e Importar'}
          </button>

          {message && (
            <div className={`alert mt-4 ${message.includes('Error') || message.includes('Por favor') ? 'alert-error' : 'alert-success'}`}>
              <span>{message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
