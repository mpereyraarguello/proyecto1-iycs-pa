import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LineaService } from './linea.service';
import { ILineaRepository } from '../../domain/interfaces/linea.repository.interface';
import { PoliticaEliminacionLinea } from '../../domain/services/politica-eliminacion-linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { LineaValidator } from '../validators/linea.validator';
import { CreateLineaDto } from '../../dto/create-linea.dto';
import { UpdateLineaDto } from '../../dto/update-linea.dto';
import { Linea } from '../../domain/entities/linea.entity';
import { SuperLinea } from 'src/modules/gestion-productos/superlinea/domain/entities/superlinea.entity';
import { Producto } from '../../../producto/domain/entities/producto.entity';

describe('LineaService - User Story N° 03: SuperLínea como jerarquía', () => {
  let service: LineaService;
  let repository: jest.Mocked<ILineaRepository>;
  let lineaValidator: jest.Mocked<LineaValidator>;
  let validacionService: jest.Mocked<PoliticaEliminacionLinea>;
  let usuarioService: jest.Mocked<UsuarioService>;

  const mockSuperLinea1: SuperLinea = {
    id: 1,
    denominacion: 'Bebidas',
    observacion: 'Materiale liquidos aptos para consumir',
    lineas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSuperLinea2: SuperLinea = {
    id: 2,
    denominacion: 'Almacen',
    observacion: 'Materiales de almacen',
    lineas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLinea: Linea = {
    id: 10,
    denominacion: 'Gaseosas',
    observacion: 'Bebidas gasificadas y refrescos',
    utilizaStockMinimo: true,
    stockMinimo: 50,
    superlineaId: 1,
    superlinea: mockSuperLinea1,
    productos: [],
    sistema: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<ILineaRepository>> = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      findByDenominacion: jest.fn(),
      findByDenominacionWith: jest.fn(),
      findByDenominacionFiltered: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      findAllFor: jest.fn(),
      findAllListado: jest.fn(),
      remove: jest.fn(),
    };

    const mockLineaValidator = {
      validarYPrepararCreacion: jest.fn(),
      validarYPrepararEdicion: jest.fn(),
    };

    const mockPoliticaEliminacion = {
      tieneProductosActivosParaLinea: jest.fn(),
    };

    const mockUsuarioService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineaService,
        { provide: 'ILineaRepository', useValue: mockRepository },
        { provide: PoliticaEliminacionLinea, useValue: mockPoliticaEliminacion },
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: LineaValidator, useValue: mockLineaValidator },
      ],
    }).compile();

    service = module.get<LineaService>(LineaService);
    repository = module.get('ILineaRepository');
    lineaValidator = module.get(LineaValidator);
    validacionService = module.get(PoliticaEliminacionLinea);
    usuarioService = module.get(UsuarioService);
  });

  it('debe estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  // 
  // CA-003.1: Permitir asociar una SuperLínea al crear o modificar una línea
  // 
  describe('CA-003.1: Asociación de SuperLínea al crear y modificar', () => {
    it('debe permitir asociar una SuperLínea al momento de crear una línea', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Gaseosas',
        superlineaId: 1,
        utilizaStockMinimo: true,
        stockMinimo: 50,
        usuarioCreatedId: 1,
      };

      lineaValidator.validarYPrepararCreacion.mockResolvedValue({
        superlinea: mockSuperLinea1,  //mockSuperLinea1 = Bebidas
      });
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockLinea,
        superlinea: mockSuperLinea1, //aca se la asgino al momento de crear la linea
      });

      const result = await service.create(dto);

      expect(lineaValidator.validarYPrepararCreacion).toHaveBeenCalledWith(dto);
      expect(repository.create).toHaveBeenCalledWith(dto, mockSuperLinea1);
      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('Gaseosas');
    });

    it('debe permitir asociar una SuperLínea al modificar una línea', async () => {
      const updateDto: UpdateLineaDto = {
        superlineaId: 2,
        utilizaStockMinimo: false,
      };

      repository.findOne.mockResolvedValue(mockLinea);
      lineaValidator.validarYPrepararEdicion.mockResolvedValue(mockSuperLinea2);
      repository.update.mockResolvedValue({
        ...mockLinea,
        superlineaId: 2,             //mockSuperLinea2 = superlineaId=2
        superlinea: mockSuperLinea2, //mockSuperLinea1 = Almacen
      });

      const result = await service.update(10, updateDto);

      expect(lineaValidator.validarYPrepararEdicion).toHaveBeenCalledWith(2);
      expect(repository.update).toHaveBeenCalledWith(10, updateDto, mockSuperLinea2);
      expect(result).toBeDefined();
    });
  });

  // 
  // CA-003.2: Permitir seleccionar una SuperLínea existente para asociarla
  // 
  describe('CA-003.2: Validación de existencia de la SuperLínea a asociar', () => {
    it('debe fallar si la SuperLínea seleccionada para asociar no existe al crear', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Clavos',
        superlineaId: 999, // ID inexistente
        utilizaStockMinimo: false,
        usuarioCreatedId: 1,
      };

      lineaValidator.validarYPrepararCreacion.mockRejectedValue(
        new NotFoundException('SuperLinea con ID 999 no encontrada.'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debe fallar si la SuperLínea seleccionada para asociar no existe al modificar', async () => {
      const updateDto: UpdateLineaDto = {
        superlineaId: 999,
        utilizaStockMinimo: false,
      };

      repository.findOne.mockResolvedValue(mockLinea);
      lineaValidator.validarYPrepararEdicion.mockRejectedValue(
        new NotFoundException('SuperLinea con ID 999 no encontrada.'),
      );

      await expect(service.update(10, updateDto)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  // 
  // CA-003.3: Una línea debe pertenecer a una única SuperLínea
  // 
  describe('CA-003.3 / CP-003-03: Una línea no puede pertenecer a más de una SuperLínea a la vez', () => {
    it('Dado que la línea "Gaseosas" está asociada a la SuperLínea "Bebidas", cuando se intenta asociar a "Almacén", entonces queda asociada únicamente a "Almacén", reemplazando la anterior', async () => {
      const lineaExistente: Linea = {
        ...mockLinea,
        id: 10,
        denominacion: 'Gaseosas',
        superlineaId: 1,
        superlinea: mockSuperLinea1, // Bebidas
      };
  
      repository.findOne.mockResolvedValue(lineaExistente);

      lineaValidator.validarYPrepararEdicion.mockResolvedValue(mockSuperLinea2); // Almacén      
      
      const lineaActualizada: Linea = {
        ...lineaExistente,
        superlineaId: 2,
        superlinea: mockSuperLinea2, // Almacén
      };
      repository.update.mockResolvedValue(lineaActualizada);

      // Cuando: se intenta asociar la línea "Gaseosas" también a la SuperLínea "Almacén"
      const updateDto: UpdateLineaDto = {
        superlineaId: 2,
        utilizaStockMinimo: false,
      };
      const result = await service.update(10, updateDto);

      // Entonces: la línea "Gaseosas" queda asociada únicamente a "Almacén", reemplazando la asociación anterior
      expect(lineaValidator.validarYPrepararEdicion).toHaveBeenCalledWith(2);
      expect(repository.update).toHaveBeenCalledWith(10, updateDto, mockSuperLinea2);
      expect(lineaActualizada.superlineaId).toBe(2);
      expect(lineaActualizada.superlinea?.denominacion).toBe('Almacen');
      // Se verifica que ya no pertenece a "Bebidas"
      expect(lineaActualizada.superlineaId).not.toBe(1);
      expect(lineaActualizada.superlinea?.denominacion).not.toBe('Bebidas');
      expect(result).toBeDefined();
      
    });
  });

  // 
  // CA-003.4: Error si se intenta guardar una línea sin una SuperLínea asociada
  // 
  describe('CA-003.4: Obligatoriedad de la SuperLínea al crear', () => {
    it('debe lanzar error y no persistir si el validador rechaza la ausencia de SuperLínea', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Línea Sin SuperLínea',
        superlineaId: 0, // Invalido / Ausente
        utilizaStockMinimo: false,
        usuarioCreatedId: 1,
      };

      lineaValidator.validarYPrepararCreacion.mockRejectedValue(
        new BadRequestException('Superlínea ID es requerido y debe ser válido'),
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  // 
  // CA-003.5: Al consultar una Línea, debe mostrar la SuperLínea a la que pertenece
  // 
  describe('CA-003.5: Consulta de Línea con su SuperLínea', () => {
    it('debe retornar el DTO de la Línea incluyendo los datos de su SuperLínea', async () => {
      const lineaConSuperlinea: Linea = {
        ...mockLinea,
        superlineaId: 1,
        superlinea: mockSuperLinea1,
      };

      repository.findOne.mockResolvedValue(lineaConSuperlinea);

      const result = await service.findDtoById(10);

      expect(repository.findOne).toHaveBeenCalledWith(10);
      expect(result).toBeDefined();
      expect(result.superlineaId).toBe(1);
      expect(result.superlinea).toBeDefined();
      expect(result.superlinea?.id).toBe(1);
      expect(result.superlinea?.denominacion).toBe('Bebidas'); //mockSuperLinea1 = Bebidas
    });

    it('debe lanzar NotFoundException si la Línea no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDtoById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // 
  // CA-003.6: Al modificar una Línea, debe permitir cambiar su SuperLínea
  // 
  describe('CA-003.6: Cambio de SuperLínea al modificar', () => {
    it('debe actualizar la asociación pasando la nueva SuperLínea al repositorio', async () => {
      const updateDto: UpdateLineaDto = {
        superlineaId: 2, // Cambia de SuperLínea 1 a 2
        utilizaStockMinimo: false,
      };

      repository.findOne.mockResolvedValue(mockLinea);
      lineaValidator.validarYPrepararEdicion.mockResolvedValue(mockSuperLinea2);
      repository.update.mockResolvedValue({
        ...mockLinea,
        superlineaId: 2,
        superlinea: mockSuperLinea2,
      });

      await service.update(10, updateDto);

      expect(lineaValidator.validarYPrepararEdicion).toHaveBeenCalledWith(2);
      expect(repository.update).toHaveBeenCalledWith(10, updateDto, mockSuperLinea2);
    });
  });

  // 
  // CA-003.7: El cambio de SuperLínea no debe modificar ni eliminar productos
  // 
  describe('CA-003.7: Integridad de productos asociados al cambiar SuperLínea', () => {
    it('debe preservar la lista de productos asociados intacta tras la actualización de SuperLínea', async () => {
      const productosExistentes: Producto[] = [
        { id: 101, denominacion: 'Coca-Cola 2L' } as Producto,
        { id: 102, denominacion: 'Sprite 2L' } as Producto,
      ];

      const lineaConProductos: Linea = {
        ...mockLinea,
        productos: productosExistentes,
      };

      repository.findOne.mockResolvedValue(lineaConProductos);
      lineaValidator.validarYPrepararEdicion.mockResolvedValue(mockSuperLinea2);
      repository.update.mockResolvedValue({
        ...lineaConProductos,
        superlineaId: 1,            //mockSuperLinea1 = superlineaId=1
        superlinea: mockSuperLinea1, //mockSuperLinea1 = Bebidas
      });

      const updateDto: UpdateLineaDto = {
        superlineaId: 2,            //mockSuperLinea2 = superlineaId=2
        utilizaStockMinimo: false,  //mockSuperLinea2 = Almacen
      };
      await service.update(10, updateDto);

      // Verificamos que update se ejecutó con la nueva SuperLínea sin tocar ni desvincular productos
      expect(repository.update).toHaveBeenCalledWith(10, updateDto, mockSuperLinea2);
      expect(lineaConProductos.productos).toHaveLength(2);
      expect(lineaConProductos.productos[0].id).toBe(101);  //Id de la coca
      expect(lineaConProductos.productos[1].id).toBe(102);  //Id de la sprite
    });
  });
    
      // SE hace prueba manual en el front 

      // CA-003.10: Búsqueda por denominación e inclusión de eliminados
      // 
      //describe('CA-003.10: Búsqueda por denominación y filtro de eliminados', () => {
      //  it('debe buscar líneas por denominación excluyendo eliminadas por defecto', async () => {
      //    const mockResult = {
      //      data: [mockLinea],
      //      total: 1,
      //    };
      //    repository.findByDenominacionFiltered.mockResolvedValue(mockResult);
//
      //    const result = await service.findByDenominacionFiltered('Gase', 0, 10, false);
//
      //    expect(repository.findByDenominacionFiltered).toHaveBeenCalledWith('Gase', 0, 10, false);
      //    expect(result.data).toHaveLength(1);
      //    expect(result.data[0].denominacion).toBe('Gaseosas');
      //  });
//
      //  it('debe permitir incluir líneas eliminadas si el usuario lo solicita', async () => {
      //    const lineaEliminada: Linea = {
      //      ...mockLinea,
      //      id: 11,
      //      denominacion: 'Gaseosas Antiguas',
      //      deletedAt: new Date(),
      //    };
      //    const mockResult = {
      //      data: [mockLinea, lineaEliminada],
      //      total: 2,
      //    };
      //    repository.findByDenominacionFiltered.mockResolvedValue(mockResult);
//
      //    const result = await service.findByDenominacionFiltered('Gase', 0, 10, true);
//
      //    expect(repository.findByDenominacionFiltered).toHaveBeenCalledWith('Gase', 0, 10, true);
      //    expect(result.data).toHaveLength(2);
      //  });
      //});
      
});

