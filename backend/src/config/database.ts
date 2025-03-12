import { DataSource } from "typeorm";
import path from "path";
import { User } from "../entities/User";
import { ContactGroup } from "../entities/ContactGroup";
import { PhoneBook } from "../entities/PhoneBook";
import { MessageTemplate } from "../entities/MessageTemplate";
import { AdJob } from "../entities/AdJob";
import { ModerationLog } from "../entities/ModerationLog";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.join(__dirname, "../../data/whatsapp-ads.sqlite"),
  entities: [User, ContactGroup, PhoneBook, MessageTemplate, AdJob, ModerationLog],
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === "development",
});
