import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SuperlineaService } from './superlinea.service';
import { ISuperLineaRepository } from '../../domain/interfaces/superlinea.repository.interface';
import { PoliticaSuperLineaService } from '../../domain/services/politica-denominacion';
import { PoliticaEliminacionSuperLinea } from '../../domain/services/politica-eliminacion-superlinea';
import { CreateSuperLineaDto } from '../../dto/create-superlinea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-superlinea.dto';
import { SuperLinea } from '../../domain/entities/superlinea.entity';

describe('SuperlineaService - User Story N° 03: SuperLínea como jerarquía', () => {
  let service: SuperlineaService;
  let repository: jest.Mocked<ISuperLineaRepository>;
  let politicaSuperLinea: jest.Mocked<PoliticaSuperLineaService>;
  let politicaEliminacion: jest.Mocked<PoliticaEliminacionSuperLinea>;

  const mockSuperLineaBebidas: SuperLinea = {
    id: 1,
    denominacion: 'Bebidas',
    observacion: 'Materiales liquidos aptos para consumir',
    lineas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<ISuperLineaRepository>> = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAllFor: jest.fn(),
      findByDenominacionFiltered: jest.fn(),
      findByDenominationWith: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      remove: jest.fn(),
      hasLines: jest.fn(),
    };

    const mockPoliticaSuperLinea = {
      validarDenominacion: jest.fn(),
    };

    const mockPoliticaEliminacion = {
      validar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperlineaService,
        { provide: 'ISuperLineaRepository', useValue: mockRepository },
        { provide: PoliticaSuperLineaService, useValue: mockPoliticaSuperLinea },
        { provide: PoliticaEliminacionSuperLinea, useValue: mockPoliticaEliminacion },
      ],
    }).compile();

    service = module.get<SuperlineaService>(SuperlineaService);
    repository = module.get('ISuperLineaRepository');
    politicaSuperLinea = module.get(PoliticaSuperLineaService);
    politicaEliminacion = module.get(PoliticaEliminacionSuperLinea);
  });

  it('debe estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  // 
  // CA-003.8 / CP-003-07: Control de borrado de SuperLínea
  // 
  describe('CA-003.8: Control de borrado de SuperLínea', () => {
    describe('Caso CP-003-07: Rechazo al eliminar una SuperLínea con líneas asociadas', () => {
      it('Dado que la SuperLínea "Bebidas" tiene asociada la línea "Gaseosas", cuando se intenta eliminar la SuperLínea "Bebidas", entonces el sistema rechaza la eliminación indicando que tiene líneas asociadas', async () => {
        // Dado: que la SuperLínea "Bebidas" (id: 1) existe y tiene asociada la línea "Gaseosas"
        const superlineaId = 1;
        repository.findOne.mockResolvedValue(mockSuperLineaBebidas);

        // La política detecta que tiene líneas asociadas y lanza la excepción de conflicto
        politicaEliminacion.validar.mockRejectedValue(
          new ConflictException('No se puede eliminar la SuperLínea porque tiene líneas asociadas.'),
        );

        // Cuando: se intenta eliminar la SuperLínea "Bebidas"
        // Entonces: el sistema rechaza la eliminación con ConflictException y no llama a repository.remove
        await expect(service.remove(superlineaId)).rejects.toThrow(ConflictException);
        await expect(service.remove(superlineaId)).rejects.toThrow(
          'No se puede eliminar la SuperLínea porque tiene líneas asociadas.',
        );

        expect(politicaEliminacion.validar).toHaveBeenCalledWith(superlineaId);
        expect(repository.remove).not.toHaveBeenCalled();
      });
    });

    it('debe permitir borrar una SuperLínea que no tiene líneas asociadas', async () => {
      const superlineaId = 1;
      repository.findOne.mockResolvedValue(mockSuperLineaBebidas);
      politicaEliminacion.validar.mockResolvedValue(false as any);
      repository.remove.mockResolvedValue(mockSuperLineaBebidas);

      const result = await service.remove(superlineaId);

      expect(politicaEliminacion.validar).toHaveBeenCalledWith(superlineaId);
      expect(repository.remove).toHaveBeenCalledWith(mockSuperLineaBebidas);
      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('eliminada');
    });

    it('debe lanzar NotFoundException si la SuperLínea a eliminar no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(politicaEliminacion.validar).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  // 
  // CA-003.9 / CP-003-08: Registro, modificación y consulta de SuperLíneas
  // 
  describe('CA-003.9: Registro, modificación y consulta de SuperLíneas', () => {
    describe('Caso CP-003-08: Registro de una Superlínea', () => {
      it('Dado que se ingresan los datos para registrar una SuperLínea, cuando se intenta registrar una Superlínea llamada "Bebidas", entonces el sistema registra la nueva superlínea', async () => {
        // Dado: los datos para registrar la superlínea "Bebidas"
        const dto: CreateSuperLineaDto = {
          denominacion: 'Bebidas',
          observacion: 'Materiales liquidos aptos para consumir',
          usuarioCreatedId: 1,
        };

        politicaSuperLinea.validarDenominacion.mockResolvedValue(undefined);
        repository.create.mockResolvedValue(mockSuperLineaBebidas);

        // Cuando: se intenta registrar la superlínea
        const result = await service.create(dto);

        // Entonces: el sistema valida la denominación, la persiste y retorna mensaje de éxito
        expect(politicaSuperLinea.validarDenominacion).toHaveBeenCalledWith('Bebidas');
        expect(repository.create).toHaveBeenCalledWith(dto);
        expect(result).toHaveProperty('mensaje');
        expect(result.mensaje).toContain('creada');
        expect(result.mensaje).toContain('Bebidas');
      });
    });

    it('debe rechazar el registro si la denominación ya se encuentra registrada', async () => {
      const dto: CreateSuperLineaDto = {
        denominacion: 'Bebidas',
        usuarioCreatedId: 1,
      };

      politicaSuperLinea.validarDenominacion.mockRejectedValue(
        new ConflictException('La denominación ya está en uso o esta eliminada.'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debe permitir la modificación de una SuperLínea existente', async () => {
      const updateDto: UpdateSuperLineaDto = {
        denominacion: 'Bebidas y Refrescos',
        usuarioUpdatedId: 1,
      };

      repository.findOne.mockResolvedValue(mockSuperLineaBebidas);
      politicaSuperLinea.validarDenominacion.mockResolvedValue(undefined);
      repository.update.mockResolvedValue({
        ...mockSuperLineaBebidas,
        denominacion: 'Bebidas y Refrescos',
      });

      const result = await service.update(1, updateDto);

      expect(politicaSuperLinea.validarDenominacion).toHaveBeenCalledWith('Bebidas y Refrescos', 1);
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('editada');
    });

    it('debe fallar la modificación si la SuperLínea no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      const updateDto: UpdateSuperLineaDto = {
        denominacion: 'Inexistente',
        usuarioUpdatedId: 1,
      };

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('debe permitir consultar una SuperLínea por ID retornando su DTO', async () => {
      repository.findOne.mockResolvedValue(mockSuperLineaBebidas);

      const result = await service.findDtoById(1);

      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.denominacion).toBe('Bebidas');
    });

    it('debe lanzar NotFoundException al consultar por un ID inexistente', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDtoById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // 
  // CA-003.2: Permitir seleccionar una SuperLínea existente
  // 
  describe('CA-003.2: Selección de SuperLínea existente para asociar', () => {
    it('debe retornar la lista de SuperLíneas disponibles para ser seleccionadas en el combo', async () => {
      repository.findAllFor.mockResolvedValue([mockSuperLineaBebidas]);

      const result = await service.findAllForSelect('');

      expect(repository.findAllFor).toHaveBeenCalledWith('');
      expect(result).toHaveLength(1);
      expect(result[0].denominacion).toBe('Bebidas');
    });
  });
});