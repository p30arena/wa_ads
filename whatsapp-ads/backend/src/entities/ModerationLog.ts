import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

// Define the action type for better type safety
export type ModerationAction = "approved" | "rejected" | "modified";

@Entity("moderation_logs")
export class ModerationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("AdJob", "moderationLogs", { lazy: true })
  adJob!: Promise<any>;

  @Column()
  jobId!: number;

  @Column()
  moderator!: string;

  @Column({
    type: "text",
    enum: ["approved", "rejected", "modified"]
  })
  action!: ModerationAction;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
