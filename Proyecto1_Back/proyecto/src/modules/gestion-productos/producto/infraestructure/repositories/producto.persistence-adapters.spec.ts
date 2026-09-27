import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { ProductoPersistenceAdapter } from './producto.persistence-adapters';
import { Producto } from '../../domain/entities/producto.entity';

describe('ProductoPersistenceAdapter', () => {
  let adapter: ProductoPersistenceAdapter;

  let repository: {
    createQueryBuilder: jest.Mock;
  };

  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
    };

  beforeEach(async () => {
    queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
    };

    repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(queryBuilder),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          ProductoPersistenceAdapter,
          {
            provide: getRepositoryToken(Producto),
            useValue: repository,
          },
          {
            provide: DataSource,
            useValue: {},
          },
          {
            provide: 'UnitOfWork',
            useValue: {},
          },
        ],
      }).compile();

    adapter = module.get<ProductoPersistenceAdapter>(
      ProductoPersistenceAdapter,
    );
  });

  it(
    'CP-004-01 - debe encontrar MEDIALUNAS al buscar LUNA',
    async () => {
      const productoMedialunas = {
        id: 1,
        denominacion: 'MEDIALUNAS',
      } as Producto;

      queryBuilder.getManyAndCount.mockImplementation(async () => [[productoMedialunas], 1],);
      const resultado = await adapter.findByBusquedaParcial('LUNA',0,10,);

      //verificamos que se creó el QueryBuilder
      expect(repository.createQueryBuilder,).toHaveBeenCalledWith('producto');
      expect(queryBuilder.leftJoinAndSelect,).toHaveBeenCalledWith('producto.marca','marca',);
      expect(queryBuilder.leftJoinAndSelect,).toHaveBeenCalledWith('producto.linea','linea',);
      expect(queryBuilder.leftJoinAndSelect,).toHaveBeenCalledWith('linea.superlinea','superlinea',);
      expect(queryBuilder.leftJoinAndSelect,).toHaveBeenCalledWith('producto.presentacion','presentacion',);
      expect(queryBuilder.where).toHaveBeenCalledWith('producto.deletedAt IS NULL',);
      //verificamos la búsqueda parcial
      const llamadaAndWhere = queryBuilder.andWhere.mock.calls[0];
      expect(llamadaAndWhere[0]).toContain('producto.denominacion LIKE :busqueda',);
      expect(llamadaAndWhere[0]).toContain('linea.denominacion LIKE :busqueda',);
      expect(llamadaAndWhere[0]).toContain('superlinea.denominacion LIKE :busqueda',);
      //verificamos que LUNA se convirtió en %LUNA%
      expect(llamadaAndWhere[1]).toEqual({
        busqueda: '%LUNA%',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'producto.denominacion',
        'ASC',
      );
      //verificamos la paginación
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      //verificamos que se ejecutó la consulta
      expect(queryBuilder.getManyAndCount,).toHaveBeenCalled();
      //verificamos el resultado
      expect(resultado).toEqual({
        data: [productoMedialunas],
        total: 1,
      });
      //verificamos específicamente que encontró MEDIALUNAS
      expect(resultado.data[0].denominacion,).toBe('MEDIALUNAS');
      expect(resultado.total).toBe(1);
    },
  );



it(
  'CP-004-02 - debe encontrar MAGDALENAS 500G al buscar HARINA por la Línea',
  async () => {
    // ==========================================
    // ARRANGE
    // ==========================================

    const productoMagdalenas = {
      id: 1,
      denominacion: 'MAGDALENAS 500G',
      linea: {
        id: 1,
        denominacion: 'HARINA',
      },
    } as Producto;

    /*
     * Producto que pertenece a otra línea.
     *
     * Se incluye para comprobar que la búsqueda
     * devuelve únicamente el producto cuya línea
     * coincide con "HARINA".
     */
    const productoMedialunas = {
      id: 2,
      denominacion: 'MEDIALUNAS SIN TACC 200G',
      linea: {
        id: 2,
        denominacion: 'SIN TACC',
      },
    } as Producto;

    /*
     * Simulamos que TypeORM encuentra solamente
     * MAGDALENAS 500G porque su línea es HARINA.
     */
    queryBuilder.getManyAndCount.mockImplementation(
      async (): Promise<[Producto[], number]> => {
        return [[productoMagdalenas], 1];
      },
    );

    // ==========================================
    // ACT
    // ==========================================

    const resultado =
      await adapter.findByBusquedaParcial(
        'HARINA',
        0,
        10,
      );

    // ==========================================
    // ASSERT
    // ==========================================

    // 1. Verificamos que se creó el QueryBuilder
    expect(
      repository.createQueryBuilder,
    ).toHaveBeenCalledWith('producto');

    // 2. Verificamos que se realizó el JOIN
    //    con la Línea
    expect(
      queryBuilder.leftJoinAndSelect,
    ).toHaveBeenCalledWith(
      'producto.linea',
      'linea',
    );

    // 3. Verificamos que la búsqueda contempla
    //    la denominación de la Línea
    const llamadasAndWhere =
      queryBuilder.andWhere.mock.calls;

    const llamadaBusqueda =
      llamadasAndWhere.find(
        (llamada: unknown[]) =>
          typeof llamada[0] === 'string' &&
          llamada[0].includes(
            'linea.denominacion LIKE :busqueda',
          ),
      );

    expect(llamadaBusqueda).toBeDefined();

    // 4. Verificamos que "HARINA" se transforma
    //    correctamente en "%HARINA%"
    expect(llamadaBusqueda?.[1]).toEqual({
      busqueda: '%HARINA%',
    });

    // 5. Verificamos que solamente se buscan
    //    productos activos
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'producto.deletedAt IS NULL',
    );

    // 6. Verificamos el orden
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'producto.denominacion',
      'ASC',
    );

    // 7. Verificamos la paginación
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);

    // 8. Verificamos que se ejecutó la consulta
    expect(
      queryBuilder.getManyAndCount,
    ).toHaveBeenCalled();

    // 9. Verificamos el resultado
    expect(resultado).toEqual({
      data: [productoMagdalenas],
      total: 1,
    });

    // 10. Verificamos que el producto encontrado
    //     es MAGDALENAS 500G
    expect(
      resultado.data[0].denominacion,
    ).toBe('MAGDALENAS 500G');

    // 11. Verificamos que la línea del producto
    //     es HARINA
    expect(
      resultado.data[0].linea?.denominacion,
    ).toBe('HARINA');

    // 12. Verificamos que solamente se obtuvo
    //     un producto
    expect(resultado.data).toHaveLength(1);
    expect(resultado.total).toBe(1);

    // 13. Verificamos que MEDIALUNAS SIN TACC
    //     no forma parte del resultado
    expect(
      resultado.data.some(
        (producto) =>
          producto.denominacion ===
          'MEDIALUNAS SIN TACC 200G',
      ),
    ).toBe(false);
  },
);

  it(
    'CP-004-03 - debe encontrar SPRITE GASEOSAS 500ML al buscar por SuperLínea BEBIDAS',
    async () => {
      // ==========================================
      // ARRANGE
      // ==========================================

      const productoSprite = {
        id: 3,
        denominacion: 'SPRITE GASEOSAS 500ML',
        linea: {
          id: 2,
          denominacion: 'GASEOSAS',
          superlinea: {
            id: 2,
            denominacion: 'BEBIDAS',
          },
        },
      } as Producto;

      queryBuilder.getManyAndCount.mockImplementation(
        async (): Promise<[Producto[], number]> => {
          return [[productoSprite], 1];
        },
      );

      // ==========================================
      // ACT
      // ==========================================

      const resultado =
        await adapter.findByBusquedaParcial(
          'BEBIDAS',
          0,
          10,
        );

      // ==========================================
      // ASSERT
      // ==========================================

      // Verificamos que se realizó el JOIN
      // con la SuperLínea
      expect(
        queryBuilder.leftJoinAndSelect,
      ).toHaveBeenCalledWith(
        'linea.superlinea',
        'superlinea',
      );

      // Verificamos que la búsqueda contempla
      // la denominación de la SuperLínea
      const llamadasAndWhere =
        queryBuilder.andWhere.mock.calls;

      const llamadaBusqueda =
        llamadasAndWhere.find(
          (llamada: unknown[]) =>
            typeof llamada[0] === 'string' &&
            llamada[0].includes(
              'superlinea.denominacion LIKE :busqueda',
            ),
        );

      expect(llamadaBusqueda).toBeDefined();

      // Verificamos que BEBIDAS se transforma
      // en %BEBIDAS%
      expect(llamadaBusqueda?.[1]).toEqual({
        busqueda: '%BEBIDAS%',
      });

      // Verificamos que solamente se buscan
      // productos activos
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'producto.deletedAt IS NULL',
      );

      // Verificamos el resultado
      expect(resultado).toEqual({
        data: [productoSprite],
        total: 1,
      });

      // Verificamos específicamente el producto
      expect(
        resultado.data[0].denominacion,
      ).toBe('SPRITE GASEOSAS 500ML');

      // Verificamos la SuperLínea
      expect(
        resultado.data[0].linea?.superlinea?.denominacion,
      ).toBe('BEBIDAS');

      expect(resultado.data).toHaveLength(1);
      expect(resultado.total).toBe(1);
    },
  );

  it(
    'CP-004-04 - debe encontrar coincidencias sin importar la posición del texto',
    async () => {
      // ==========================================
      // ARRANGE
      // ==========================================

      const productoMedialunas = {
        id: 2,
        denominacion: 'MEDIALUNAS HARINA 200G',
        linea: {
          id: 1,
          denominacion: 'HARINA',
          superlinea: {
            id: 1,
            denominacion: 'PASTELERIA',
          },
        },
      } as Producto;

      const productoSprite = {
        id: 3,
        denominacion: 'SPRITE GASEOSAS 500ML',
        linea: {
          id: 2,
          denominacion: 'GASEOSAS',
          superlinea: {
            id: 2,
            denominacion: 'BEBIDAS',
          },
        },
      } as Producto;

      /*
       * "AS" aparece:
       *
       * MEDIALUNAS -> al final de la denominación
       * GASEOSAS   -> dentro de la denominación
       *
       * Ninguno depende de que "AS" esté al principio.
       */
      queryBuilder.getManyAndCount.mockImplementation(
        async (): Promise<[Producto[], number]> => {
          return [
            [
              productoMedialunas,
              productoSprite,
            ],
            2,
          ];
        },
      );

      // ==========================================
      // ACT
      // ==========================================

      const resultado =
        await adapter.findByBusquedaParcial(
          'AS',
          0,
          10,
        );

      // ==========================================
      // ASSERT
      // ==========================================

      const llamadasAndWhere =
        queryBuilder.andWhere.mock.calls;

      const llamadaBusqueda =
        llamadasAndWhere.find(
          (llamada: unknown[]) =>
            typeof llamada[0] === 'string' &&
            llamada[0].includes(
              'producto.denominacion LIKE :busqueda',
            ),
        );

      expect(llamadaBusqueda).toBeDefined();

      // Verificamos que utiliza %AS%
      expect(llamadaBusqueda?.[1]).toEqual({
        busqueda: '%AS%',
      });

      // Verificamos que devuelve ambos productos
      expect(resultado.data).toHaveLength(2);

      expect(
        resultado.data[0].denominacion,
      ).toBe('MEDIALUNAS HARINA 200G');

      expect(
        resultado.data[1].denominacion,
      ).toBe('SPRITE GASEOSAS 500ML');

      expect(resultado.total).toBe(2);

      // Verificamos que ambos productos forman
      // parte del resultado
      expect(
        resultado.data.some(
          (producto) =>
            producto.denominacion ===
            'MEDIALUNAS HARINA 200G',
        ),
      ).toBe(true);

      expect(
        resultado.data.some(
          (producto) =>
            producto.denominacion ===
            'SPRITE GASEOSAS 500ML',
        ),
      ).toBe(true);
    },
  );


  it(
    'CP-004-07 - debe restablecer el listado completo al borrar la búsqueda',
    async () => {
      // ==========================================
      // ARRANGE
      // ==========================================

      const producto1 = {
        id: 1,
        denominacion: 'MAGDALENA HARINA 500G',
      } as Producto;

      const producto2 = {
        id: 2,
        denominacion: 'MEDIALUNAS HARINA 200G',
      } as Producto;

      const producto3 = {
        id: 3,
        denominacion: 'SPRITE GASEOSAS 500ML',
      } as Producto;

      /*
       * Simulamos el listado completo cuando
       * la búsqueda está vacía.
       */
      queryBuilder.getManyAndCount.mockImplementation(
        async (): Promise<[Producto[], number]> => {
          return [
            [
              producto1,
              producto2,
              producto3,
            ],
            3,
          ];
        },
      );

      // ==========================================
      // ACT
      // ==========================================

      /*
       * El usuario borra la búsqueda.
       *
       * Se envía una cadena vacía.
       */
      const resultado =
        await adapter.findByBusquedaParcial(
          '',
          0,
          10,
        );

      // ==========================================
      // ASSERT
      // ==========================================

      /*
       * Verificamos que se obtiene nuevamente
       * el listado completo.
       */
      expect(resultado).toEqual({
        data: [
          producto1,
          producto2,
          producto3,
        ],
        total: 3,
      });

      expect(resultado.data).toHaveLength(3);
      expect(resultado.total).toBe(3);

      // Verificamos que no se perdió ningún producto
      expect(
        resultado.data.some(
          (producto) =>
            producto.denominacion ===
            'MAGDALENA HARINA 500G',
        ),
      ).toBe(true);

      expect(
        resultado.data.some(
          (producto) =>
            producto.denominacion ===
            'MEDIALUNAS HARINA 200G',
        ),
      ).toBe(true);

      expect(
        resultado.data.some(
          (producto) =>
            producto.denominacion ===
            'SPRITE GASEOSAS 500ML',
        ),
      ).toBe(true);
    },
  );

  it(
    'CP-004-08 - debe informar que no se encontraron productos cuando no existe coincidencia',
    async () => {
      // ==========================================
      // ARRANGE
      // ==========================================

      /*
       * Simulamos que la consulta no encuentra
       * ningún producto.
       */
      queryBuilder.getManyAndCount.mockImplementation(
        async (): Promise<[Producto[], number]> => {
          return [[], 0];
        },
      );

      // ==========================================
      // ACT
      // ==========================================

      const resultado =
        await adapter.findByBusquedaParcial(
          'XYZ',
          0,
          10,
        );

      // ==========================================
      // ASSERT
      // ==========================================

      // Verificamos que la búsqueda se realizó
      expect(
        repository.createQueryBuilder,
      ).toHaveBeenCalledWith('producto');

      expect(
        queryBuilder.getManyAndCount,
      ).toHaveBeenCalled();

      // Verificamos que no hubo resultados
      expect(resultado.data).toEqual([]);
      expect(resultado.data).toHaveLength(0);

      // Verificamos que el total es cero
      expect(resultado.total).toBe(0);

      // Verificamos que se utilizó %XYZ%
      const llamadasAndWhere =
        queryBuilder.andWhere.mock.calls;

      const llamadaBusqueda =
        llamadasAndWhere.find(
          (llamada: unknown[]) =>
            typeof llamada[0] === 'string' &&
            llamada[0].includes(
              'producto.denominacion LIKE :busqueda',
            ),
        );

      expect(llamadaBusqueda).toBeDefined();

      expect(llamadaBusqueda?.[1]).toEqual({
        busqueda: '%XYZ%',
      });
    },
  );




});