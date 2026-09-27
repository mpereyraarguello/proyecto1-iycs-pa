/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common';
import { ProductoService } from './producto.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { Producto } from '../../domain/entities/producto.entity';
import { HistorialPrecio } from '../../domain/entities/historial-precio.entity';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// CR-001 - Historia de Usuario CR-001: Validar datos
describe('ProductoService - CR-001 Validar datos', () => {
  let service: ProductoService;

  let repository: any;
  let validationService: any;
  let relatedEntitiesValidator: any;
  let uniquenessValidator: any;
  let usuarioValidator: any;

  const marca = { id: 1, denominacion: 'ARCOR', sistema: 0 };
  const linea = { id: 1, denominacion: 'GALLETITAS', sistema: 0 };
  const presentacion = { id: 1, denominacion: '500G', sistema: 0 };
  const usuario = { id: 1 };

  const crearDto = (overrides: any = {}) => ({
    denominacion: 'ARCOR GALLETITAS 500G',
    costo: 100,
    margen: 50,
    marcaId: 1,
    lineaId: 1,
    presentacionId: 1,
    utilizaStockMinimo: false,
    usuarioCreatedId: 1,
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    validationService = {
      validarEntidadesRelacionadas: jest.fn(),
    };

    relatedEntitiesValidator = {
      validarYObtenerEntidadesRelacionadas: jest
        .fn()
        .mockResolvedValue({ marca, linea, presentacion }),
    };

    uniquenessValidator = {
      validarDenominacionUnica: jest.fn(),
      validarCodigoProveedorUnico: jest.fn(),
    };

    usuarioValidator = {
      validarUsuarioExiste: jest.fn().mockResolvedValue(usuario),
    };

    service = new ProductoService(
      repository,
      {} as any, // lineaService
      {} as any, // presentacionService
      {} as any, // marcaService
      {} as any, // proveedorService
      {} as any, // usuarioService
      {} as any, // superlineaService
      new ProductoIntrinsicValidationService(), // validaciones reales de dominio
      validationService,
      {} as any, // generadorDenominacionService
      relatedEntitiesValidator,
      uniquenessValidator,
      usuarioValidator,
      {} as any, // productoDeletePolicy
      {} as any, // uow
      {} as any, // actualizarPreciosMasivosUseCase
    );
  });

  describe('create', () => {
    // El .each corre una vez con el costo negativo y la proxima lo va a correr con el margen negativo
    it.each([
      ['costo', { costo: -10 }, 'El costo no puede ser negativo'],
      ['margen', { margen: -5 }, 'El margen no puede ser negativo'],
    ])(
      'CP-001-01 - no deberia permitir registrar un producto con %s negativo',
      async (_campo, overrides, mensaje) => {
        // DADO: se esta creando un producto
        const dto = crearDto(overrides);

        // CUANDO: se ingresa el costo o margen en numero negativo
        const resultado = service.create(dto as any);

        // ENTONCES: debe mostrar un error indicando que el valor no esta permitido
        await expect(resultado).rejects.toThrow(BadRequestException);
        await expect(resultado).rejects.toThrow(mensaje);

        // y no debe registrarse el producto
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    // Los campos obligatorios se validan en el DTO (ValidationPipe de Nest),
    // antes de que la peticion llegue al service
    it.each([
      ['Denominacion', 'denominacion', { denominacion: '' }],
      ['Costo', 'costo', { costo: undefined }],
      ['Margen', 'margen', { margen: undefined }],
      ['Linea', 'lineaId', { lineaId: undefined }],
      ['Marca', 'marcaId', { marcaId: undefined }],
      ['Presentacion', 'presentacionId', { presentacionId: undefined }],
    ])(
      'CP-001-02 - no deberia permitir registrar un producto sin %s',
      async (_campo, propiedad, overrides) => {
        // DADO: se esta creando un producto
        // Y no se completo un campo obligatorio
        const dto = plainToInstance(CreateProductoDto, crearDto(overrides));

        // CUANDO: se intenta registrar el producto
        const errores = await validate(dto);

        // ENTONCES: debe indicar que falta ese campo
        const error = errores.find((e) => e.property === propiedad);
        expect(error).toBeDefined();
        expect(Object.values(error!.constraints!).length).toBeGreaterThan(0);
      },
    );

    it('CP-001-02 - deberia permitir registrar un producto sin stock critico (es opcional)', async () => {
      // DADO: se esta creando un producto sin stock crítico
      const dto = plainToInstance(
        CreateProductoDto,
        crearDto({ stockMinimo: undefined }),
      );

      // CUANDO: se validan los datos
      const errores = await validate(dto);

      // ENTONCES: no hay errores sobre ese campo
      const propiedades = errores.map((e) => e.property);
      expect(propiedades).not.toContain('stockMinimo');
    });

    it.each([
      [
        'supera los 255 caracteres',
        'A'.repeat(256),
        'La denominación no puede superar 255 caracteres',
      ],
      [
        'contiene caracteres no permitidos',
        'GALLETITAS #500G',
        'La denominación contiene caracteres no permitidos.',
      ],
    ])(
      'CP-001-03 - no deberia permitir una denominacion que %s',
      async (_escenario, denominacion, mensaje) => {
        // DADO: se esta ingresando la denominacion de un producto
        const dto = crearDto({ denominacion });

        // CUANDO: se intenta registrar con una denominacion invalida
        const resultado = service.create(dto as any);

        // ENTONCES: debe indicar que supera el limite o tiene caracteres invalidos
        await expect(resultado).rejects.toThrow(BadRequestException);
        await expect(resultado).rejects.toThrow(mensaje);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('CP-001-04 - deberia mostrar un mensaje de error claro ante datos invalidos', async () => {
      // DADO: el usuario ingresa datos invalidos en el formulario de producto
      const dto = crearDto({ costo: -1 });

      // CUANDO: se intenta guardar el producto
      const resultado = service.create(dto as any);

      // ENTONCES: el error explica la causa del rechazo
      await expect(resultado).rejects.toMatchObject({
        response: expect.objectContaining({
          statusCode: 400,
          message: 'El costo no puede ser negativo',
        }),
      });
    });

    it.each([
      ['menor a 0%', -1],
      ['mayor a 999%', 1000],
    ])(
      'CP-001-05 - deberia rechazar un margen %s',
      async (_escenario, margen) => {
        // DADO: se esta ingresando el margen de ganancia de un producto
        const dto = crearDto({ margen });

        // CUANDO: el margen esta fuera del rango 0% a 999%
        const resultado = service.create(dto as any);

        // ENTONCES: el sistema rechaza el margen ingresado
        await expect(resultado).rejects.toThrow(BadRequestException);
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it.each([0, 999])(
      'CP-001-05 - deberia aceptar un margen de %s%% (limite del rango)',
      async (margen) => {
        // DADO: se ingresa un margen dentro del rango permitido
        const dto = crearDto({ margen });
        repository.create.mockResolvedValue({ denominacion: dto.denominacion });

        // CUANDO: se registra el producto
        await service.create(dto as any);

        // ENTONCES: el producto se registra
        expect(repository.create).toHaveBeenCalled();
      },
    );
  });

  describe('historial de precios', () => {
    it('CP-001-06 - deberia registrar precio anterior, precio nuevo, motivo y fecha al modificar el precio', () => {
      // DADO: existe un producto con costo 100 y margen 50 (precio 150)
      const producto = Object.assign(new Producto(), {
        id: 1,
        denominacion: 'ARCOR GALLETITAS 500G',
        costo: 100,
        margen: 50,
      });

      // CUANDO: se modifica el precio a 300 indicando el motivo
      const historial = producto.actualizarPrecioconHistorial(
        300,
        'Aumento de proveedor',
        1,
      );

      // ENTONCES: se registra el historial con todos los datos
      expect(historial).toBeInstanceOf(HistorialPrecio);
      expect(historial.precioAnterior).toBe(150);
      expect(historial.precioNuevo).toBe(300);
      expect(historial.motivo).toBe('Aumento de proveedor');
      expect(historial.fecha).toBeInstanceOf(Date);

      // Y el producto queda con el nuevo precio
      expect(producto.precio).toBe(300);
    });
  });

  describe('calcularPrecio', () => {
    it('CP-001-07 - deberia calcular el precio a partir del costo y margen, y recalcularlo al guardar', async () => {
      // DADO: se ingreso el costo 100 y margen 50 de un producto
      const dto = crearDto({ costo: 100, margen: 50 });

      // CUANDO: el usuario inicia la accion "Calcular"
      const calculo = service.calcularPrecio(dto.costo, dto.margen);

      // ENTONCES: el precio es costo × (1 + margen / 100)
      expect(calculo).toEqual({ precio: 150 });

      // CUANDO: se guarda el producto (con costo modificado luego de calcular)
      const guardado = Object.assign(new Producto(), { ...dto, costo: 200 });
      repository.create.mockResolvedValue(guardado);
      await service.create({ ...dto, costo: 200 } as any);

      // ENTONCES: el precio se recalcula con los ultimos valores
      expect(repository.create).toHaveBeenCalled();
      expect(guardado.precio).toBe(300);
    });
  });
});
