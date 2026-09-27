
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchProductoBusquedaParcialDto } from './search-producto-busqueda-parcial.dto';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('SearchProductoBusquedaParcialDto', () => {
  it(
    'CP-004-06 - debe rechazar búsquedas con menos de 2 caracteres',
    async () => {
      const dto = plainToInstance(
        SearchProductoBusquedaParcialDto,
        {
          busqueda: 'A',
          skip: 0,
          take: 10,
        },
      );

      const errores = await validate(dto);

      expect(errores).toHaveLength(1);
      expect(errores[0].property).toBe('busqueda');

      expect(
        errores[0].constraints?.minLength,
      ).toBe(
        'La búsqueda debe contener al menos 2 caracteres',
      );
    },
  );

  it(
    'CP-004-06.1 - debe aceptar una búsqueda con exactamente 2 caracteres',
    async () => {
      const dto = plainToInstance(
        SearchProductoBusquedaParcialDto,
        {
          busqueda: 'AS',
          skip: 0,
          take: 10,
        },
      );

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    },
  );
});

