import { useMemo } from "react";
import { formatPrice } from "../../../../herramientas/formateo-de-campos/fucion-formateo";
import { Column, TablaAGGrid } from "../../../../herramientas/tablas/tabla-flexible-ag-grid";
import { ProductoVistaPrevia } from "../interfaces/actualizacion-masiva.types";

interface Props {
  productos: ProductoVistaPrevia[];
}

export default function TablaVistaPrevia({ productos }: Props) {
  const columnas = useMemo<Column<ProductoVistaPrevia>[]>(
    () => [
      {
        header: "Código",
        accessor: "codigoProveedor",
        flex: 0.4,
        type: "text",
        align: "right",
        editable: false,
        scrollable: false,
      },
      {
        header: "Producto",
        accessor: "denominacion",
        flex: 1.4,
        type: "text",
        editable: false,
        scrollable: false,
      },
      {
        header: "Precio actual",
        accessor: "precioActual",
        flex: 0.5,
        type: "text",
        align: "right",
        editable: false,
        formatFunction: ({ value }) => <span>{formatPrice(value, "ARS")}</span>,
      },
      {
        header: "Precio nuevo",
        accessor: "precioNuevo",
        flex: 0.5,
        type: "text",
        align: "right",
        editable: false,
        formatFunction: ({ value, row }) => (
          <span className={row.esValido ? "font-semibold" : "font-semibold text-red-600"}>
            {formatPrice(value, "ARS")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="overflow-x-auto">
      <TablaAGGrid
        columns={columnas}
        data={productos}
        onUpdate={() => {}}
        actionsFlex={0}
        rowHeight={50}
        height={420}
        // Los productos que quedarían con precio <= 0 se resaltan (CA-006.5).
        getRowClass={(params: any) => (params.data?.esValido === false ? "bg-red-50 dark:bg-red-900/20" : "")}
      />
    </div>
  );
}
