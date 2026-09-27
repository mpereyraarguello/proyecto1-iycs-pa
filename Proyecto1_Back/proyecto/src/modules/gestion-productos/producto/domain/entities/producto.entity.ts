import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Linea } from '../../../linea/domain/entities/linea.entity';
import { Marca } from '../../../marca/domain/entities/marca.entity';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ProductoOperacion } from '../../../producto-operacion/entities/producto-operacion.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { MonetarioColumn } from 'src/modules/common/decorators/monetario-column.decorator';
import { CantidadColumn } from 'src/modules/common/decorators/cantidad-column.decorator';
import { PorcentajeColumn } from 'src/modules/common/decorators/porcentaje-column.decorator';
import { Proveedor } from 'src/modules/organizacion/proveedor/domain/entities/proveedor.entity';
import { Presentacion } from 'src/modules/gestion-productos/presentacion/domain/entities/presentacion.entity';
import { HistorialPrecio } from './historial-precio.entity';
import { PrecioInvalidoException } from '../exceptions/precio-invalido.exception';
import { ProductoCalculoHelper } from '../helpers/producto-calculos.helper';
import { redondearProducto } from 'src/modules/common/utils/number/redondeo';
import { Precio } from '../value-objects/previo.vo';
import { PrecioTransformer } from '../../infraestructure/persistence/precio.transformer';


@Entity('producto')
export class Producto {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'text' })
  denominacion: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  codigoProveedor?: string | null;

  @Column({ type: 'text', nullable: true })
  codigoBarra?: string | null;

  // ========== PROVEEDOR ==========
  @ManyToOne(() => Proveedor, (pro) => pro.proveedoresOperacion, {
    eager: true,
  })
  @JoinColumn({ name: 'proveedor_id' })
  @Index()
  proveedor: Proveedor;

  @Column({ type: 'int', nullable: true })
  proveedorId?: number;

  /*
  Nota: No usar el enum alciculta iva en @Column
        sino no anda el importar precios 
  */
  @PorcentajeColumn(21.0)
  alicuotaIva: AlicuotaIva;

  // Stock: cantidades reales, admite fracciones (1.5 kg, 0.25 lts)
  @CantidadColumn()
  stock: number;

  @Column('boolean', { default: false })
  utilizaStockMinimo: boolean;

  @Column('boolean', { default: false })
  utilizaStockMinimoPorEmpresa: boolean;

  @CantidadColumn()
  stockMinimo: number;

  @MonetarioColumn()
  costo: number;

  @MonetarioColumn()
  costoDolar?: number;

  /*
  Ultima cotizacion dolar por el cambio de precio si producto posee costo dolar
  */
  @MonetarioColumn()
  cotizacionDolar?: number;
  //se utiliza en las importaciones;

  @MonetarioColumn()
  precioDolar?: number;
  // Precio de venta

  @PorcentajeColumn()
  margen: number;

  @Column({ type: 'timestamp', nullable: true })
  fechaCosto?: Date;

  @Column('boolean', { default: false })
  costoEnDolar?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaCostoDolar?: Date;


  @Column('boolean', { default: false })
  destacado?: boolean;

  @Column('boolean', { default: false })
  envioGratis?: boolean;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  deletedAt?: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_created_id' })
  usuarioCreated: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_updated_id' })
  usuarioUpdated: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_deleted_id' })
  usuarioDeleted: Usuario;


  // ========== LINEA ==========
  @ManyToOne(() => Linea, (linea) => linea.productos)
  @JoinColumn({ name: 'linea_id' })
  linea: Linea;

  @Column({ type: 'int', nullable: true })
  lineaId?: number;


 // ==========  MARCA ==========
  @ManyToOne(() => Marca, (marca) => marca.productos)
  @JoinColumn({ name: 'marca_id' })
  marca: Marca;

  @Column({ type: 'int', nullable: true })
  marcaId?: number;

  /* ESTOS LOS SACARIAMOS PARA PODER REPRESENTARLOS EN PRESENTACION (VO)*/
  @Column({ default: false })
  utilizaPack: boolean;

  @Column({ type: 'int', nullable: true })
  cantidadPorPack: number | null;
  

  @Column({ type: 'text', nullable: true })
  imagen?: string;


  @Column({ type: 'text', nullable: true })
  ubicacion?: string;

  @ManyToOne(() => Producto, (producto) => producto.productosOperacion)
  productosOperacion: ProductoOperacion;


  @Column({ type: 'int', default: 0 })
  sistema: number;

  @Column({ type: 'text', nullable: true })
  codigoReferencia?: string | null;

  // ========== Presentacion ==========
  @ManyToOne(()=> Presentacion, (presentacion) => presentacion.productos,{cascade:true, eager:true, nullable:true})
  @JoinColumn({ name: 'presentacion_id' })
  @Index()
  presentacion?:Presentacion;

  @Column({ type: 'int', nullable: true })
  presentacionId?: number;

  @OneToMany(()=> HistorialPrecio, (histPrecio)=> histPrecio.producto)
  historialPrecios: HistorialPrecio[]

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: PrecioTransformer })
  precio: Precio

  actualizarPrecioconHistorial(nuevoPrecio:number, motivo: string, usuarioId?: number){
    if(nuevoPrecio <= 0){
      throw new PrecioInvalidoException(this.id, this.denominacion, this.precio.getValue(), nuevoPrecio)
    }

    const precioAnterior = this.precio.getValue()
    this.costo = ProductoCalculoHelper.calcularNuevoCosto(nuevoPrecio,this.margen)
    this.fechaCosto = new Date()

    const historial = new HistorialPrecio(precioAnterior,nuevoPrecio,motivo,this,usuarioId)

    this.usuarioUpdated = {id: usuarioId} as Usuario
    this.updatedAt = new Date()
    this.precio = Precio.crear(nuevoPrecio);

    return historial
  }

  actualizarCosto(nuevoCosto:number,motivoAC:string, usuarioId?: number){
    const precioViejo = this.precio.getValue();
    this.costo = nuevoCosto;
    this.updatedAt = new Date();
    this.usuarioUpdated = {id: usuarioId} as Usuario
    this.recalcularPrecio()
    const nuevoHistorial = new HistorialPrecio(precioViejo, this.precio.getValue(), motivoAC, this, usuarioId);

    return nuevoHistorial
  }

  actualizarMargen(nuevoMargen:number, motivoAM:string, usuarioId?: number){
    const precioViejo = this.precio.getValue();
    this.margen = nuevoMargen;
    this.updatedAt = new Date();
    this.usuarioUpdated = {id: usuarioId} as Usuario
    this.recalcularPrecio()
    const nuevoHistorial = new HistorialPrecio(precioViejo, this.precio.getValue(), motivoAM, this, usuarioId);
    return nuevoHistorial;
  }

  private recalcularPrecio(): void {
    const nuevoPrecio = ProductoCalculoHelper.calcularPrecio( this.costo, this.margen,);
    this.precio = Precio.crear(nuevoPrecio);
  }

  actualizarCostoYMargen( nuevoCosto: number, nuevoMargen: number, motivoACM:string, usuarioId?: number) {
    const precioViejo = this.precio.getValue();
    this.costo = nuevoCosto;
    this.margen = nuevoMargen;
    this.updatedAt = new Date();
    this.usuarioUpdated = { id: usuarioId } as Usuario;
    this.recalcularPrecio();
    const nuevoHistorial = new HistorialPrecio(precioViejo, this.precio.getValue(), motivoACM, this, usuarioId);
    return nuevoHistorial;
  }
}
