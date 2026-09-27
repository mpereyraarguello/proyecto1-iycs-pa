import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { CardContent, CardFooter } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import FormInput from "../../../herramientas/formateo-de-campos/form-input";
import React from "react";
import { Card } from "../../../ui/Card";
import ProductoService from "../services/producto-service";
import PriceInput from "../../../herramientas/formateo-de-campos/price-input";
import CantidadesInput from "../../../herramientas/formateo-de-campos/cantidades-input";
import { Producto, SelectPresentacion } from "../../../../interfaces/gestion-producto/producto/interfaces-producto";
import { SelectMarca } from "../../../../interfaces/gestion-producto/marca/interfaces-marca";
import { Linea, SelectLinea } from "../../../../interfaces/gestion-producto/linea/interfaces-linea";
import { AlicuotaIva, ResponsePost } from "../../../../interfaces/generales/interfaces-generales";
import Select from "react-select";
import { useEnterFocus } from "../../../herramientas/formateo-de-campos/movimiento-campos";
import { useConfiguracionSistema } from "../../../sistema/ConfiguracionSistemaContext";
import { parseApiError } from "../../../../utils/errores";
import { Layers } from "lucide-react";
import RegistrarActualizarMarcaForm from "../../marca/utils/registrar-actualizar-marca";
import { ItemProveedor } from "../../../../interfaces/gestion-producto/producto/interfaces-item-proveedor";
import { SelectSublinea } from "../../../../interfaces/gestion-producto/sublinea/interfaces-sublinea";
import { ItemsProveedorEnPayload } from "../interfaces/interfaces-validaciones-item-proveedor";
import { FormValues, schema, transformData, transformarItemsProdAlternativo } from "../interfaces/interfaces-validaciones-producto";
import LineasSelector from "../componentes/configuracion/lineas-selector";
import EncabezadoFormularios from "../../../ui/encabezadoFormularios";
import MarcasSelector from "../componentes/configuracion/marcas-selector";
import { getUsuarioId } from "../../../../utils/auth";
import RegistrarActualizarLineaForm from "../../linea/utils/registrar-actualizar-linea";
import PorcentajeInput from "../../../herramientas/formateo-de-campos/porcentaje-input";
import PresentacionesSelector from "../componentes/configuracion/presentacion-selector";
import GenerarDenominacionButton from "../componentes/boton-generar-denom";
import RegistrarActualizarPresentacionForm from "../../linea/utils/registrar-actualizar-presentacion";
import ActualizarPrecioModal from "./actualizar-precio/actualizar-precio-modal";


