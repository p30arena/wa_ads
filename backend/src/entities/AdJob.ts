import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";

// Define the status type for better type safety
export type AdJobStatus = "pending" | "approved" | "rejected" | "running" | "completed" | "failed" | "stopped";

@Entity("ad_jobs")
export class AdJob {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("User", "adJobs", { lazy: true })
  user!: Promise<any>;

  @Column()
  userId!: number;

  @ManyToOne("MessageTemplate", "adJobs", { lazy: true })
  messageTemplate!: Promise<any>;

  @Column()
  templateId!: number;

  @Column({
    type: "text",
    enum: ["pending", "approved", "rejected", "running", "completed", "failed"]
  })
  status!: AdJobStatus;

  @Column({ type: "text" })
  audience!: string; // JSON string of selected contacts/groups

  @Column({ type: "integer", default: 0 })
  messagesSent!: number;

  @Column({ type: "integer", default: 0 })
  messagesDelivered!: number;

  @Column({ type: "text", nullable: true })
  schedule!: string; // JSON string of schedule settings

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;

  @OneToMany("ModerationLog", "adJob", { lazy: true })
  moderationLogs!: Promise<any>[];
}
