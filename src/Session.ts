import { Entity, Column, PrimaryColumn, Repository } from "typeorm";
import { injectable } from "inversify";

import { appDataSource } from "./DataSourceProvider";
import { DateTime } from "luxon";
import { requireDefined } from "./Assertions";

@Entity("session")
export class SessionAggregateRoot {

    @PrimaryColumn({ length: 255, name: "user_address" })
    userAddress?: string;

    @Column({ name: "session_id", type: "uuid" })
    sessionId?: string;

    @Column("timestamp without time zone", { name: "created_on", nullable: true })
    createdOn?: Date;
}

@injectable()
export class SessionRepository {

    constructor() {
        this.repository = appDataSource.getRepository(SessionAggregateRoot);
    }

    readonly repository: Repository<SessionAggregateRoot>;

    async save(session: SessionAggregateRoot): Promise<void> {
        await this.repository.save(session);
    }

    async find(userAddress: string, sessionId: string): Promise<SessionAggregateRoot | null> {
        const builder = this.repository.createQueryBuilder("session");
        builder
            .where("session.user_address = :userAddress", { userAddress: userAddress })
            .andWhere("session.session_id = :sessionId", { sessionId: sessionId })
        return await builder.getOne();
    }

    async delete(session: SessionAggregateRoot): Promise<void> {
        await this.repository.delete(requireDefined(session.userAddress));
    }
}

export interface NewSessionParameters {
    userAddress: string,
    sessionId: string,
    createdOn: DateTime,
}

@injectable()
export class SessionFactory {

    newSession(params: NewSessionParameters): SessionAggregateRoot {
        const root = new SessionAggregateRoot();
        root.userAddress = params.userAddress;
        root.sessionId = params.sessionId;
        root.createdOn = params.createdOn.toJSDate();
        return root;
    }
}
