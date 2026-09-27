import { useEffect, useState } from "react";
import Paginacion from "../../../herramientas/reutilizables/paginacion";
import { Card, CardContent, CardHeader } from "../../../ui/Card";
import { useFiltrosContext } from "../../../../context/filtros-contesxt";
import { Alertas, TipoAlerta, TituloAlerta, useAlerts } from "../../../herramientas/alertas/alertas";
import {
  TipoAlertaConfirmacion,
  TituloAlertaConfirmacion,
  useConfirmation,
} from "../../../herramientas/alertas/alertas-confirmacion";
import { Auditoria, ResponsePost } from "../../../../interfaces/generales/interfaces-generales";
import { getUsuarioId } from "../../../../utils/auth";
import { Presentacion } from "../../../../interfaces/gestion-producto/presentacion/interfaces-presentacion";
import { usePresentacionModal } from "../hooks/use-presentacion-modal";
import { FiltrosPresentacion, FiltrosPresentacionValues } from "../components/filtros-presentacion";
import PresentacionService from "../services/presentacion-service";
import { HeaderPresentacion } from "../components/header";
import { HeaderLgPresentacion } from "../components/header-lg";
import { DatosTablaPresentacion } from "../components/datos-tabla";
import { DatosCardsPresentacion } from "../components/datos-card";
import { PresentacionModal } from "../modales/presentacion-modal";

const NOMBRE_COMPONENTE = "consultar-presentacion";

