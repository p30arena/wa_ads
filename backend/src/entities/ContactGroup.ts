import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("contacts_groups")
export class ContactGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true, name: "group_id" })
  groupId!: string;

  @Column()
  type!: "contact" | "group";

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