export default function RegistrarActualizarProductoForm({
  producto,
  onClose,
  onSuccess,
}: {
  producto?: Producto;
  onClose: () => void;
  onSuccess: (mensajeAlerta: string) => void;
}) {
  //===================== CONSTANTES VARIAS ============================================
  const usuarioId = getUsuarioId();

  const { configuracion } = useConfiguracionSistema();
  const [rStockCritico, setStockCritico] = useState(false);

  const [lineaSeleccionada, setLineaSeleccionada] = useState<Linea>({} as Linea);

  console.log("Configuración del sistema:", configuracion);

  const methods = useForm<FormValues>({
    resolver: yupResolver(schema(rStockCritico)),
   
  });

  

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
    watch,
    setError,
    control,
  } = methods;

  const costo = useWatch({
    control,
    name: "costo",
  });

  const margen = useWatch({
    control,
    name: "margen",
  });

  const precio = useWatch({
    control,
    name: "precio",
  });

  console.log("estos son los errores", errors);

  console.log("Producto que llega al formulario", producto);

  console.log("linea seleccionada", lineaSeleccionada);

  const [marcas, setMarcas] = React.useState<SelectMarca[]>([]);
  const [lineas, setLineas] = React.useState<SelectLinea[]>([]);
  const [presentaciones, setPresentaciones] = React.useState<SelectPresentacion[]>([]);

  //nuevo, para calcular el precio

  //pone a la denominación como vacia
  const [denominacionPresentacion, setDenominacionPresentacion] = useState(" ");

  //cambia el estado
  const [selectedPresentacion, setSelectedPresentacion] =
    React.useState<SelectPresentacion | null>(null);
  
  const [denominacionMarca, setDenominacionMarca] = useState(" ");
  const [denominacionLinea, setDenominacionLinea] = useState(" ");

  const [selectedLinea, setSelectedLinea] = React.useState<SelectLinea>();
  const [selectedMarca, setSelectedMarca] = React.useState<SelectMarca>();
  const [mostrarFormularioLinea, setMostrarFormularioLinea] = useState(false);
  const [mostrarFormularioMarca, setMostrarFormularioMarca] = useState(false);
  const [mostrarFormularioPresentacion, setMostrarFormularioPresentacion] =
  useState(false);

  const [mostrarModalPrecio, setMostrarModalPrecio] = useState(false);
  const [motivoActualizacionPrecio, setMotivoActualizacionPrecio] = useState("");

  const [itemProdAlternativoSinAgregar, setItemProdAlternativoSinAgregar] = useState(false);

  const stock = watch(`stock`);
  const stockMinimo = watch("stockMinimo");

  const utilizaStockMinimo = watch("utilizaStockMinimo");


  

  //=============================== CONSTANTES PARA MOVIMIENTO ENTRE CAMPOS ==================================
  const denominacionProductoRef = useRef<HTMLInputElement>(null);
  useEnterFocus(denominacionProductoRef);
  const observacionRef = useRef<HTMLInputElement>(null);

  const selectTipoProductoRef = useRef<HTMLDivElement>(null);

 
  const precioOfertaRef = useRef<HTMLInputElement>(null);
  const denominacionLineaRef = useRef<HTMLInputElement>(null);
  const selectLineaRef = useRef<HTMLDivElement>(null);
  const denominacionMarcaRef = useRef<HTMLInputElement>(null);
  const selectMarcaRef = useRef<HTMLDivElement>(null);

  const denominacionPresentacionRef = useRef<HTMLInputElement>(null);
  const selectPresentacionRef = useRef<HTMLDivElement>(null);

  const enterToObservacion = useEnterFocus(observacionRef);
  const enterToPrecioOferta = useEnterFocus(precioOfertaRef);
  const enterToDenominacionMarca = useEnterFocus(denominacionMarcaRef);

  //=============================== FUNCIONALIDAD ==================================



  useEffect(() => {
    setValue("stockMinimo", lineaSeleccionada.stockMinimo || 0);
    setValue("utilizaStockMinimo", lineaSeleccionada.utilizaStockMinimo || false);
  }, [lineaSeleccionada]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        if (producto) {
          console.log("🔄 CAMBIÓ PRODUCTO, CARGANDO VALORES:", producto);
          setValue("lineaId", producto.linea.id || 0);
          setSelectedLinea(producto.linea);

          setValue("marcaId", producto.marca.id || 0);
          setSelectedMarca(producto.marca);

          setValue("presentacionId", producto.presentacion?.id || 0);
          setSelectedPresentacion(producto.presentacion || null);

          
          setValue("denominacion", producto.denominacion || "");
          setValue("observacion", producto.observacion || null);
        
          setValue("stock", producto.stock || 0);
          setValue("costo", producto.costo || 0);
          setValue("margen", producto.margen || 0);
          setValue("precio", producto.precio || 0);
          
          //setValue("oferta", producto.oferta || false);
      
          setValue("stockMinimo", producto.stockMinimo || 0);
          setValue("utilizaStockMinimo", producto.utilizaStockMinimo || false);
        
        
          console.error("llega aca", producto);
        
        }
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      }
    };

    fetchData();
  }, [producto]);

  const onSubmit = async (formData: FormValues) => {
    let response: ResponsePost;

      // el precio lo calcula el backend, no se envía
      const { precio, ...datos } = formData;

      try {
        // ...tu validación de ítems sin agregar...

        if (producto) {
          const payload = {
            ...datos,
            usuarioUpdatedId: usuarioId,
             motivo: motivoActualizacionPrecio || undefined,
          };

          response = await ProductoService.actualizar(producto.id, payload);
        } else {
          const payload = {
            ...datos,
            usuarioCreatedId: usuarioId,
          };

          response = await ProductoService.nuevo(payload);
        }

        await onSuccess(response.mensaje);
        onClose();

    } catch (error) {
      const errorMessage = parseApiError(error);

      setError("root", {
        type: "manual",
        message: errorMessage,
      });
    }
  };

  const handleBuscarPorDenominacion = async (select: string) => {
    try {
      if (select === "LINEA") {
        const lineas = await ProductoService.obtenerTotales({ denominacion: denominacionLinea }, "lineas");
        if (lineas) {
          console.log("Lineas encontradas:", lineas);
          setLineas(lineas.data);
        } else {
          console.log("No se encontró una linea con la denominación ingresada.");
        }
      }
      if (select === "MARCA") {
        const marcas = await ProductoService.obtenerTotales({ denominacion: denominacionMarca }, "marcas");
        if (marcas) {
          console.log("Marcas encontradas:", marcas);
          setMarcas(marcas.data);
        } else {
          console.log("No se encontró una marca con la denominación ingresada.");
        }
      }
      if (select === "PRESENTACION") {
        const presentaciones = await ProductoService.obtenerTotales(
          { denominacion: denominacionPresentacion }, "presentaciones"
        );

        if(presentaciones){
          console.log("Presentaciones encontradas: ", presentaciones);
          setPresentaciones(presentaciones.data);
        }else{
          console.log("No se encontraron presentaciones.")
        }
      }
      
    } catch (error) {
      console.error("Error al buscar por código:", error);
    }
  };

  const handleCalcularPrecio = async () => {
    const costo = watch("costo");
    const margen = watch("margen");

    if (costo === undefined || costo === null) {
      setError("costo", {
        type: "manual",
        message: "El costo es obligatorio para calcular el precio.",
      });
      return;
    }

    if (margen === undefined || margen === null) {
      setError("margen", {
        type: "manual",
        message: "El margen es obligatorio para calcular el precio.",
      });
      return;
    }

    try {
   

      const response = await ProductoService.calcularPrecio({
        costo: Number(costo),
        margen: Number(margen),
      });

      setValue("precio", response.precio, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch (error) {
      const errorMessage = parseApiError(error);

      setError("root", {
        type: "manual",
        message: errorMessage,
      });
    } 
  };

  const handleEnterEnSelect = async (e: React.KeyboardEvent<HTMLInputElement>, select: string) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (select === "LINEA") {
        handleBuscarPorDenominacion("LINEA");
      }

      if (select === "MARCA") {
        handleBuscarPorDenominacion("MARCA");
      }

      if(select === "PRESENTACION"){
        handleBuscarPorDenominacion("PRESENTACION");
      }

      // Esperar un poco (opcional, si el botón hace una búsqueda antes)
      setTimeout(() => {
        let selectDiv: HTMLDivElement | null = null;

        if (select === "MARCA") {
          selectDiv = selectMarcaRef.current;
        }

        if (select === "LINEA") {
          selectDiv = selectLineaRef.current;
        }

        if(select==="PRESENTACION"){
          selectDiv = selectPresentacionRef.current;
        }

        if (select === "TIPO-PRODUCTO") {
          selectDiv = selectTipoProductoRef.current;
        }

        if (select === "ALICUOTA-IVA") {
          selectDiv = selectAlicuotaIvaRef.current;
        }

        if (selectDiv) {
          const input = selectDiv.querySelector("input");
          if (input) {
            input.focus();
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
          }
        }
      }, 300); // Ajustá este delay según el tiempo de búsqueda, si es necesario
    }
  };

  const lineaId = watch("lineaId");
  const marcaId = watch("marcaId");
  const presentacionId = watch("presentacionId");

  const deshabilitarGenerar = 
    (producto && producto.sistema > 0) || 
    !lineaId || 
    !marcaId || 
    !presentacionId;



  return (
    <div className="fixed inset-0 flex items-start justify-center bg-black bg-opacity-50 z-50 overflow-y-auto py-5">
      <Card className="w-full max-w-7xl bg-white mx-auto shadow-lg rounded-2xl overflow-hidden relative mt-10 mb-12">
        <EncabezadoFormularios
          title={producto ? "Producto" : "Registrar Producto"}
          subtitle={
            producto
              ? "Visualización o modificación del producto."
            : "Ingresa los datos."
          }
          icon={<Layers className="form-icon" />}
          onClose={onClose}
        />  

        {/* Formulario */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
  {/* ================= COLUMNA IZQUIERDA ================= */}
  <div className="flex flex-col gap-4">
    <FormInput
      name="denominacion"
      label="Denominación"
      placeholder="Ingresa la denominación"
      disabled={producto && producto.sistema > 0 ? true : false}
      onKeyDown={enterToObservacion}
      inputRef={denominacionProductoRef}
    />

    {/* Costo, margen, precio y calcular en una fila */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      <PriceInput
        name="costo"
        label="Costo"
        value={costo || 0}
        onChange={(value) =>
          setValue("costo", value, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
        maxDigits={9}
        disabled={!!producto}
      />

      <PorcentajeInput
        name="margen"
        label="Margen"
        value={margen || 0}
        onChange={(value) =>
          setValue("margen", value, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
        disabled={!!producto}
      />

      <PriceInput
        name="precio"
        label="Precio"
        value={precio || 0}
        onChange={() => {}}
        maxDigits={9}
        disabled={true}
      />

      <Button
        type="button"
        onClick={handleCalcularPrecio}
        disabled={
          !!producto ||
          !watch("costo") ||
          watch("margen") === undefined
        }
        className="w-full"
      >
        Calcular precio
      </Button>
    </div>

    {/* Actualización de precio debajo */}
    <div>
      <Button
        type="button"
        onClick={() => setMostrarModalPrecio(true)}
        disabled={!producto}
      >
        Actualización de Precio
      </Button>
    </div>

    {/* Stock y stock crítico */}
    <div className="flex flex-wrap items-end gap-4">
      {producto ? (
        <div className="min-w-[120px] flex-1">
          <CantidadesInput
            name="stock"
            label="Stock"
            value={stock || 0}
            onChange={(value) => setValue("stock", Number(value))}
            disabled={true}
          />
        </div>
      ) : null}

      <div className="flex items-end gap-2 min-w-[180px] flex-1">
        <input
          type="checkbox"
          {...methods.register("utilizaStockMinimo")}
          className="w-5 h-5 mb-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={producto && producto.sistema > 0 ? true : false}
        />

        <CantidadesInput
          name="stockMinimo"
          label="Stock Crítico"
          value={stockMinimo || 0}
          onChange={(value) => setValue("stockMinimo", Number(value))}
          disabled={utilizaStockMinimo ? false : true}
        />
      </div>
    </div>
  </div>

  {/* ================= COLUMNA DERECHA ================= */}
  <div className="flex flex-col gap-2">
    <LineasSelector
      denominacionLinea={denominacionLinea}
      setDenominacionLinea={setDenominacionLinea}
      denominacionLineaRef={denominacionLineaRef}
      selectLineaRef={selectLineaRef}
      lineas={lineas}
      selectedLinea={selectedLinea}
      lineaId={watch("lineaId")}
      disabled={producto && producto.sistema > 0}
      errors={errors}
      onEnterLinea={(e) => handleEnterEnSelect(e, "LINEA")}
      onEnterDenominacion={enterToDenominacionMarca}
      onLineaChange={(linea) => {
        methods.setValue("lineaId", linea?.id || 0);
        setLineaSeleccionada(linea as any);
      }}
      onAgregarLinea={() => setMostrarFormularioLinea(true)}
    />

    <MarcasSelector
      denominacionMarca={denominacionMarca}
      setDenominacionMarca={setDenominacionMarca}
      denominacionMarcaRef={denominacionMarcaRef}
      selectMarcaRef={selectMarcaRef}
      marcas={marcas}
      selectedMarca={selectedMarca}
      marcaId={watch("marcaId")}
      disabled={producto && producto.sistema > 0}
      error={errors.marcaId?.message}
      onEnterMarca={(e) => handleEnterEnSelect(e, "MARCA")}
      onChangeMarca={(marca) => {
        methods.setValue("marcaId", marca?.id || 0);
      }}
      onAgregarMarca={() => setMostrarFormularioMarca(true)}
    />

    <PresentacionesSelector
      denominacionPresentacion={denominacionPresentacion}
      setDenominacionPresentacion={setDenominacionPresentacion}
      denominacionPresentacionRef={denominacionPresentacionRef}
      selectPresentacionRef={selectPresentacionRef}
      presentaciones={presentaciones}
      selectedPresentacion={selectedPresentacion}
      presentacionId={watch("presentacionId")}
      disabled={producto && producto.sistema > 0}
      error={errors.presentacionId?.message}
      onEnterPresentacion={(e) => handleEnterEnSelect(e, "PRESENTACION")}
      onChangePresentacion={(presentacion) => {
        setSelectedPresentacion(presentacion);
        methods.setValue("presentacionId", presentacion?.id || 0);
      }}
      onAgregarPresentacion={() => setMostrarFormularioPresentacion(true)}
    />

    <GenerarDenominacionButton disabled={deshabilitarGenerar} />
  </div>
</CardContent>

            {errors.root?.message && <div className="text-red-600 text-center mb-4">{String(errors.root.message)}</div>}

            {/* Botón de submit */}
            <CardFooter className="flex justify-center">
              <Button type="submit" disabled={isSubmitting} className="btn btn-dark">
                {isSubmitting
                  ? producto
                    ? "Actualizando..."
                    : "Registrando..."
                  : producto
                  ? "Actualizar"
                  : "Registrar"}
              </Button>
            </CardFooter>
          </form>
        </FormProvider>

        {mostrarFormularioLinea && (
          <RegistrarActualizarLineaForm
            onClose={() => setMostrarFormularioLinea(false)}
            onSuccess={() => {
              setMostrarFormularioLinea(false);
              handleBuscarPorDenominacion("LINEA")
            }}
          />
        )}


        {mostrarFormularioMarca && (
          <RegistrarActualizarMarcaForm
            onClose={() => setMostrarFormularioMarca(false)}
            onSuccess={() => {
              setMostrarFormularioMarca(false);
              handleBuscarPorDenominacion("MARCA")
            }}
          />
        )}

        {mostrarFormularioPresentacion && (
          <RegistrarActualizarPresentacionForm
            onClose={() => setMostrarFormularioPresentacion(false)}
            onSuccess={async (mensaje) => {
              setMostrarFormularioPresentacion(false);

              await handleBuscarPorDenominacion("PRESENTACION");

              onSuccess(mensaje);
            }}
          />
        )}

        {mostrarModalPrecio && producto && (
          <ActualizarPrecioModal
            producto={producto}
            onClose={() => setMostrarModalPrecio(false)}
            onSuccess={(mensaje, datos) => {
              console.log("DATOS RECIBIDOS:", datos);

              setValue("costo", datos.costo, {
                shouldValidate: true,
                shouldDirty: true,
              });

              setValue("margen", datos.margen, {
                shouldValidate: true,
                shouldDirty: true,
              });

              setValue("precio", datos.precio, {
                shouldValidate: true,
                shouldDirty: true,
              });

              setMotivoActualizacionPrecio(datos.motivo);
              setMostrarModalPrecio(false);

            }}
          />
        )}

       
      </Card>
    </div>
  );
}
