import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { CardContent, CardFooter } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import FormInput from "../../../herramientas/formateo-de-campos/form-input";
import { Card } from "../../../ui/Card";

import { Presentacion } from "../../../../interfaces/gestion-producto/presentacion/interfaces-presentacion";

import {
  TipoAlertaConfirmacion,
  TituloAlertaConfirmacion,
  useConfirmation,
} from "../../../herramientas/alertas/alertas-confirmacion";

import { PackageCheck } from "lucide-react";
import EncabezadoFormularios from "../../../ui/encabezadoFormularios";

import { getUsuarioId } from "../../../../utils/auth";
import { parseApiError } from "../../../../utils/errores";
import { ResponsePost } from "../../../../interfaces/generales/interfaces-generales";
import PresentacionService from "../services/presentacion-service";

interface FormValues {
  denominacion: string;
  observacion?: string | null;
}

const schema = yup.object({
  denominacion: yup
    .string()
    .trim()
    .required("La denominación es obligatoria.")
    .max(255, "Máximo 255 caracteres.")
    .matches(
      /^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ]+$/,
      "La denominación solo puede contener letras, números y espacios."
    ),

  observacion: yup
    .string()
    .nullable()
    .optional(),
});

const NOMBRE_ENTIDAD = "Presentación";

export default function RegistrarActualizarPresentacionForm({
  presentacion,
  onClose,
  onSuccess,
}: {
  presentacion?: Presentacion;
  onClose: () => void;
  onSuccess: (mensajeAlerta: string) => void;
}) {
  const usuarioId = getUsuarioId();

  const { showConfirmation, AlertasConfirmacion } = useConfirmation();

  const methods = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      denominacion: "",
      observacion: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
    setError,
  } = methods;

  const isEdit = !!presentacion;

  useEffect(() => {
    if (presentacion) {
      setValue("denominacion", presentacion.denominacion || "");
      setValue("observacion", presentacion.observacion || "");
    }
  }, [presentacion, setValue]);

  const onSubmit = async (formData: FormValues) => {
    let response: ResponsePost;

    try {
      if (presentacion) {
        const payload = {
          ...formData,
          usuarioUpdatedId: usuarioId,
        };

        response = await PresentacionService.actualizar(
          presentacion.id,
          payload
        );
      } else {
        const payload = {
          ...formData,
          usuarioCreatedId: usuarioId,
        };

        response = await PresentacionService.nuevo(payload);
      }

      onClose();
      onSuccess(response?.mensaje || "Operación realizada con éxito");

    } catch (error) {
      setError("root", {
        type: "manual",
        message: parseApiError(error),
      });
    }
  };

  const handleOnClose = async () => {
    const confirmed = await showConfirmation({
      type: TipoAlertaConfirmacion.DEFAULT,
      title: TituloAlertaConfirmacion.DEFAULT,
      message:
        "¿Estás seguro de que quieres cerrar el formulario? NO se guardaran los cambios.",
      confirmText: "Aceptar",
      cancelText: "Cancelar",
      onConfirm: () => {},
    });

    if (confirmed) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60]">
      <Card className="w-full max-w-2xl bg-white mx-auto shadow-lg rounded-2xl overflow-hidden">

        <EncabezadoFormularios
          title={
            presentacion
              ? `Actualizar ${NOMBRE_ENTIDAD}`
              : `Registrar ${NOMBRE_ENTIDAD}`
          }
          subtitle={
            presentacion
              ? "Modifica los datos de la presentación."
              : "Ingresa los datos de la nueva presentación."
          }
          icon={<PackageCheck className="form-icon" />}
          onClose={handleOnClose}
        />

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>

            <CardContent className="space-y-3 px-3 py-2">

              <FormInput
                name="denominacion"
                label="Denominación"
                placeholder="Ingresa la denominación (ej: BOTELLA 1L)"
                disabled={Boolean(presentacion?.sistema)}
              />

              <FormInput
                name="observacion"
                label="Observación"
                placeholder="Ingresa una observación (opcional)"
                disabled={Boolean(presentacion?.sistema)}
              />

            </CardContent>

            {errors.root?.message && (
              <div className="text-red-600 text-center mb-4">
                {String(errors.root.message)}
              </div>
            )}

            <CardFooter className="flex justify-center">

              <Button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-dark"
              >
                {isSubmitting
                  ? isEdit
                    ? "Actualizando..."
                    : "Registrando..."
                  : isEdit
                  ? "Actualizar"
                  : "Registrar"}
              </Button>

            </CardFooter>

          </form>
        </FormProvider>
      </Card>

      <AlertasConfirmacion />
    </div>
  );
}

