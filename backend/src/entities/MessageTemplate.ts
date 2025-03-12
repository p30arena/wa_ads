import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

@Entity("message_templates")
export class MessageTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "simple-array" })
  messages!: string[];

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;

  @OneToMany("AdJob", "messageTemplate", { lazy: true })
  adJobs!: Promise<any>[];
}
