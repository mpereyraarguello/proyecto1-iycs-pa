import { ActualizarPreciosMasivosUseCase } from "./actualizar-precios-masivos.use-case";
import { ActualizarPreciosMasivosDto, TipoAjustePrecio } from "../../dto/actualizar-precios-masivos.dto";
import { PrecioInvalidoException } from '../../domain/exceptions/precio-invalido.exception';
import { PreciosMasivosInvalidosException } from '../../domain/exceptions/actualizacion-precios-masivos.exceptions';
import { ProductosNoEncontradosException } from '../../domain/exceptions/producto-noenecontrado.exceptions';
import { IProductoRepository } from '../../domain/interfaces/producto.repository-interface';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

//CR-006 - Actualización Masiva de Precios
describe('CR-006 - Actualización Masiva de Precios', () => {
    let useCase: ActualizarPreciosMasivosUseCase;
    let repository: IProductoRepository;

    const mockRepository = {
        findParaActualizacionPrecios: jest.fn<() => Promise<any>>(),
        guardarLoteConHistorial: jest.fn<() => Promise<void>>(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActualizarPreciosMasivosUseCase,
                { 
                    provide: 'IProductoRepository',
                    useValue: mockRepository },
            ],
        }).compile();

        useCase = module.get<ActualizarPreciosMasivosUseCase>(ActualizarPreciosMasivosUseCase);
        repository = module.get<IProductoRepository>('IProductoRepository');

        jest.clearAllMocks();
    });

    const crearMockProducto = (id: number, denominacion: string, precio: number) => {
        return {
            id,
            denominacion,
            precio,
            actualizarPrecioconHistorial: jest.fn((precioNuevo: number, motivo: string, usuarioId?: number) => {
                if (precioNuevo <= 0) {
                    throw new PrecioInvalidoException(id, denominacion, precio, precioNuevo);
                }
                return {
                    productoId: id,
                    precioAnterior: precio,
                    precioNuevo: precioNuevo,
                    motivo,
                    usuarioId,
                    fecha: new Date(),
                };
            })
        };
    };

    //CP-006-01
    it('CP-006-01: Seleccionar método de ajuste (porcentaje y con alcance por línea)', async () => {
        const dto: ActualizarPreciosMasivosDto = {
            tipoAjuste: TipoAjustePrecio.PORCENTAJE,
            valor: 10,
            motivo: 'Ajuste trimestral',
            lineaId: 1, // Línea: Gaseosas
        };
        mockRepository.findParaActualizacionPrecios.mockResolvedValue([
            crearMockProducto(1, 'Coca Cola 2L', 1150),
            crearMockProducto(2, 'Sprite 2L', 920),
        ]);
        mockRepository.guardarLoteConHistorial.mockResolvedValue(undefined);

        await useCase.ejecutar(dto, 4); // usuarioId: 4
        
        expect(mockRepository.findParaActualizacionPrecios).toHaveBeenCalledWith(1);

    });

    // CP-006-04: disminución porcentual masiva.
    it('CP-006-04: Aplicar una disminución porcentual del -15%', async () => {
      const dto: ActualizarPreciosMasivosDto = {
        tipoAjuste: TipoAjustePrecio.PORCENTAJE,
        valor: -15,
        motivo: 'Descuento de temporada',
        lineaId: 1,
      };
 
      const productos = [
        crearMockProducto(1, 'Coca-Cola 2L', 1150),
        crearMockProducto(2, 'Sprite 2L', 920),
      ];
      mockRepository.findParaActualizacionPrecios.mockResolvedValue(productos as any);
 
      const resultado = await useCase.ejecutar(dto);
 
      expect(resultado.historiales[0].precioNuevo).toBe(977.5);
      expect(resultado.historiales[1].precioNuevo).toBe(782);
      expect(mockRepository.guardarLoteConHistorial).toHaveBeenCalled();
    });
 
    // CP-006-04.1 (CA-006.4): aumento por monto fijo.
    it('CP-006-04.1: Aplicar un aumento en monto fijo de $150', async () => {
      const dto: ActualizarPreciosMasivosDto = {
        tipoAjuste: TipoAjustePrecio.MONTO_FIJO,
        valor: 150,
        motivo: 'Aumento por inflación',
        lineaId: 1,
      };
 
      const productos = [
        crearMockProducto(1, 'Coca-Cola 2L', 1150),
        crearMockProducto(2, 'Sprite 2L', 920),
      ];
      mockRepository.findParaActualizacionPrecios.mockResolvedValue(productos as any);
 
      const resultado = await useCase.ejecutar(dto);
 
      expect(resultado.historiales[0].precioNuevo).toBe(1300);
      expect(resultado.historiales[1].precioNuevo).toBe(1070);
      expect(mockRepository.guardarLoteConHistorial).toHaveBeenCalled();
    });    
 
    // CP-006-05 (CA-006.5, CA-006.7): si un producto queda inválido, no se persiste NINGÚN cambio.
    it('CP-006-05 y CP-006-07: Cancelar el ajuste completo si un producto queda con precio menor a 0', async () => {
      const dto: ActualizarPreciosMasivosDto = {
        tipoAjuste: TipoAjustePrecio.MONTO_FIJO,
        valor: -950, // Coca queda en $200 (válido), Sprite ($920) queda en -$30 (inválido)
        motivo: 'Ajuste agresivo',
        lineaId: 1,
      };
 
      const productos = [
        crearMockProducto(1, 'Coca-Cola 2L', 1150),
        crearMockProducto(2, 'Sprite 2L', 920),
      ];
      mockRepository.findParaActualizacionPrecios.mockResolvedValue(productos as any);
 
      await expect(useCase.ejecutar(dto)).rejects.toThrow(PreciosMasivosInvalidosException);
 
      expect(mockRepository.guardarLoteConHistorial).not.toHaveBeenCalled();
 
      expect(productos[0].actualizarPrecioconHistorial).toHaveBeenCalled();
      expect(productos[1].actualizarPrecioconHistorial).toHaveBeenCalled();
    });

    // CP-006-06: solo se actualizan los productos del alcance seleccionado.
    it('CP-006-06: Solo se actualizan los productos del alcance seleccionado ', async () => {
        //Dado:productos en la línea "Gaseosas" y productos en la línea "Galletitas"
        //Cuando: se aplica un ajuste de "+10%" con alcance "Línea: Gaseosas"
        const dto: ActualizarPreciosMasivosDto = {
            tipoAjuste: TipoAjustePrecio.PORCENTAJE,
            valor: 10,
            motivo: 'Ajuste trimestral',
            lineaId: 1, // Línea: Gaseosas
        };
        //Entonces: los precios de los productos de "Gaseosas" cambian y los de "Galletitas" permanecen sin modificar
        const productosGaseosas = [
            crearMockProducto(1, 'Coca Cola 2L', 1150),
            crearMockProducto(2, 'Sprite 2L', 920)
        ];
        mockRepository.findParaActualizacionPrecios.mockResolvedValue(productosGaseosas as any);
        mockRepository.guardarLoteConHistorial.mockResolvedValue(undefined);
 
        const resultado = await useCase.ejecutar(dto, 4);
 
        expect(resultado.productos.length).toBe(2);
        expect(mockRepository.guardarLoteConHistorial).toHaveBeenCalledTimes(1);
        expect(mockRepository.guardarLoteConHistorial).toHaveBeenCalledWith(productosGaseosas, resultado.historiales);
    });
});