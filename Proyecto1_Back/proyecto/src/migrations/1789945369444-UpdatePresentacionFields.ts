import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePresentacionFields1789945369444 implements MigrationInterface {
    name = 'UpdatePresentacionFields1789945369444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_31b8eec7944cb36eada20ed406\` ON \`presentacion-producto\``);
        await queryRunner.query(`DROP INDEX \`IDX_fadfc6ea511ea48fb54394f2aa\` ON \`presentacion-producto\``);
        await queryRunner.query(`CREATE TABLE \`historial-precio\` (\`id\` int NOT NULL AUTO_INCREMENT, \`precioAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`precioNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`fecha\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`motivo\` text NOT NULL, \`productoId\` int NULL, \`usuarioId\` int NULL, \`producto_id\` int NULL, INDEX \`IDX_cd2bd72fab25fb9ffc22c9fc7c\` (\`producto_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`cantidad\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`unidad\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`denominacion\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`observacion\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`deletedAt\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`usuarioCreatedId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`usuarioDeletedId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`usuarioUpdatedId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`sistema\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`historial-precio\` ADD CONSTRAINT \`FK_cd2bd72fab25fb9ffc22c9fc7c4\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`historial-precio\` DROP FOREIGN KEY \`FK_cd2bd72fab25fb9ffc22c9fc7c4\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`sistema\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`usuarioUpdatedId\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`usuarioDeletedId\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`usuarioCreatedId\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`deletedAt\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`observacion\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` DROP COLUMN \`denominacion\``);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`unidad\` enum ('GRAMOS', 'KILOGRAMOS', 'MILILITROS', 'LITROS', 'UNIDADES') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion-producto\` ADD \`cantidad\` int NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_cd2bd72fab25fb9ffc22c9fc7c\` ON \`historial-precio\``);
        await queryRunner.query(`DROP TABLE \`historial-precio\``);
        await queryRunner.query(`CREATE INDEX \`IDX_fadfc6ea511ea48fb54394f2aa\` ON \`presentacion-producto\` (\`unidad\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_31b8eec7944cb36eada20ed406\` ON \`presentacion-producto\` (\`cantidad\`, \`unidad\`)`);
    }

}
