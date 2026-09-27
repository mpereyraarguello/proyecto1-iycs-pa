import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { PaginacionUtils } from 'src/modules/common/utils/pagination/paginacion-utils';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { ensureNotSistemaEntity } from 'src/modules/common/utils/atrituto-sistema';
import { AuditoriaMapper } from 'src/modules/gestion-sistema/auditoria/mappers/auditoria.mapper';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';
import { Producto } from '../../domain/entities/producto.entity';
import { IProductoRepository } from '../../domain/interfaces/producto.repository-interface';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { GetProductoDto } from '../../dto/get-producto.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { ProductoMapper } from '../../mappers/producto.mapper';
import { LineaService } from 'src/modules/gestion-productos/linea/application/services/linea.service';
import { MarcaService } from 'src/modules/gestion-productos/marca/application/services/marca.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from '../../domain/services/producto-validation.service.ts';
import { ProductoRelatedEntitiesValidator } from '../../infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from '../../infraestructure/validators/producto-uniqueness.validator.ts';
import { UsuarioValidator } from 'src/modules/common/utils/validation/usuario-validator';
import { ProductoDeletePolicy } from '../policies/producto-delete.policy';
import { PresentacionService } from '../../../presentacion/application/services/presentacion.service';
import { ActualizarPreciosMasivosDto, TipoAjustePrecio } from '../../dto/actualizar-precios-masivos.dto';
import { HistorialPrecio } from '../../domain/entities/historial-precio.entity';
import { DataSource } from 'typeorm';
import { PrecioInvalidoException } from '../../domain/exceptions/precio-invalido.exception';
import { ActualizarPreciosMasivosUseCase } from '../use-cases/actualizar-precios-masivos.use-case';
import { GeneradorDenominacionService } from '../../domain/services/generador-denominacion.service';
import { GenerarDenominacionDto } from '../../dto/generar-denominacion.dto';
import { SuperlineaService } from 'src/modules/gestion-productos/superlinea/application/service/superlinea.service';
import { ProductoCalculoHelper } from '../../domain/helpers/producto-calculos.helper';
@Injectable()
export class ProductoService {
  private readonly logger = new Logger(ProductoService.name);
  constructor(
    @Inject('IProductoRepository')
    private readonly repository: IProductoRepository,
    private readonly lineaService: LineaService,
    private readonly presentacionService: PresentacionService,

    @Inject(forwardRef(() => MarcaService))
    private readonly marcaService: MarcaService,
    private readonly proveedorService: ProveedorService,
    private readonly usuarioService: UsuarioService,
    private readonly superlineaService: SuperlineaService,

    //  Domain Services
    private readonly intrinsicValidationService: ProductoIntrinsicValidationService, //
    private readonly validationService: ProductoValidationService,
    private readonly generadorDenominacionService: GeneradorDenominacionService,

    // Infrastructure Validators
    private readonly relatedEntitiesValidator: ProductoRelatedEntitiesValidator,
    private readonly uniquenessValidator: ProductoUniquenessValidator,
    private readonly usuarioValidator: UsuarioValidator,

    private readonly productoDeletePolicy: ProductoDeletePolicy,

    @Inject('UnitOfWork') private readonly uow: IUnitOfWork,

    private readonly actualizarPreciosMasivosUseCase: ActualizarPreciosMasivosUseCase,
  ) { }

  private readonly ENTITY_NAME = 'Producto';

