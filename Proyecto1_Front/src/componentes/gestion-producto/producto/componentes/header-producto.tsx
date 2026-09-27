import { Package, PlusCircle, Search, X , History, TrendingUp} from "lucide-react";
import { Button } from "../../../ui/Button";
import { CardHeader, CardTitle } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { EstadisticasSimples } from "../../../herramientas/reutilizables/estadisticas-simples";
//import { ImpresionForm } from "../../../herramientas/reutilizables/impresion-form";
import {
  puedeActualizarPreciosMasivo,
  puedeAgregarProducto,
  puedeVerHistorialPrecios,
} from "../domain/permisos-producto";
import { BotonNavegacion } from "./boton-navegacion";

interface Props {
  roles:number[];
  busqueda: string;
  onChangeBusqueda: (value: string) => void;
  onBuscarParcial: () => void;
  onLimpiarBusqueda: () => void;
  onNuevo: () => void;
  total: number;
  mostrados: number;
  //paginaActual: number;  la comento porque solo la usa impresion-form y no la estamos usando por ahora
  //onImprimirTodo: () => void;
  //onImprimirPagina: () => void;
}

export function ProductosHeader({
  roles,
  busqueda,
  onChangeBusqueda,
  onBuscarParcial,
  onLimpiarBusqueda, 
  onNuevo,
  total,
  mostrados,
  //paginaActual,
  //onImprimirTodo,
  //onImprimirPagina,
}: Props) {
  console.log("¿PUEDE AGREGAR?:", puedeAgregarProducto(roles));
  return (
    <CardHeader className="flex flex-col md:flex-row gap-4 p-4">
      <div className="flex flex-col md:flex-row flex-wrap gap-4 w-full">
        <CardTitle className="flex items-center gap-2">
          <Package className="consultar-icon" />
          <span>Productos</span>
        </CardTitle>

        {/* Buscador productos parcial */}
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

            <Input
              value={busqueda}
              placeholder="Buscar producto..."
              className="h-11 w-full pl-10 pr-24 text-black bg-white border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => onChangeBusqueda(e.target.value)}   // <-- faltaba
              onKeyDown={(e) => {
                if (e.key === "Enter" && busqueda.trim().length >= 2) {
                  onBuscarParcial();
                }
              }}
            />

            {/* Limpiar */}
            {busqueda && (
              <button
                type="button"
                onClick={onLimpiarBusqueda}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded-md bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Buscar */}
            <button
              type="button"
              disabled={busqueda.trim().length < 2}
              onClick={onBuscarParcial}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 p-0 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Buscar producto"
            >
              <Search className="w-4 h-4" />   {/* <-- sin absolute ni text-gray-400 */}
            </button>
          </div>

          {/* Ayuda */}
          {busqueda.length > 0 && busqueda.trim().length < 2 && (
            <span className="text-xs text-gray-500 ml-1">
              *Ingresá al menos 2 caracteres para buscar
            </span>
          )}
        </div>

        <EstadisticasSimples filtrados={total} mostrados={mostrados} />
      </div>

      <div className="flex gap-2">
        {/*<ImpresionForm  este es el boton de imprimir
         entityName="Productos"
         onImprimirTodo={onImprimirTodo}
         onImprimirPagina={onImprimirPagina}
         totalItems={total}
         currentPage={paginaActual}
        >*/}
        
        {puedeVerHistorialPrecios(roles) && (
          <BotonNavegacion ruta="/admin/historial-precios" texto="Historial de precios" icono={History} />
        )}
        {puedeActualizarPreciosMasivo(roles) && (
          <BotonNavegacion ruta="/admin/actualizacion-masiva" texto="Actualización masiva" icono={TrendingUp} />
        )}
        {puedeAgregarProducto(roles) && (
           <Button onClick={onNuevo} className="bg-blue-500 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir
        </Button>
        )}
      </div>
    </CardHeader>
  );
}
