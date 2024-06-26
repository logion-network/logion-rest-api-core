import 'reflect-metadata';
import fs from 'fs';
import { QueryRunner, DataSource } from "typeorm";

import { overrideDataSource } from './DataSourceProvider.js';
import { requireDefined } from './Assertions.js';

export async function connect(
    entities: (Function | string)[], // eslint-disable-line @typescript-eslint/ban-types
    migrations?: (Function | string)[], // eslint-disable-line @typescript-eslint/ban-types
    synchronize = true): Promise<void>
{
    if(dataSource != null) {
        throw new Error("Connection already created");
    }
    dataSource = new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "secret",
        database: "postgres",
        synchronize,
        entities,
        migrations
    });
    overrideDataSource(dataSource);
    await dataSource.initialize();
}

let dataSource: DataSource | null = null;

export async function disconnect(): Promise<void> {
    if(dataSource == null) {
        throw new Error("No connection to close");
    }
    await dataSource.dropDatabase();
    await dataSource.destroy();
    dataSource = null;
}

export type RawData = any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function query(sql: string): Promise<RawData> {
    return requireDefined(dataSource).query(sql);
}

export async function executeScript(fileName: string): Promise<void> {
    const fileContent = await fs.promises.readFile(fileName);
    await query(fileContent.toString("utf-8"));
}

export async function checkNumOfRows(sql: string, numOfRows: number) {
    const rawData: RawData = await query(sql)
    expect(rawData).toBeDefined()
    expect(requireDefined(rawData).length).toBe(numOfRows)
}

export function queryRunner(): QueryRunner {
    return requireDefined(dataSource).createQueryRunner();
}

export async function runAllMigrations() {
    await requireDefined(dataSource).runMigrations();
}

export async function revertAllMigrations() {
    const definedDataSource = requireDefined(dataSource);
    for(let i = 0; i < definedDataSource.migrations.length; ++i) {
        await definedDataSource.undoLastMigration();
    }
}
