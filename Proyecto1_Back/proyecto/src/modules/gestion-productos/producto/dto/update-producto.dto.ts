import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';
import {
  IsNotEmpty,
  IsInt,
  IsString,
  MaxLength,
  Matches,
  IsEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  //Posible a eliminar para no generar confusiones, ya que con el partialType ya se hereda todo de CreateProductoDto 
  //y no hace falta volver a declarar la denominacion aca, pero lo dejo por ahora para despues charlarlo
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsString({ message: 'La denominación debe ser una cadena de texto.' }) // Valida que sea string
  @IsNotEmpty({ message: 'La denominación no puede estar vacía.' }) // Valida que no esté vacía
  @MaxLength(255, { message: 'La denominación no puede superar los 255 caracteres.' })
  @Matches(/^[\w áéíóúÁÉÍÓÚñÑ.\-/%]+$/, {
    message:
      'La denominación solo puede contener letras, números, espacios, puntos, guiones y barras.',
  })
  denominacion: string;

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;

  updatedAt: Date;

  @IsOptional()
  motivo?: string;
}
