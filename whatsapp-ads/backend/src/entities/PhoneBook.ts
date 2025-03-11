import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("phone_book")
export class PhoneBook {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column({ name: "group_name", nullable: true })
  groupName!: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
