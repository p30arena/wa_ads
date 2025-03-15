import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("audience_groups")
export class AudienceGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column("simple-array")
  contacts!: string[];

  @Column("simple-array")
  groups!: string[];

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
