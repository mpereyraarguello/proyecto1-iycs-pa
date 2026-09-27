import { ConflictException } from '@nestjs/common';
import { PresentacionService } from './presentacion.service';
import { Presentacion } from '../../domain/entities/presentacion.entity';

describe('PresentacionService', () => {
  let service: PresentacionService;

  let presentacionRepository: any;
  let usuarioService: any;
  let validacionesService: any;

  beforeEach(() => {
    presentacionRepository = {
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      findByDenominacionWith: jest.fn(),
      findAllListado: jest.fn(),
    };

    usuarioService = {
      findOne: jest.fn(),
    };

    validacionesService = {
      tieneProductosActivosParaPresentacion: jest.fn(),
    };

    service = new PresentacionService(
      presentacionRepository,
      usuarioService,
      validacionesService,
    );
  });

  describe('remove', () => {
    it(
      'CP-002-06 - no debería permitir eliminar una presentación asociada a productos',
      async () => {
        // DADO: existe la presentación 500G
        const presentacion = {
          id: 1,
          denominacion: '500G',
          sistema: 0,
        } as Presentacion;

        presentacionRepository.findOne.mockResolvedValue(presentacion);

        // Y la presentación tiene productos asociados
        validacionesService.tieneProductosActivosParaPresentacion
          .mockResolvedValue(true);

        // CUANDO: se intenta eliminar la presentación
        const resultado = service.remove(1, 1);

        // ENTONCES: debe lanzar un error
        await expect(resultado).rejects.toThrow(
          ConflictException,
        );

        // Y no debe eliminarse la presentación
        expect(
          presentacionRepository.remove,
        ).not.toHaveBeenCalled();
      },
    );
  });

  describe('update', () => {
    it(
      'CP-002-07 - debería permitir modificar una presentación',
      async () => {
        // DADO: existe la presentación 500ML
        const presentacion = {
          id: 1,
          denominacion: '500ML',
          sistema: 0,
        } as Presentacion;

        const dto = {
          denominacion: '500G',
          updatedAt: new Date(),
          usuarioUpdatedId: 1,
        };

        const presentacionActualizada = {
          ...presentacion,
          denominacion: '500G',
        } as Presentacion;

        // La presentación existe
        presentacionRepository.findOne.mockResolvedValue(
          presentacion,
        );

        // No existe otra presentación con la denominación 500G
        presentacionRepository.findByDenominacionWith
          .mockResolvedValue(null);

        // El repositorio devuelve la presentación modificada
        presentacionRepository.update.mockResolvedValue(
          presentacionActualizada,
        );

        // CUANDO: se modifica la presentación de 500ML a 500G
        const resultado = await service.update(1, dto);

        // ENTONCES: debe actualizarse correctamente
        expect(
          presentacionRepository.update,
        ).toHaveBeenCalledWith(1, dto);

        expect(resultado).toEqual(
          expect.objectContaining({
            mensaje: expect.stringContaining('500G'),
          }),
        );
      },
    );
  });

  describe('findAllListado', () => {
    it(
      'CP-002-08 - debería consultar todas las presentaciones',
      async () => {
        // DADO: existen presentaciones registradas
        const presentaciones = [
          {
            id: 1,
            denominacion: '500G',
            sistema: 0,
          },
          {
            id: 2,
            denominacion: '1KG',
            sistema: 0,
          },
          {
            id: 3,
            denominacion: '500ML',
            sistema: 0,
          },
        ] as Presentacion[];

        presentacionRepository.findAllListado.mockResolvedValue(
          presentaciones,
        );

        // CUANDO: se consultan todas las presentaciones
        const resultado = await service.findAllListado();

        // ENTONCES: debe devolver todas las presentaciones
        expect(resultado).toEqual(presentaciones);

        // Y debe consultar el repositorio
        expect(
          presentacionRepository.findAllListado,
        ).toHaveBeenCalledTimes(1);
      },
    );
  });
});