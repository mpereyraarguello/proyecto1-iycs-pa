import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { CreatePresentacionDto } from '../../presentacion/dto/create-presentacion.dto';

//Para revisar y modificar
export class CreateProductoDto {
  //el transform le saco el .toLowerCase() -> Si no no se cumple el CA-005.3 y CA-005.4,
  @Transform(({ value }) => value.trim())
  @IsString({ message: 'La denominación debe ser una cadena de texto.' }) // Valida que sea string
  //lo comento por ahora, porque se supone que al generarla automáticamente puede ser opcional que venga esto -mili -> DUDA!!! Choca con CA-001.2
  //@IsNotEmpty({ message: 'La denominación no puede estar vacía.' }) // Valida que no esté vacía
  @IsOptional()
  @MaxLength(255, { message: 'La denominación no puede superar los 255 caracteres.' })
  /*  @Matches(/^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ.\-/]+$/, {
    message:
      'La denominación solo puede contener letras, números, espacios, puntos, guiones y barras.',
  }) */
  @Matches(/^[\w áéíóúÁÉÍÓÚñÑ.\-/%]+$/, {
    message: 'La denominación contiene caracteres inválidos. Solo puede contener letras, números, espacios, puntos, guiones y barras. ',
  })
  denominacion: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  // si no tiene poner vacio
  @IsOptional()
  @IsString()
  codigoProveedor?: string;

  @IsOptional()
  @IsString()
  codigoBarra?: string;

  @IsOptional()
  @IsString()
  codigoReferencia?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsBoolean()
  utilizaStockMinimo: boolean;

  @IsOptional()
  @IsInt()
  stockMinimo?: number;

  @IsOptional()
  @IsInt()
  stock?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  costoEnDolar?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  destacado?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  envioGratis?: boolean;

  @IsNotEmpty({ message: 'El costo es obligatorio.' })
  @IsNumber()
   @Min(0, { message: 'El costo no puede ser negativo.' }) //CA-001.1
  costo: number;

  @IsOptional()
  @IsNumber()
  costoDolar?: number;

  @IsNotEmpty({ message: 'La linea es obligatoria.' })
  @IsInt({ message: 'La linea  debe ser un número entero.' })
  lineaId: number;


  @IsNotEmpty({ message: 'La marca es obligatoria.' })
  @IsInt({ message: 'La marca  debe ser un número entero.' })
  marcaId: number;

  @IsNotEmpty({ message: 'La presentación es obligatoria.' })
  @IsInt({ message: 'La presentación  debe ser un número entero.' })
  presentacionId:number;


  @IsNotEmpty({ message: 'El margen es obligatorio.' })
  @IsNumber()
  @Min(0, { message: 'El margen no puede ser negativo.' }) //CA-001.1
  @Max(999, { message: 'El margen no puede ser mayor a 999.' })
  margen: number;

  createdAt?: Date;

  /*esto no lo elimino pero ya no lo necesitamos (no quiero romper nada jajaja) -mili */
  @IsOptional()
  @IsEnum(AlicuotaIva, {
    message:
      'tipo debe ser ALICUOTA_0  ALICUOTA_105, ALICUOTA_21, ALICUOTA_27,',
  })
  @Transform(({ value }) => {
    // Si el valor es un string, lo convierte al valor numérico del enum
    if (typeof value === 'string') {
      return AlicuotaIva[value.toUpperCase() as keyof typeof AlicuotaIva];
    }
    return value;
  })
  alicuotaIva: AlicuotaIva;

  @IsNotEmpty({ message: 'El usuarioCreatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioCreatedId debe ser un número entero.' })
  usuarioCreatedId: number;

  @ApiPropertyOptional({ type: () => CreatePresentacionDto })
  @ValidateNested()
  @Type(() => CreatePresentacionDto)
  presentacion: CreatePresentacionDto;

}
