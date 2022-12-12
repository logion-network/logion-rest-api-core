import { DataSource, DataSourceOptions } from "typeorm";
import { addTransactionalDataSource, deleteDataSourceByName, initializeTransactionalContext, IsolationLevel, Transactional } from 'typeorm-transactional';
import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";

import { LogionNamingStrategy } from "./LogionNamingStrategy.js";
import { SessionAggregateRoot } from "./SessionEntity.js";
import { WrapInTransactionOptions } from "typeorm-transactional/dist/transactions/wrap-in-transaction.js";

dotenv.config();

const CONFIG_FILE = "ormconfig.json";

export let appDataSource = buildDefaultDataSource();

function buildDefaultDataSource(): DataSource {
    const options = buildDefaultDataSourceOptions();
    const dataSource = new DataSource(options);
    initializeTransactionalContext();
    addTransactionalDataSource(dataSource);
    return dataSource;
}

function buildDefaultDataSourceOptions(): DataSourceOptions {
    const fileConfig = getFileConfig();
    const envConfig = getEnvConfig();
    const config = {
        ...fileConfig,
        ...envConfig,
        namingStrategy: new LogionNamingStrategy(),
    };
    if(!config.type) {
        config.type = "postgres";
    }
    if(!config.entities) {
        config.entities = [];
    }
    config.entities.push(SessionAggregateRoot);
    return config;
}

function getFileConfig(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    if(existsSync(CONFIG_FILE)) {
        const content = readFileSync(CONFIG_FILE);
        return JSON.parse(content.toString("utf-8"));
    } else {
        return {};
    }
}

function getEnvConfig(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    const options: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    setFromEnvIfDefined(options, "TYPEORM_CONNECTION", "type");
    setFromEnvIfDefined(options, "TYPEORM_HOST", "host");
    setFromEnvIfDefined(options, "TYPEORM_PORT", "port");
    setFromEnvIfDefined(options, "TYPEORM_USERNAME", "username");
    setFromEnvIfDefined(options, "TYPEORM_PASSWORD", "password");
    setFromEnvIfDefined(options, "TYPEORM_DATABASE", "database");
    setFromEnvIfDefined(options, "TYPEORM_SYNCHRONIZE", "synchronize");
    setFromEnvIfDefined(options, "TYPEORM_ENTITIES", "entities", value => [ value ]);
    setFromEnvIfDefined(options, "TYPEORM_MIGRATIONS", "migrations", value => [ value ]);
    setFromEnvIfDefined(options, "TYPEORM_LOGGING", "logging");
    return options;
}

function setFromEnvIfDefined(options: any, envName: string, optionName: string, transform?: (value: string) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const envValue = process.env[envName];
    if(envValue) {
        options[optionName] = transform !== undefined ? transform(envValue) : envValue;
    }
}

export function overrideDataSource(dataSource: DataSource) {
    deleteDataSourceByName("default");
    appDataSource = dataSource;
    addTransactionalDataSource(dataSource);
}

export const DefaultTransactional = (options?: WrapInTransactionOptions): MethodDecorator => {
    return Transactional({
        isolationLevel: IsolationLevel.SERIALIZABLE,
        ...options,
    });
};
