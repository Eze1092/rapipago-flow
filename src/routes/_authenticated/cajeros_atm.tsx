
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Landmark, RefreshCw } from 'lucide-react';

export const Route = { component: CajeroAtmComponent };

function CajeroAtmComponent() {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importe, setImporte] = useState('');
  const [tipo, setTipo] = useState<'CARGA' | 'REINTEGRO'>('CARGA');
  const [observaciones, setObservaciones] = useState('');

  // 1. Cargar movimientos desde Supabase
  const cargarMovimientos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('movimientos_atm')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMovimientos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarMovimientos();
  }, []);

  // 2. Registrar un nuevo movimiento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importe || parseFloat(importe) <= 0) return;

    const { error } = await supabase.from('movimientos_atm').insert([
      {
        tipo,
        importe: parseFloat(importe),
        observaciones,
        estado: 'REGISTRADO'
      },
    ]);

    if (!error) {
      setImporte('');
      setObservaciones('');
      cargarMovimientos();
    }
  };

  // 3. Eliminar un movimiento (¡Función desbloqueada!)
  const eliminarMovimiento = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      const { error } = await supabase
        .from('movimientos_atm')
        .delete()
        .eq('id', id);

      if (!error) {
        cargarMovimientos();
      } else {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Movimientos de Cajero Automático (ATM)
        </h1>
        <button 
          onClick={cargarMovimientos} 
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Formulario de registro */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Operación</label>
          <select 
            value={tipo} 
            onChange={(e: any) => setTipo(e.target.value)}
            className="w-full p-2 border rounded-lg bg-background"
          >
            <option value="CARGA">CARGA (+)</option>
            <option value="REINTEGRO">REINTEGRO (-)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Importe</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="w-full p-2 border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <input 
            type="text" 
            placeholder="Detalle..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full p-2 border rounded-lg bg-background"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full bg-primary text-primary-foreground p-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Registrar
          </button>
        </div>
      </form>

      {/* Tabla de registros */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b text-sm font-medium text-muted-foreground">
              <th className="p-3">Fecha / Hora</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Importe</th>
              <th className="p-3">Observaciones</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-muted-foreground">No hay movimientos registrados.</td>
              </tr>
            ) : (
              movimientos.map((mov) => (
                <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">{mov.fecha} {mov.hora.substring(0, 5)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${mov.tipo === 'CARGA' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td className="p-3 font-medium">\${mov.importe.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{mov.observaciones || '-'}</td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => eliminarMovimiento(mov.id)}
                      className="text-destructive p-1 hover:bg-destructive/10 rounded-md transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                       </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
