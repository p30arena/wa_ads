import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column({ type: "text", nullable: true })
  session!: string;

  @OneToMany("AdJob", "user", { lazy: true })
  adJobs!: Promise<any>[];
}
