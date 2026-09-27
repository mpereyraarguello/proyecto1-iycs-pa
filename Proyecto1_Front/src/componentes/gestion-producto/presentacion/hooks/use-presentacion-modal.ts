import { useState } from "react";
import { Auditoria } from "../../../../interfaces/generales/interfaces-generales";
import { Presentacion } from "../../../../interfaces/gestion-producto/presentacion/interfaces-presentacion";

export type PresentacionModalTipo = "alta" | "edicion" | "auditoria" | null;

export function usePresentacionModal() {
  const [tipo, setTipo] = useState<PresentacionModalTipo>(null);
  const [presentacion, setPresentacion] = useState<Presentacion | null>(null);
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);

  const abrirAlta = () => {
    setPresentacion(null);
    setAuditoria(null);
    setTipo("alta");
  };

  const abrirEdicion = (item: Presentacion) => {
    setPresentacion(item);
    setAuditoria(null);
    setTipo("edicion");
  };

  const abrirAuditoria = (item: Auditoria) => {
    setAuditoria(item);
    setPresentacion(null);
    setTipo("auditoria");
  };

  const cerrar = () => {
    setTipo(null);
    setPresentacion(null);
    setAuditoria(null);
  };

  return {
    tipo,
    presentacion,
    auditoria,
    abrirAlta,
    abrirEdicion,
    abrirAuditoria,
    cerrar,
  };
}