  async create(dto: CreateProductoDto) {
    this.logger.log(
      `Creando un nuevo ${this.ENTITY_NAME} con denominación: ${dto.denominacion} a: ${dto.denominacion}`,
    );

    // Orquestar todas las validaciones
    const { marca, linea, usuario, presentacion } =
      await this.validarYPrepararCreacion(dto);

    

    const entity = await this.repository.create(
      dto,
      linea,
      marca,
      presentacion,
      usuario, //CA-001.4
    );

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'creada',
    );
  }

  async update(id: number, dto: UpdateProductoDto) {
    this.logger.log(`Actualizando ${this.ENTITY_NAME} con ID: ${id}`);

    const productoActual = await this.repository.findOne(id);

    if (!productoActual) {
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    }

    if (
      productoActual.lineaId == null ||
      productoActual.marcaId == null ||
      productoActual.presentacionId == null
    ) {
      throw new InternalServerErrorException(
        'Producto en estado inválido',
      );
    }

    const marcaId = dto.marcaId ?? productoActual.marcaId;
    const lineaId = dto.lineaId ?? productoActual.lineaId;
    const costo = dto.costo ?? productoActual.costo;
    const margen = dto.margen ?? productoActual.margen;
    const presentacionId =
      dto.presentacionId ?? productoActual.presentacionId;

    const denominacion =
      dto.denominacion ?? productoActual.denominacion;

    const alicuotaIva =
      dto.alicuotaIva ?? productoActual.alicuotaIva;

    // Validaciones intrínsecas, modificación -> se tuvo que agregar costo y margen para su validación
    this.intrinsicValidationService.validarDatosBasicos({
      denominacion,
      marcaId,
      lineaId,
      presentacionId,
      alicuotaIva,
      costo,
      margen
    });

    // Validar entidades relacionadas
    const { marca, linea, presentacion } =
      await this.relatedEntitiesValidator
        .validarYObtenerEntidadesRelacionadas(
          marcaId,
          lineaId,
          presentacionId,
        );

    // Reglas de negocio
    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,
      presentacion,
    );

    if (dto.denominacion) {
      await this.uniquenessValidator.validarDenominacionUnica(
        dto.denominacion,
        id,
      );
    }

    // Usuario. CA-001.4
    if (dto.usuarioUpdatedId === undefined) {
      throw new InternalServerErrorException(
        'El usuarioUpdatedId es obligatorio.',
      );
    }

    const usuario =
      await this.usuarioValidator.validarUsuarioExiste(
        dto.usuarioUpdatedId,
      );

    const entity = await this.repository.update(
      id,
      dto,
      linea,
      marca,
      presentacion,
      usuario,
    );

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'editada',
    );
  }

  async findByRapido(
    codigo: string,
    exacto: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.warn(`service`);
    const result = await this.repository.findByRapido(
      codigo,
      exacto,
      skip,
      take,
    );
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }

  async findByBusquedaParcial(busqueda: string,skip: number,take: number): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.warn(`service`);
    const result = await this.repository.findByBusquedaParcial(busqueda,skip,take);
    console.log("Productos buscados:", result)
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }



  async findBy(
    denominacion: string,
    codigoProveedor: string,
    codProveedorExacto: boolean,
    codigoReferencia: string,
    marca_id: number,
    linea_id: number,
    superlinea_id: number | undefined, // CR-004: filtro por SuperLínea (CA-004.3)
    proveedor_id: number,
    conStock: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.warn(`service`);
    const result = await this.repository.findBy(
      denominacion,
      codigoProveedor,
      codProveedorExacto,
      codigoReferencia,
      marca_id,
      linea_id,
      superlinea_id, // CR-004
      proveedor_id,
      conStock,
      skip,
      take,
    );
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }


  async buscarMarcaDesdeProducto(id: number) {
    return this.marcaService.findEntityById(id);
  }

  async buscarLineaDesdeProducto(id: number) {
    return this.lineaService.findEntityById(id);
  }

  async findByIdConAuditoria(id: number) {
    const entity = await this.repository.findByIdConAuditoria(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return AuditoriaMapper.mapProductoToDto(entity);
  }

  async findDtoById(id: number) {
    const entity = await this.repository.findOne(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    this.logger.log(`b1x`);
    return ProductoMapper.toDto(entity);
  }

  async findEntityById(id: number) {
    const entity = await this.repository.findOne(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return entity;
  }

  async remove(id: number, usuarioId: number) {
    const entity = await this.findEntityById(id);

    if (!entity) {
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    }
    

    ensureNotSistemaEntity(entity, 'Producto');

    const usuario = await this.usuarioService.findOne(usuarioId);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    await this.repository.remove(entity, usuario);
    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'eliminada',
    );
  }


  async findAllForLineas(denominacion: string) {
    return this.lineaService.findAllFor(denominacion);
  }

  async findAllForSuperlineas(denominacion: string) {
    return this.superlineaService.findAllFor(denominacion);
  }

  async findAllForMarcas(denominacion: string) {
    return this.marcaService.findAllFor(denominacion);
  }

  async findAllForPresentaciones(denominacion: string){
    return this.presentacionService.findAllFor(denominacion);
  }

  async findByDenominacionCodigoProveedorFiltered(
    denominacion: string,
    skip = 0,
    take = 10,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.log(
      `  Buscando en srvice producto o ${denominacion}  skip=${skip}, take=${take}`,
    );
    const result =
      await this.repository.findByDenominacionCodigoProveedorFiltered(
        denominacion,
        skip,
        take,
      );
    this.logger.log(result);
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }

  async existsProductosActivosByMarca(marcaId: number): Promise<boolean> {
    return this.repository.existsProductosActivosByMarca(marcaId);
  }
  async existsProductosActivosByLinea(lineaId: number): Promise<boolean> {
    return this.repository.existsProductosActivosByLinea(lineaId);
  }


  async findByIds(ids: number[]): Promise<Producto[]> {
    return this.repository.findByIds(ids);
  }

  async incrementarStock(
    uow: IUnitOfWork,
    productoId: number,
    cantidad: number,
    origen?: string,
  ): Promise<number> {
    return this.ajustarStockInterno(uow, productoId, cantidad, origen);
  }

  async decrementarStock(
    uow: IUnitOfWork,
    productoId: number,
    cantidad: number,
    origen?: string,
  ): Promise<number> {
    return this.ajustarStockInterno(uow, productoId, -cantidad, origen);
  }

  private async ajustarStockInterno(
    uow: IUnitOfWork,
    productoId: number,
    delta: number,
    origen?: string,
  ): Promise<number> {
    const producto = await this.repository.findOne(productoId);
    if (!producto) {
      throw new Error(`Producto con ID ${productoId} no encontrado`);
    }

    const stockActual = producto.stock ?? 0;
    const nuevoStock = stockActual + delta;

    // Política opcional
    // if (nuevoStock < 0) throw ...

    producto.stock = nuevoStock;
    await this.repository.updateEntity(uow, producto);

    this.logger.log(
      `[StockService] ${origen ?? 'Desconocido'} → ${stockActual} → ${nuevoStock}`,
    );

    return nuevoStock;
  }

  /**
   * Orquesta todas las validaciones necesarias para crear un producto
   * @private
   */
  private async validarYPrepararCreacion(dto: CreateProductoDto) {
    // Validar datos  (Domain - sin DB)
    this.intrinsicValidationService.validarDatosBasicos({
      denominacion: dto.denominacion,
      marcaId: dto.marcaId,
      lineaId: dto.lineaId,
      alicuotaIva: dto.alicuotaIva,
      presentacionId: dto.presentacionId,
      costo: dto.costo,
      margen: dto.margen
    });

    // Validar unicidad (Infrastructure - DB)
    await this.uniquenessValidator.validarDenominacionUnica(dto.denominacion);

    if (dto.codigoProveedor) {
      await this.uniquenessValidator.validarCodigoProveedorUnico(
        dto.codigoProveedor,
        0,
      );
    }
    // 3 Validar entidades relacionadas existen (Infrastructure - DB)
    const { marca, linea, presentacion} =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId,
        dto.lineaId,
        dto.presentacionId,

      );

    //  Validar reglas de negocio sobre entidades (Domain)
    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,
      presentacion
    );
  

    //  Validar usuario existe (Infrastructure)
    const usuario = await this.usuarioValidator.validarUsuarioExiste(
      dto.usuarioCreatedId,
    );

    return { marca, linea, usuario, presentacion };
  }
  /**
   * Orquesta todas las validaciones necesarias para actualizar un producto
   * @private
   */
  private async validarYPrepararActualizacion(
    id: number,
    dto: UpdateProductoDto,
  ) {
    // Obtener producto actual
    const productoActual = await this.repository.findOne(id);
    if (!productoActual)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );

    if (
      productoActual.lineaId == null ||
      productoActual.marcaId == null || productoActual.presentacionId === null
    ) {
      throw new InternalServerErrorException('Producto en estado inválido');
    }

    const marcaId = dto.marcaId ?? productoActual.marcaId;
    const lineaId = dto.lineaId ?? productoActual.lineaId;
    const presentacionId =
      dto.presentacionId ?? productoActual.presentacionId;

    if (marcaId === undefined) {
      throw new InternalServerErrorException(
        'El marcaId es obligatorio.',
      );
    }

    if (lineaId === undefined) {
      throw new InternalServerErrorException(
        'El lineaId es obligatorio.',
      );
    }

    if (presentacionId === undefined) {
      throw new InternalServerErrorException(
        'El presentacionId es obligatorio.',
      );
    }

    //  Validar datos intrínsecos
    this.intrinsicValidationService.validarDatosBasicos({
      denominacion: dto.denominacion ?? productoActual.denominacion,
      marcaId,
      lineaId,
      presentacionId,
      alicuotaIva: dto.alicuotaIva ?? productoActual.alicuotaIva,
      costo: dto.costo ?? productoActual.costo,
      margen: dto.margen ?? productoActual.margen,
    });

    // Validar unicidad (excluyendo el ID actual)
    if (dto.denominacion) {
      await this.uniquenessValidator.validarDenominacionUnica(
        dto.denominacion,
        id,
      );
    }

    // Validar entidades relacionadas
    const { marca, linea, presentacion, } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId ?? productoActual.marcaId,
        dto.lineaId ?? productoActual.lineaId,
        presentacionId,

      );

    //  Validar reglas de negocio
    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,
      presentacion,
    );

    if (dto.usuarioUpdatedId === undefined) {
      throw new InternalServerErrorException(
        'El usuarioUpdatedId es obligatorio.',
      );
    }

    // 5 Validar usuario
    const usuario = await this.usuarioValidator.validarUsuarioExiste(
      dto.usuarioUpdatedId,
    );

    return { marca, linea, presentacion, usuario };
  }

  async actualizarPreciosMasivos( dto:ActualizarPreciosMasivosDto, usuarioId?:number){
    return this.actualizarPreciosMasivosUseCase.ejecutar(dto,usuarioId); 
  }

  async generarDenominacionAutomatica(dto: GenerarDenominacionDto){
    const marca = await this.marcaService.findEntityById(dto.marcaId);
    const linea = await this.lineaService.findEntityById(dto.lineaId);
    const presentacion = await this.presentacionService.findEntityById(dto.presentacionId);
    //busca presentación, si no existe la crea
   // const presentacion = await this.presentacionService.ejecutar(dto.presentacion);

    return this.generadorDenominacionService.generar(marca, linea, presentacion);

  }

  async obtenerHistorialPrecios(productoId:number):Promise<HistorialPrecio[]>{
    return this.repository.findHistorialPreciobyProductoId(productoId)
  }

  calcularPrecio(costo: number, margen: number) {
    const precio = ProductoCalculoHelper.calcularPrecio(costo, margen);

    return {
      precio,
    };
  }
}