export default function ConsultarPresentacion() {
  // ===========================
  // ESTADOS PRINCIPALES
  // ===========================
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const { alerts, addAlert, removeAlert } = useAlerts();
  const { showConfirmation, AlertasConfirmacion } = useConfirmation();

  const modal = usePresentacionModal();
  const usuarioId = getUsuarioId();

  // ===========================
  // FILTROS LOCALES
  // ===========================
  const [filtrosPresentacion, setFiltrosPresentacion] = useState<FiltrosPresentacionValues>({ denominacion: "" });

  // ===========================
  // PAGINACIÓN
  // ===========================
  const [paginaActual, setPaginaActual] = useState(1);
  const [entidadesTotales, setEntidadesTotales] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(10);

  // ===========================
  // FILTROS CONTEXTO
  // ===========================
  const [filtrosInicializados, setFiltrosInicializados] = useState(false);
  const { setFiltrosNecesarios, limpiarFiltros, buscar, setBuscar } = useFiltrosContext();

  useEffect(() => {
    limpiarFiltros();
    setBuscar({ cont: 0, componente: NOMBRE_COMPONENTE });
    setFiltrosNecesarios({ denominacion: true });
    setFiltrosInicializados(true);
  }, []);

  useEffect(() => {
    if (buscar.cont > 0 && buscar.componente === NOMBRE_COMPONENTE) {
      handleBuscarPresentaciones(true);
    }
  }, [buscar]);

  // ===========================
  // CRUD / ACCIONES
  // ===========================
  const handleAltaPresentacion = () => {
    modal.abrirAlta();
  };

  const handleAbrirEdicion = async (id: number) => {
    const presentacion = await PresentacionService.obtenerId(id);
    modal.abrirEdicion(presentacion);
  };

  const handleMostrarInfo = async (id: number) => {
    const auditoria = await PresentacionService.obtenerAuditoria(id);
    modal.abrirAuditoria(auditoria);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirmation({
      type: TipoAlertaConfirmacion.DESTRUCTIVE,
      title: TituloAlertaConfirmacion.DESTRUCTIVE,
      message: "¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: () => {},
    });

    if (!confirmed) return;

    try {
      const response: ResponsePost = await PresentacionService.eliminar(id, usuarioId);
      setPresentaciones((prev) => prev.filter((l) => l.id !== id));

      addAlert({
        type: TipoAlerta.SUCCESS,
        title: TituloAlerta.SUCCESS,
        message: response.mensaje,
        autoClose: true,
      });
    } catch {
      addAlert({
        type: TipoAlerta.ERROR,
        title: TituloAlerta.ERROR,
        message: "No se puede eliminar este elemento porque está siendo utilizado por uno o más productos.",
        autoClose: true,
      });
    }
  };

  // ===========================
  // BÚSQUEDA
  // ===========================
  const handleBuscarPresentaciones = async (botonBuscar?: boolean) => {
    if (botonBuscar) {
      setSkip(0);
      setPaginaActual(1);
    }

    setLoading(true);

    const filtrosConPaginacion = {
      denominacion: filtrosPresentacion.denominacion,
      ...(filtrosPresentacion.incluirEliminados ? { incluirEliminados: true } : {}),
      skip,
      take,
    };

    const response = await PresentacionService.obtener(filtrosConPaginacion);

    setPresentaciones(response.data);
    setEntidadesTotales(response.total);
    setLoading(false);
  };

  const handleBuscarDesdeFiltro = (filtros: FiltrosPresentacionValues) => {
    setFiltrosPresentacion(filtros);
  };

  useEffect(() => {
    if (filtrosInicializados) {
      handleBuscarPresentaciones();
    }
  }, [paginaActual, filtrosInicializados]);

  useEffect(() => {
    if (filtrosInicializados) {
      handleBuscarPresentaciones(true);
    }
  }, [filtrosPresentacion]);

  const handleImprimirTodo = async () => {
    const pdfBlob = await PresentacionService.imprimirTodo();
    const fileURL = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
    window.open(fileURL, "_blank");
  };

  const handleImprimirPagina = async () => {
    const pdfBlob = await PresentacionService.imprimirPagina();
    const fileURL = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
    window.open(fileURL, "_blank");
  };

  const handlePageChange = (skip: number, take: number, paginaActual: number) => {
    setSkip(skip);
    setTake(take);
    setPaginaActual(paginaActual);
  };

  // ===========================
  // SUCCESS MODAL
  // ===========================
  const handleSuccess = async (mensajeAlerta: string) => {
    modal.cerrar();

    addAlert({
      type: TipoAlerta.SUCCESS,
      title: TituloAlerta.SUCCESS,
      message: mensajeAlerta,
      autoClose: true,
    });

    await handleBuscarPresentaciones();
  };

  // ===========================
  // RENDER
  // ===========================
  if (error) {
    return (
      <div className="w-full p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <>
        <Card>
          <CardHeader className="flex justify-between">
            <div className="hidden lg:block">
              <HeaderPresentacion
                entidadesTotales={entidadesTotales}
                datosLength={presentaciones.length}
                paginaActual={paginaActual}
                openModal={handleAltaPresentacion}
                handleImprimirTodo={handleImprimirTodo}
                handleImprimirPagina={handleImprimirPagina}
              />
            </div>

            <div className="lg:hidden">
              <HeaderLgPresentacion
                entidadesTotales={entidadesTotales}
                datosLength={presentaciones.length}
                paginaActual={paginaActual}
                openModal={handleAltaPresentacion}
                handleImprimirTodo={handleImprimirTodo}
                handleImprimirPagina={handleImprimirPagina}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <FiltrosPresentacion onBuscar={handleBuscarDesdeFiltro} mostrarIncluirEliminados />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
                <p className="text-gray-600 text-lg">Cargando presentaciones...</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden lg:block">
                  <DatosTablaPresentacion
                    presentaciones={presentaciones}
                    onEditar={handleAbrirEdicion}
                    onInfo={handleMostrarInfo}
                    onDelete={handleDelete}
                  />
                </div>

                {/* Mobile */}
                <div className="lg:hidden space-y-4">
                  {presentaciones.map((presentacion) => (
                    <DatosCardsPresentacion
                      key={presentacion.id}
                      presentacion={presentacion}
                      onEditar={handleAbrirEdicion}
                      onInfo={handleMostrarInfo}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Paginacion
            entidadesTotales={entidadesTotales}
            take={take}
            paginaActual={paginaActual}
            onChange={handlePageChange}
          />
        </div>

        <Alertas alerts={alerts} onRemove={removeAlert} />
        <AlertasConfirmacion />
      </>

      {/* MODAL ÚNICO */}
      <PresentacionModal
        open={modal.tipo !== null}
        tipo={modal.tipo}
        presentacion={modal.presentacion}
        auditoria={modal.auditoria as Auditoria | null}
        onClose={modal.cerrar}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

