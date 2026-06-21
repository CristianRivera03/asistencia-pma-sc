import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadForm from './components/UploadForm';
import AttendanceList from './components/AttendanceList';
import Reports from './components/Reports';
import { Upload, ListTodo, FileBarChart, Moon, Sun } from 'lucide-react';
import './index.css';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'bumblebee');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'bumblebee' ? 'dark' : 'bumblebee');
  };

  return (
    <Router>
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="navbar bg-base-200 rounded-box shadow-md mb-8 px-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary">Asistencia PMA SC</h1>
          </div>
          <nav className="flex-none gap-2">
            <Link to="/" className="btn btn-ghost"><Upload size={18} /> Cargar</Link>
            <Link to="/asistencia" className="btn btn-ghost"><ListTodo size={18} /> Asistencia</Link>
            <Link to="/reportes" className="btn btn-ghost"><FileBarChart size={18} /> Reportes</Link>
            
            <button onClick={toggleTheme} className="btn btn-circle btn-ghost ml-2" title="Cambiar Tema">
              {theme === 'bumblebee' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<UploadForm />} />
            <Route path="/asistencia" element={<AttendanceList />} />
            <Route path="/reportes" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
