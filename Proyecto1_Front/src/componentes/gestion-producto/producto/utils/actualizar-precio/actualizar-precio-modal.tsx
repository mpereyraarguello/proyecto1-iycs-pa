import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { parseApiError } from "../../../../../utils/errores";
import EncabezadoFormularios from "../../../../ui/encabezadoFormularios";
import { Layers } from "lucide-react";
import { Producto } from "../../../../../interfaces/gestion-producto/producto/interfaces-producto";
import PorcentajeInput from "../../../../herramientas/formateo-de-campos/porcentaje-input";
import PriceInput from "../../../../herramientas/formateo-de-campos/price-input";
import { Button } from "../../../../ui/Button";
import { Card, CardContent, CardFooter } from "../../../../ui/Card";
import ProductoService from "../../services/producto-service";
import { getUsuarioId } from "../../../../../utils/auth";

interface ActualizarPrecioFormValues {
  costo: number;
  margen: number;
  motivo: string;
}

interface ActualizarPrecioModalProps {
  producto: Producto;
  onClose: () => void;
  onSuccess: (
    mensaje: string,
    datos: {
      costo: number;
      margen: number;
      motivo: string;
      precio: number;
    }
  ) => void;
}

export default function ActualizarPrecioModal({
  producto,
  onClose,
  onSuccess,
}: ActualizarPrecioModalProps) {
  const methods = useForm<ActualizarPrecioFormValues>({
    defaultValues: {
      costo: producto.costo || 0,
      margen: producto.margen || 0,
      motivo: "",
    },
  });

  const { watch, setValue } = methods;

  const costo = watch("costo");
  const margen = watch("margen");
  const motivo = watch("motivo");

  const [precioCalculado, setPrecioCalculado] = useState<number>(
    producto.precio || 0
  );

  const [calculandoPrecio, setCalculandoPrecio] = useState(false);
  const [registrandoHistorial, setRegistrandoHistorial] = useState(false);
  const [error, setError] = useState("");

  const handleCalcularPrecio = async () => {
    setError("");

    if (!costo || costo <= 0) {
      setError("El costo debe ser mayor a 0.");
      return;
    }

    if (margen === undefined || margen === null) {
      setError("El margen es obligatorio.");
      return;
    }

    try {
      setCalculandoPrecio(true);

      const response = await ProductoService.calcularPrecio({
        costo: Number(costo),
        margen: Number(margen),
      });

      setPrecioCalculado(response.precio);
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setCalculandoPrecio(false);
    }
  };


  const handleRegistrarHistorial = async () => {
    setError("");

    if (!precioCalculado || precioCalculado <= 0) {
        setError("Primero debés calcular el precio.");
        return;
    }

    if (!motivo.trim()) {
        setError("Debés ingresar un motivo para la actualización.");
        return;
    }

    setRegistrandoHistorial(true);

        const datos = {
        costo: Number(costo),
        margen: Number(margen),
        precio: precioCalculado,
        motivo: motivo.trim(),
        };

        console.log('CR-007: datos a enviar para registrar historial: ', datos);

       /* await ProductoService.registrarHistorialPrecio(producto.id, {
        ...datos,
        usuarioId: getUsuarioId(),
        });*/

        onSuccess("Actualización de precio guardada.", datos);
   
    };

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-black bg-opacity-50 z-50 overflow-y-auto py-5">
      <Card className="w-full max-w-3xl bg-white mx-auto shadow-lg rounded-2xl overflow-hidden relative mt-10 mb-12">
        <EncabezadoFormularios
          title="Actualización de Precio"
          subtitle={`Producto: ${producto.denominacion}`}
          icon={<Layers className="form-icon" />}
          onClose={onClose}
        />

        <FormProvider {...methods}>
          <form>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-6">
              <PriceInput
                name="costo"
                label="Costo"
                value={costo}
                onChange={(value) => {
                  setValue("costo", Number(value), {
                    shouldValidate: true,
                  });

                  setPrecioCalculado(0);
                }}
                maxDigits={9}
              />

              <PorcentajeInput
                name="margen"
                label="Margen"
                value={margen}
                onChange={(value) => {
                  setValue("margen", Number(value), {
                    shouldValidate: true,
                  });

                  setPrecioCalculado(0);
                }}
              />

              <PriceInput
                name="precioCalculado"
                label="Precio calculado"
                value={precioCalculado}
                onChange={() => {}}
                maxDigits={9}
                disabled={true}
              />

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleCalcularPrecio}
                  disabled={calculandoPrecio || !costo}
                  className="w-full"
                >
                  {calculandoPrecio
                    ? "Calculando..."
                    : "Calcular precio"}
                </Button>
              </div>

              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>

                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => {
                    setValue("motivo", e.target.value);
                  }}
                  placeholder="Ingresá el motivo de la actualización"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>

            {error && (
              <div className="text-red-600 text-center mb-4 px-6">
                {error}
              </div>
            )}

            <CardFooter className="flex justify-center gap-3">
              <Button
                type="button"
                onClick={onClose}
                disabled={registrandoHistorial}
                className="btn btn-secondary"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleRegistrarHistorial}
                disabled={
                  registrandoHistorial ||
                  !precioCalculado ||
                  !motivo.trim()
                }
                className="btn btn-dark"
              >
                {registrandoHistorial
                  ? "Guardando..."
                  : "Guardar"}
              </Button>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}