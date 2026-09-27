/// <reference types="jest" />
import { ProductoService } from './producto.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { GeneradorDenominacionService } from '../../domain/services/generador-denominacion.service';
import { GenerarDenominacionDto } from '../../dto/generar-denominacion.dto';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NormalizeDenominacionPipe } from 'src/modules/common/pipes/normalize-denominations.pipe';

// CR-005 - Historia de Usuario N° 5: Denominación automática
// CP-005-05 se prueba acá del lado del back (la API devuelve la denominación guardada);
// la visualización en pantalla se prueba de forma manual
describe('ProductoService - CR-005 Denominación automática', () => {
  let service: ProductoService;

  let repository: any;
  let marcaService: any;
  let lineaService: any;
  let presentacionService: any;
  let generadorDenominacionService: GeneradorDenominacionService;

  // Datos tal como quedan guardados en la base: el NormalizeDenominacionPipe
  // de cada controller guarda las denominaciones en mayúscula
  const marca = { id: 1, denominacion: 'ARCOR', sistema: 0 };
  const linea = { id: 2, denominacion: 'GALLETITAS', sistema: 0 };
  const presentacion = { id: 3, denominacion: '500G', sistema: 0 };
  const usuario = { id: 1 };

  const crearDto = (overrides: any = {}) => ({
    denominacion: 'ARCOR GALLETITAS 500G',
    costo: 100,
    margen: 50,
    marcaId: 1,
    lineaId: 2,
    presentacionId: 3,
    utilizaStockMinimo: false,
    usuarioCreatedId: 1,
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    marcaService = {
      findEntityById: jest.fn().mockResolvedValue(marca),
    };

    lineaService = {
      findEntityById: jest.fn().mockResolvedValue(linea),
    };

    presentacionService = {
      findEntityById: jest.fn().mockResolvedValue(presentacion),
    };

    // Servicio real: es el que arma la denominación
    generadorDenominacionService = new GeneradorDenominacionService();
    jest.spyOn(generadorDenominacionService, 'generar');

    service = new ProductoService(
      repository,
      lineaService,
      presentacionService,
      marcaService,
      {} as any, // proveedorService
      {} as any, // usuarioService
      {} as any, // superlineaService
      new ProductoIntrinsicValidationService(),
      { validarEntidadesRelacionadas: jest.fn() } as any, // validationService
      generadorDenominacionService,
      {
        validarYObtenerEntidadesRelacionadas: jest
          .fn()
          .mockResolvedValue({ marca, linea, presentacion }),
      } as any, // relatedEntitiesValidator
      {
        validarDenominacionUnica: jest.fn(),
        validarCodigoProveedorUnico: jest.fn(),
      } as any, // uniquenessValidator
      { validarUsuarioExiste: jest.fn().mockResolvedValue(usuario) } as any, // usuarioValidator
      {} as any, // productoDeletePolicy
      {} as any, // uow
      {} as any, // actualizarPreciosMasivosUseCase
    );
  });

  describe('generarDenominacionAutomatica', () => {
    it('CP-005-01 - debería generar la denominación a partir de la Marca, Línea y Presentación seleccionadas', async () => {
      // DADO: se está creando un producto sin denominación manual
      // Y se seleccionó Marca "Arcor", Línea "Galletitas" y Presentación "500g"
      const dto = { marcaId: 1, lineaId: 2, presentacionId: 3 };

      // CUANDO: se presiona "Generar denominación"
      const resultado = await service.generarDenominacionAutomatica(dto);

      // ENTONCES: busca las entidades seleccionadas
      expect(marcaService.findEntityById).toHaveBeenCalledWith(1);
      expect(lineaService.findEntityById).toHaveBeenCalledWith(2);
      expect(presentacionService.findEntityById).toHaveBeenCalledWith(3);

      // Y genera la denominación con ellas
      expect(generadorDenominacionService.generar).toHaveBeenCalledWith(
        marca,
        linea,
        presentacion,
      );
      expect(resultado).toBeTruthy();
    });

    it.each([
      ['Marca', 'marcaId', { lineaId: 2, presentacionId: 3 }],
      ['Línea', 'lineaId', { marcaId: 1, presentacionId: 3 }],
      ['Presentación', 'presentacionId', { marcaId: 1, lineaId: 2 }],
    ])(
      'CP-005-01 - no debería permitir generar la denominación si falta la %s',
      async (_campo, propiedad, datos) => {
        // DADO: no se seleccionó alguno de los tres campos
        const dto = plainToInstance(GenerarDenominacionDto, datos);

        // CUANDO: se intenta generar la denominación
        const errores = await validate(dto);

        // ENTONCES: la petición es rechazada por el campo faltante
        expect(errores.map((e) => e.property)).toContain(propiedad);
      },
    );

    it('CP-005-02 - debería respetar el formato "MARCA LÍNEA PRESENTACIÓN" en mayúscula y con espacios', async () => {
      // DADO: se seleccionó Marca "Arcor", Línea "Galletitas" y Presentación "500g"
      const dto = { marcaId: 1, lineaId: 2, presentacionId: 3 };

      // CUANDO: se presiona "Generar denominación"
      const resultado = await service.generarDenominacionAutomatica(dto);

      // ENTONCES: la denominación tiene estrictamente el formato esperado
      expect(resultado).toBe('ARCOR GALLETITAS 500G');
      expect(resultado).toBe(resultado.toUpperCase());
      expect(resultado.split(' ')).toEqual(['ARCOR', 'GALLETITAS', '500G']);
    });
  });

  describe('denominación manual', () => {
    it('CP-005-03 - debería permitir editar manualmente la denominación generada', async () => {
      // DADO: el sistema generó la denominación "ARCOR GALLETITAS 500G"
      // CUANDO: el usuario la edita y escribe "GALLETITAS ARCOR CLÁSICAS"
      const dto = plainToInstance(
        CreateProductoDto,
        crearDto({ denominacion: 'GALLETITAS ARCOR CLÁSICAS' }),
      );

      // ENTONCES: el valor editado es aceptado como denominación válida
      const errores = await validate(dto);
      expect(errores.map((e) => e.property)).not.toContain('denominacion');
      expect(dto.denominacion).toBe('GALLETITAS ARCOR CLÁSICAS');
    });

    it('CP-005-04 - debería guardar la denominación manual en mayúsculas sin reemplazarla por la generada', async () => {
      // DADO: el usuario modificó manualmente la denominación
      const body = crearDto({ denominacion: 'Galletitas Arcor Clásicas' });
      repository.create.mockResolvedValue({ denominacion: body.denominacion });

      // CUANDO: se guarda el producto
      // (el controller aplica NormalizeDenominacionPipe antes de llamar al service)
      const dto = new NormalizeDenominacionPipe().transform(body, {
        type: 'body',
      });
      await service.create(dto as any);

      // ENTONCES: no se vuelve a generar la denominación automática
      expect(generadorDenominacionService.generar).not.toHaveBeenCalled();

      // Y se guarda la ingresada manualmente, en mayúsculas
      const dtoGuardado = repository.create.mock.calls[0][0];
      expect(dtoGuardado.denominacion).toBe('GALLETITAS ARCOR CLÁSICAS');
    });
  });

  describe('consulta del producto', () => {
    it('CP-005-05 - debería mostrar la denominación final almacenada al consultar el producto', async () => {
      // DADO: un producto guardado con la denominación "GALLETITAS ARCOR CLÁSICAS"
      repository.findOne.mockResolvedValue({
        id: 10,
        denominacion: 'GALLETITAS ARCOR CLÁSICAS',
        costo: 100,
        margen: 50,
        marca,
        linea,
        presentacion,
      });

      // CUANDO: se consulta la información del producto
      const resultado = await service.findDtoById(10);

      // ENTONCES: se muestra la denominación final almacenada
      expect(repository.findOne).toHaveBeenCalledWith(10);
      expect(resultado.denominacion).toBe('GALLETITAS ARCOR CLÁSICAS');

      // Y no se reemplaza por la denominación generada automáticamente
      expect(generadorDenominacionService.generar).not.toHaveBeenCalled();
    });
  });
});
