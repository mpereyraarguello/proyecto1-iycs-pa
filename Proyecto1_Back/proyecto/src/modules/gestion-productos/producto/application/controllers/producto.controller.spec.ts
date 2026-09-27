import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, expect, it, jest, afterEach } from '@jest/globals';
import { ProductoController } from './producto.controller';
import { ProductoService } from '../services/producto.service';
import { SearchProductoPaginationWithDto } from '../../dto/search-producto-pagination-with.dto';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

describe('ProductoController', () => {
  let controller: ProductoController;
  let service: ProductoService;

  // Creamos un mock del servicio para espiar sus llamadas
  // Tipado estricto para que mockResolvedValue no tire error 'never'
  const mockProductoService: {
      findBy: jest.MockedFunction<ProductoService['findBy']>;
    } = {
      findBy: jest.fn(),
    };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductoController],
      providers: [
        {
          provide: ProductoService,
          useValue: mockProductoService,
        },
      // mocks necesarios para que el AuthGuard compile
        { provide: JwtService, useValue: {} },
        { provide: Reflector, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: 'IUsuarioRepository', useValue: {} },
      ],
    })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ProductoController>(ProductoController);
    service = module.get<ProductoService>(ProductoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search (CR-004 - Criterios de Aceptación actualizados)', () => {
    
    // Helper con los campos requeridos por el GetProductoDto para que TS no se queje
    const baseDtoFields = {
      codigoProveedorDenominacion: "",
      codigoProveedor: "",
      proveedor: "",
      ubicacion: "",
      stock: 0,
      alicuota: 0,
      costo: 0,
      precio: 0,
      sistema: 0,
      precioConIva: 0,
      observacion: "",
      utilizaStockMinimo: false,
      presentacion: "",
      stockMinimo: 0,
      codigoReferencia: ""
    };
    
    it('CA-004.1: Búsqueda por Denominación del producto', async () => {
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'GALLETAS';
      dto.skip = 0;
      dto.take = 10;

      //ahora nomas le doy el id y la denominacion nomas, y le cargo los demas atributos para el GetProductoDto
      const mockResult = { 
        data: [{ id: 1, denominacion: 'GALLETAS SALADAS', ...baseDtoFields }], 
        total: 1 
      };


      mockProductoService.findBy.mockResolvedValue(mockResult);

      const result = await controller.search(dto);

      expect(service.findBy).toHaveBeenCalledWith(
        'GALLETAS', undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, 0, 10
      );
      expect(result).toEqual(mockResult);
    });

    it('CA-004.2 y CA-004.3: Búsqueda unificada que encuentra por Línea o SuperLínea', async () => {
      // El usuario escribe el nombre de una línea (ej. LACTEOS) o superlínea en el mismo text input
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'LACTEOS';
      dto.skip = 0;
      dto.take = 10;

      const mockResult = { 
        data: [{ id: 2, denominacion: 'LECHE ENTERA', ...baseDtoFields }], 
        total: 1 
      };

      mockProductoService.findBy.mockResolvedValue(mockResult);

      const result = await controller.search(dto);

      // Verificamos que el controlador pase el string 'LACTEOS' al servicio (el servicio buscará en las 3 tablas)
      expect(service.findBy).toHaveBeenCalledWith(
        'LACTEOS', undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, 0, 10
      );
      expect(result).toEqual(mockResult);
    });

    it('CA-004.4: Búsqueda admite coincidencias parciales (ej: "AR")', async () => {
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'AR';
      dto.skip = 0;
      dto.take = 10;

      const mockResult = { 
        data: [
          { id: 3, denominacion: 'ARROZ', ...baseDtoFields },
          { id: 4, denominacion: 'FIDEOS', ...baseDtoFields }
        ], 
        total: 2 
      };

      mockProductoService.findBy.mockResolvedValue(mockResult);
      
      //const mockResult = { 
      //  data: [
      //    { id: 3, denominacion: 'ARROZ' }, // Coincide en producto
      //    { id: 4, denominacion: 'FIDEOS' } // Coincide porque su línea es "HARINAS"
      //  ], 
      //  total: 2 
      //};
      //(mockProductoService.findBy as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.search(dto);
      expect(result.data).toHaveLength(2);
      
      expect(service.findBy).toHaveBeenCalledWith(
        'AR', undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, 0, 10
      );
    });

    it('CA-004.6: Ejecuta búsqueda si cumple el mínimo (controlador procesa lo que recibe)', async () => {
      // Si el front validó los 2 caracteres, envía la denominación.
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'AL';
      dto.skip = 0;
      dto.take = 10;

      (mockProductoService.findBy as jest.Mock).mockResolvedValue({ data: [], total: 0 } as never);
      await controller.search(dto);

      expect(service.findBy).toHaveBeenCalledWith(
        'AL', undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, 0, 10
      );
    });

    it('CA-004.7: Informa si no hay resultados (devuelve array vacío)', async () => {
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'INEXISTENTE';
      dto.skip = 0;
      dto.take = 10;

      // El servicio no encontró nada
      (mockProductoService.findBy as jest.Mock).mockResolvedValue({ data: [], total: 0 } as never);

      const result = await controller.search(dto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('CA-004.8: Combinar criterios de búsqueda de Denominación y filtros explícitos (ej. IDs opcionales)', async () => {
      const dto = new SearchProductoPaginationWithDto();
      dto.denominacion = 'frutigram'; // Búsqueda de texto (cruza las 3 tablas)
      dto.superlineaId = 2; // Filtro select explícito adicional (si se usara en la UI combinada)
      dto.skip = 0;
      dto.take = 10;

      await controller.search(dto);

      expect(service.findBy).toHaveBeenCalledWith(
        'frutigram', undefined, false, undefined, undefined, undefined, 2, undefined, undefined, 0, 10
      );
    });
  });
});
