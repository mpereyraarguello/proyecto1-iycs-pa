import { Producto } from './producto.entity';
import { HistorialPrecio } from './historial-precio.entity';
import { Precio } from '../value-objects/previo.vo';
import { PrecioInvalidoException } from '../exceptions/precio-invalido.exception';
import { ProductoCalculoHelper } from '../helpers/producto-calculos.helper';

/**
 * CP-007-02 – Registrar historial al modificar el precio de un producto (CA-007.2)
 * Test unitario de dominio: no toca base de datos ni Nest.
 */
describe('Producto.actualizarPrecioconHistorial (CP-007-02)', () => {
  const FECHA_FIJA = new Date('2026-09-23T15:30:00.000Z');

  const crearProducto = (precioActual = 1150): Producto => {
    const producto = new Producto();
    producto.id = 1;
    producto.denominacion = 'Yerba Mate 1kg';
    producto.margen = 30;
    producto.costo = 800;
    producto.precio = Precio.crear(precioActual);
    return producto;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FECHA_FIJA);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('registra un historial con precio anterior $1150, nuevo $1300, fecha y motivo "Aumento de costo del proveedor"', () => {
    // Dado un producto con precio actual $1150
    const producto = crearProducto(1150);

    // Cuando se actualiza el precio a $1300 con el motivo indicado
    const historial = producto.actualizarPrecioconHistorial(
      1300,
      'Aumento de costo del proveedor',
      10,
    );

    // Entonces se registra el historial esperado
    expect(historial).toBeInstanceOf(HistorialPrecio);
    expect(historial.precioAnterior).toBe(1150);
    expect(historial.precioNuevo).toBe(1300);
    expect(historial.motivo).toBe('Aumento de costo del proveedor');
    expect(historial.fecha).toEqual(FECHA_FIJA);
    expect(historial.usuarioId).toBe(10);
    expect(historial.producto).toBe(producto);
  });

})